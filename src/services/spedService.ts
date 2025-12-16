import { supabase } from '../lib/supabase';
import { SpedConfig } from '../config/spedConfig';
import type { 
  SpedFile, 
  CreateSpedFileData, 
  UpdateSpedFileData,
  SpedProcessing,
  CreateSpedProcessingData,
  UpdateSpedProcessingData,
  SpedUploadData,
  BatchSpedUploadResult,
  FileValidationResult,
  ProcessingStatus,
  EnhancedSpedStats,
  ProcessingHistory,
  WebhookPayload,
  WebhookResponse,
  WebhookStatusUpdate,
  ProcessingFilters,
  ProcessingSort,
  PaginatedResult,
  CompanyOption,
  SpedType
} from '../../shared/types/sped';

export class SpedService {
  // =====================================================
  // FILE METHODS
  // =====================================================

  /**
   * Busca todos os arquivos de SPED de uma empresa
   */
  static async getByCompanyId(companyId: string): Promise<SpedFile[]> {
    const { data, error } = await supabase
      .from('sped_files')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar arquivos de SPED: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Busca um arquivo de SPED por ID
   */
  static async getById(id: string): Promise<SpedFile | null> {
    const { data, error } = await supabase
      .from('sped_files')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar arquivo de SPED: ${error.message}`);
    }

    return data;
  }

  /**
   * Cria um novo registro de arquivo de SPED
   */
  static async create(spedData: CreateSpedFileData): Promise<SpedFile> {
    if (!this.validateCompetencia(spedData.competencia)) {
      throw new Error('Competência inválida. Use o formato MM/AAAA');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('sped_files')
      .insert({
        ...spedData,
        uploaded_by: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar registro de SPED: ${error.message}`);
    }

    return data;
  }

  /**
   * Atualiza um arquivo de SPED
   */
  static async update(id: string, spedData: UpdateSpedFileData): Promise<SpedFile> {
    const { data, error } = await supabase
      .from('sped_files')
      .update(spedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar arquivo de SPED: ${error.message}`);
    }

    return data;
  }

  /**
   * Deleta um arquivo de SPED
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sped_files')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar arquivo de SPED: ${error.message}`);
    }
  }

  // =====================================================
  // S3 UTILITY METHODS
  // =====================================================

  /**
   * Constrói o caminho esperado do arquivo Excel no S3
   * Baseado na estrutura: e7sped-processados/sped/CNPJ_EMPRESA/MM_AAAA/
   */
  static buildExpectedS3Path(
    cnpj: string, 
    competencia: string, 
    spedType: SpedType
  ): string {
    const cnpjClean = cnpj.replace(/[.\-\/]/g, '');
    const competenciaFormatted = competencia.replace('/', '_');
    const spedTypeFormatted = spedType.replace(/\s+/g, '_').toLowerCase();
    const timestamp = Date.now();
    
    return SpedConfig.buildS3Path(
      cnpjClean,
      competenciaFormatted,
      `sped_${spedTypeFormatted}_${competenciaFormatted}_${timestamp}.xlsx`
    );
  }

  /**
   * Constrói a URL completa do arquivo Excel no S3
   */
  static buildS3ExcelUrl(
    cnpj: string,
    competencia: string,
    spedType: SpedType,
    filename?: string
  ): string {
    const cnpjClean = cnpj.replace(/[.\-\/]/g, '');
    const competenciaFormatted = competencia.replace('/', '_');
    
    if (filename) {
      const s3Path = SpedConfig.buildS3Path(cnpjClean, competenciaFormatted, filename);
      return SpedConfig.buildS3Url(s3Path);
    }
    
    const s3Path = this.buildExpectedS3Path(cnpj, competencia, spedType);
    return SpedConfig.buildS3Url(s3Path);
  }

  // =====================================================
  // BATCH UPLOAD METHODS
  // =====================================================

  /**
   * Processa upload em lote de arquivos TXT
   */
  static async batchUpload(uploadData: SpedUploadData): Promise<BatchSpedUploadResult> {
    try {
      if (!this.validateCompetencia(uploadData.competencia)) {
        throw new Error('Competência inválida. Use o formato MM/AAAA');
      }

      const validationResults = await Promise.all(
        uploadData.files.map(file => this.validateFile(file))
      );

      const validFiles = validationResults.filter(result => result.isValid);
      const invalidFiles = validationResults.filter(result => !result.isValid);

      if (validFiles.length === 0) {
        throw new Error('Nenhum arquivo válido encontrado');
      }

      const processPromises = validFiles.map(async (validation) => {
        try {
          const base64Data = await this.fileToBase64(validation.file);
          
          const spedFile = await this.create({
            company_id: uploadData.company_id,
            sped_type: uploadData.sped_type,
            filename: validation.file.name,
            original_filename: validation.file.name,
            file_size: validation.file.size,
            competencia: uploadData.competencia,
          });

          return {
            spedFile,
            base64Data,
            originalFile: validation.file
          };
        } catch (error) {
          let errorMessage = 'Erro desconhecido';
          
          if (error instanceof Error) {
            if (error.message.includes('Failed to fetch')) {
              errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet e tente novamente.';
            } else if (error.message.includes('não está ativo')) {
              errorMessage = 'O workflow do n8n não está ativo. Entre em contato com o administrador do sistema.';
            } else if (error.message.includes('timeout')) {
              errorMessage = 'Timeout na conexão. O servidor pode estar sobrecarregado.';
            } else {
              errorMessage = error.message;
            }
          }
          
          throw new Error(`Erro no upload em lote: ${errorMessage}`);
        }
      });

      const processResults = await Promise.allSettled(processPromises);
      
      const processedFiles: { spedFile: SpedFile; base64Data: string; originalFile: File }[] = [];
      const failedFiles: { file: File; error: string }[] = [];

      processResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          processedFiles.push(result.value);
        } else {
          failedFiles.push({
            file: validFiles[index].file,
            error: result.reason.message
          });
        }
      });

      invalidFiles.forEach(validation => {
        failedFiles.push({
          file: validation.file,
          error: validation.errors.join(', ')
        });
      });

      let processingId = '';
      if (processedFiles.length > 0) {
        const fileIds = processedFiles.map(item => item.spedFile.id);
        
        processingId = await this.startProcessing({
          company_id: uploadData.company_id,
          sped_type: uploadData.sped_type,
          competency: uploadData.competencia,
          file_ids: fileIds
        }, false);

        await this.sendDirectToWebhook(processingId, processedFiles, uploadData);
      }

      return {
        success: processedFiles.length > 0,
        partial_success: processedFiles.length > 0 && failedFiles.length > 0,
        processing_id: processingId,
        total_files: uploadData.files.length,
        successful_files: processedFiles.length,
        failed_files: failedFiles.length,
        uploaded_files: processedFiles.map(item => item.spedFile),
        failed_uploads: failedFiles.map(failed => ({
          filename: failed.file.name,
          error: failed.error
        }))
      };

    } catch (error) {
      throw new Error(`Erro no upload em lote: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Mapeia o tipo de SPED do formato da aplicação para o formato esperado pelo n8n
   */
  private static mapSpedTypeToN8nFormat(spedType: SpedType): 'ICMS_IPI' | 'CONTRIBUICOES' {
    switch (spedType) {
      case 'SPED ICMS IPI':
        return 'ICMS_IPI';
      case 'SPED Contribuições':
        return 'CONTRIBUICOES';
      default:
        throw new Error(`Tipo de SPED não mapeado: ${spedType}`);
    }
  }

  /**
   * Envia arquivos diretamente para o webhook n8n
   */
  private static async sendDirectToWebhook(
    processingId: string, 
    processedFiles: { spedFile: SpedFile; base64Data: string; originalFile: File }[],
    uploadData: SpedUploadData
  ): Promise<void> {
    try {
      // Obter usuário autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar dados da empresa
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, cnpj, status, is_active, created_at, updated_at')
        .eq('id', uploadData.company_id)
        .single();

      if (companyError) {
        throw new Error('Erro ao buscar dados da empresa');
      }

      // Validar número de arquivos (máximo 12 conforme validação do n8n)
      if (processedFiles.length > 12) {
        throw new Error('Máximo de 12 arquivos por upload');
      }

      // Mapear tipo de SPED para formato esperado pelo n8n
      const tipoSpedN8n = this.mapSpedTypeToN8nFormat(uploadData.sped_type);

      // Preparar arquivos no formato esperado pelo n8n
      const arquivos = processedFiles.map(item => ({
        filename: item.originalFile.name,
        fileContent: item.base64Data, // Base64 do arquivo
        fileSize: item.originalFile.size
      }));

      // Formatar CNPJ para uso no S3 (sem formatação)
      const cnpjClean = companyData.cnpj.replace(/[.\-\/]/g, '');
      
      // Construir estrutura de diretórios S3
      const s3BasePath = SpedConfig.getS3BasePath();
      const competenciaFormatted = uploadData.competencia.replace('/', '_');
      const s3Directory = `${s3BasePath}${cnpjClean}/${competenciaFormatted}/`;

      // Construir caminho esperado do arquivo Excel no S3
      const expectedExcelPath = this.buildExpectedS3Path(
        companyData.cnpj,
        uploadData.competencia,
        uploadData.sped_type
      );

      // Construir payload no formato esperado pelo n8n
      const webhookPayload: WebhookPayload = {
        tipoSped: tipoSpedN8n,
        empresaId: uploadData.company_id,
        empresaNome: companyData.name,
        empresaCnpj: cnpjClean,
        competencia: uploadData.competencia,
        arquivos: arquivos,
        userId: user.id,
        timestamp: new Date().toISOString(),
        // Campos opcionais para compatibilidade e rastreamento
        processing_id: processingId,
        callback_url: `${window.location.origin}/api/webhook/sped-status`,
        metadata: {
          s3_bucket: SpedConfig.getS3Bucket(),
          s3_directory: s3Directory,
          s3_expected_excel_path: expectedExcelPath
        }
      };

      // URL do webhook n8n para SPEDs (configurada via variável de ambiente)
      const webhookUrl = SpedConfig.getWebhookUrl();
      
      const maxRetries = 3;
      let response: Response | null = null;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000);

          response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'SpedSystem/1.0'
            },
            body: JSON.stringify(webhookPayload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            break;
          }

          if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }

          break;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Erro desconhecido');
          
          if (attempt < maxRetries && (
            lastError.message.includes('fetch') ||
            lastError.message.includes('timeout') ||
            lastError.message.includes('network') ||
            lastError.name === 'AbortError'
          )) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }

          break;
        }
      }

      if (!response) {
        throw lastError || new Error('Falha em todas as tentativas de conexão com webhook');
      }

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorResponse = await response.text();
          const errorData = JSON.parse(errorResponse);
          errorDetails = errorData.message || `${response.status} ${response.statusText}`;
        } catch {
          errorDetails = `${response.status} ${response.statusText}`;
        }
        
        throw new Error(`Erro na requisição para webhook n8n: ${errorDetails}`);
      }

      const responseText = await response.text();
      let result: WebhookResponse | null = null;

      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch (jsonError) {
          // Resposta não é JSON válido, mas requisição foi bem-sucedida
          console.warn('Resposta do webhook não é JSON válido:', responseText);
        }
      }

      // Tentar obter URL do Excel de diferentes formatos de resposta do webhook
      // O n8n pode retornar em diferentes estruturas
      const excelUrl = result?.data?.arquivo?.urls?.excel_download || 
                       result?.data?.arquivos?.excel?.url || 
                       result?.data?.excel_url ||
                       result?.data?.excelDownloadUrl ||
                       result?.excelUrl ||
                       null;
      
      // Se o processamento foi aceito pelo n8n, atualizar status
      if (result && result.success) {
        // Se já temos URL do Excel, fazer download imediatamente
        if (excelUrl) {
          try {
            // Construir nome do arquivo com base na estrutura S3 ou usar o nome retornado
            const defaultFilename = result.data?.arquivo?.excel_filename || 
                                    result.data?.arquivos?.excel?.nome || 
                                    result.data?.excelFilename ||
                                    `sped_${tipoSpedN8n.toLowerCase()}_${uploadData.competencia.replace('/', '_')}_${Date.now()}.xlsx`;
            
            await this.updateProcessing(processingId, {
              status: 'processing',
              progress: 85
            });

            await this.downloadFile(excelUrl, defaultFilename);
            
            // Atualizar como concluído após download bem-sucedido
            const { error: rpcError } = await supabase.rpc('receive_sped_processing_result', {
              p_processing_id: processingId,
              p_status: 'completed',
              p_progress: 100,
              p_result_file_url: excelUrl,
              p_extracted_data: result.data || null,
              p_error_message: null,
              p_webhook_response: result
            });

            if (rpcError) {
              await this.updateProcessing(processingId, {
                status: 'completed',
                progress: 100,
                webhook_response: result,
                estimated_time: result?.estimated_time,
                completed_at: new Date().toISOString()
              });
            }
          } catch (downloadError) {
            await this.updateProcessing(processingId, {
              status: 'processing',
              progress: 70,
              webhook_response: result,
              estimated_time: result?.estimated_time,
              error_message: `Processamento concluído, mas erro no download: ${downloadError instanceof Error ? downloadError.message : 'Erro desconhecido'}`
            });
          }
        } else {
          // Processamento aceito mas Excel ainda não disponível (processamento assíncrono)
          await this.updateProcessing(processingId, {
            status: 'processing',
            progress: 30,
            webhook_response: result,
            estimated_time: result?.estimated_time
          });
        }
      } else if (result && !result.success) {
        // Processamento rejeitado pelo n8n
        await this.updateProcessing(processingId, {
          status: 'error',
          error_message: result.error || result.message || 'Processamento rejeitado pelo webhook n8n',
          webhook_response: result
        });
      } else {
        // Resposta não reconhecida, mas requisição foi bem-sucedida (assumir processamento iniciado)
        await this.updateProcessing(processingId, {
          status: 'processing',
          progress: 30,
          webhook_response: { status: 'accepted', message: 'Webhook processou a requisição com sucesso' }
        });
      }

    } catch (error) {
      await this.updateProcessing(processingId, {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      throw new Error(error instanceof Error ? error.message : 'Erro desconhecido ao conectar com o webhook n8n');
    }
  }

  // =====================================================
  // PROCESSING METHODS
  // =====================================================

  /**
   * Inicia um novo processamento
   */
  static async startProcessing(data: CreateSpedProcessingData, autoProcess: boolean = true): Promise<string> {
    try {
      const { data: result, error } = await supabase
        .rpc('start_sped_processing', {
          p_file_ids: data.file_ids,
          p_company_id: data.company_id,
          p_sped_type: data.sped_type,
          p_competency: data.competency
        });

      if (error) {
        throw new Error(`Erro ao iniciar processamento: ${error.message}`);
      }

      return result;
    } catch (error) {
      throw new Error(`Erro ao iniciar processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca processamento por ID
   */
  static async getProcessingById(id: string): Promise<SpedProcessing | null> {
    const { data, error } = await supabase
      .from('sped_processing')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar processamento: ${error.message}`);
    }

    return data;
  }

  /**
   * Atualiza processamento
   */
  static async updateProcessing(id: string, data: UpdateSpedProcessingData): Promise<SpedProcessing> {
    const { data: result, error } = await supabase
      .from('sped_processing')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar processamento: ${error.message}`);
    }

    return result;
  }

  /**
   * Busca arquivos por ID de processamento
   */
  static async getFilesByProcessingId(processingId: string): Promise<SpedFile[]> {
    const { data: fileIds, error: fileIdsError } = await supabase
      .from('sped_files_processing')
      .select('sped_file_id')
      .eq('processing_id', processingId);

    if (fileIdsError) {
      throw new Error(`Erro ao buscar IDs dos arquivos: ${fileIdsError.message}`);
    }

    if (!fileIds || fileIds.length === 0) {
      return [];
    }

    const ids = fileIds.map(item => item.sped_file_id);
    const { data, error } = await supabase
      .from('sped_files')
      .select('*')
      .in('id', ids);

    if (error) {
      throw new Error(`Erro ao buscar arquivos do processamento: ${error.message}`);
    }

    return data || [];
  }

  // =====================================================
  // STATS AND HISTORY METHODS
  // =====================================================

  /**
   * Obtém estatísticas aprimoradas
   */
  static async getEnhancedStats(companyId?: string): Promise<EnhancedSpedStats> {
    const { data, error } = await supabase
      .rpc('get_sped_processing_stats', { p_company_id: companyId });

    if (error) {
      console.error('Erro ao buscar estatísticas aprimoradas:', error);
      return {
        total_processings: 0,
        completed_this_month: 0,
        in_progress: 0,
        total_files_processed: 0
      };
    }

    const stats = data?.[0] || {
      total_processings: 0,
      completed_this_month: 0,
      in_progress: 0,
      total_files_processed: 0
    };

    return stats;
  }

  /**
   * Busca histórico de processamentos
   */
  static async getProcessingHistory(
    filters?: ProcessingFilters,
    sort?: ProcessingSort,
    page: number = 1,
    perPage: number = 10
  ): Promise<PaginatedResult<ProcessingHistory>> {
    let query = supabase
      .from('sped_processing')
      .select(`
        id,
        sped_type,
        competency,
        status,
        progress,
        started_at,
        completed_at,
        result_file_url,
        companies!inner(name)
      `, { count: 'exact' });

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters?.competency) {
      query = query.eq('competency', filters.competency);
    }

    if (filters?.company_id) {
      query = query.eq('company_id', filters.company_id);
    }

    if (filters?.sped_type) {
      query = query.eq('sped_type', filters.sped_type);
    }

    if (filters?.date_range) {
      query = query
        .gte('started_at', filters.date_range.start)
        .lte('started_at', filters.date_range.end);
    }

    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    } else {
      query = query.order('started_at', { ascending: false });
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar histórico: ${error.message}`);
    }

    // Buscar contagem de arquivos para cada processamento
    const processedData: ProcessingHistory[] = await Promise.all(
      (data || []).map(async (item) => {
        // Buscar contagem de arquivos relacionados
        const { count: filesCount } = await supabase
          .from('sped_files_processing')
          .select('*', { count: 'exact', head: true })
          .eq('processing_id', item.id);

        return {
          id: item.id,
          company_name: (item.companies as any)?.name || 'N/A',
          sped_type: item.sped_type,
          competency: item.competency,
          files_count: filesCount || 0,
          status: item.status,
          progress: item.progress,
          started_at: item.started_at,
          completed_at: item.completed_at,
          processing_time: item.completed_at ? 
            Math.round((new Date(item.completed_at).getTime() - new Date(item.started_at).getTime()) / 60000) : 
            undefined,
          result_file_url: item.result_file_url,
          can_download: item.status === 'completed' && !!item.result_file_url
        };
      })
    );

    return {
      data: processedData,
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage)
    };
  }

  /**
   * Busca empresas para seleção
   */
  static async getCompanies(): Promise<CompanyOption[]> {
    let { data, error } = await supabase
      .from('companies')
      .select('id, name, cnpj')
      .eq('is_active', true)
      .order('name');

    if (error && error.message.includes('column companies.is_active does not exist')) {
      const fallbackResult = await supabase
        .from('companies')
        .select('id, name, cnpj')
        .order('name');
      
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      throw new Error(`Erro ao buscar empresas: ${error.message}`);
    }

    return (data || []).map(company => ({
      id: company.id,
      name: company.name,
      cnpj: company.cnpj
    }));
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Valida arquivo individual
   */
  static async validateFile(file: File): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar tipo (TXT)
    if (!file.name.toLowerCase().endsWith('.txt')) {
      errors.push('Apenas arquivos TXT são permitidos');
    }

    // Validar tamanho (50MB para SPEDs)
    if (file.size > 50 * 1024 * 1024) {
      errors.push('Arquivo muito grande. Máximo 50MB');
    }

    if (file.size === 0) {
      errors.push('Arquivo vazio');
    }

    if (file.name.length > 255) {
      errors.push('Nome do arquivo muito longo');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      file
    };
  }

  /**
   * Converte arquivo para Base64
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Valida formato de competência (MM/AAAA)
   */
  static validateCompetencia(competencia: string): boolean {
    const regex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    if (!regex.test(competencia)) {
      return false;
    }

    const [month, year] = competencia.split('/');
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (monthNum < 1 || monthNum > 12) {
      return false;
    }

    const currentYear = new Date().getFullYear();
    if (yearNum > currentYear) {
      return false;
    }

    return true;
  }

  /**
   * Formata tamanho de arquivo para exibição
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Formata data para exibição
   */
  static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Função auxiliar para download automático de arquivos do S3
   */
  static async downloadFile(url: string, filename: string): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          signal: controller.signal,
          headers: {
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*',
            'Cache-Control': 'no-cache'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = `Erro ${response.status}`;
          
          switch (response.status) {
            case 403:
              errorMessage = 'Acesso negado ao arquivo. A URL pode ter expirado ou não ter permissões adequadas.';
              break;
            case 404:
              errorMessage = 'Arquivo não encontrado. A URL pode estar incorreta ou o arquivo foi removido.';
              break;
            case 500:
              errorMessage = 'Erro interno do servidor. Tente novamente em alguns minutos.';
              break;
            default:
              errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
          }

          if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }

          throw new Error(errorMessage);
        }

        const blob = await response.blob();

        if (blob.size === 0) {
          throw new Error('Arquivo baixado está vazio');
        }

        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 100);

        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Erro desconhecido no download');
        
        if (attempt < maxRetries && (
          lastError.message.includes('fetch') ||
          lastError.message.includes('timeout') ||
          lastError.message.includes('network')
        )) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        if (attempt === maxRetries) {
          break;
        }
      }
    }

    throw new Error(
      `Falha no download após ${maxRetries} tentativas: ${lastError?.message || 'Erro desconhecido'}`
    );
  }
}
