import { supabase } from '../lib/supabase';
import type { 
  PayrollFile, 
  CreatePayrollFileData, 
  UpdatePayrollFileData, 
  PayrollStats,
  PayrollUploadData,
  // Enhanced types
  PayrollProcessing,
  CreatePayrollProcessingData,
  UpdatePayrollProcessingData,
  ProcessingLog,
  RubricPattern,
  ExtractedRubric,
  BatchUploadData,
  BatchUploadResult,
  FileValidationResult,
  ProcessingStatus,
  EnhancedPayrollStats,
  ProcessingHistory,
  WebhookPayload,
  WebhookResponse,
  WebhookStatusUpdate,
  ProcessingFilters,
  ProcessingSort,
  PaginatedResult,
  PayrollError,
  CompanyOption
} from '../../shared/types/payroll';

export class PayrollService {
  // =====================================================
  // EXISTING METHODS (LEGACY SUPPORT)
  // =====================================================

  /**
   * Busca todos os arquivos de holerite de uma empresa
   */
  static async getByCompanyId(companyId: string): Promise<PayrollFile[]> {
    const { data, error } = await supabase
      .from('payroll_files')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar arquivos de holerite: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Busca um arquivo de holerite por ID
   */
  static async getById(id: string): Promise<PayrollFile | null> {
    const { data, error } = await supabase
      .from('payroll_files')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Arquivo não encontrado
      }
      throw new Error(`Erro ao buscar arquivo de holerite: ${error.message}`);
    }

    return data;
  }

  /**
   * Cria um novo registro de arquivo de holerite
   */
  static async create(payrollData: CreatePayrollFileData): Promise<PayrollFile> {
    // Validar competência
    if (!this.validateCompetencia(payrollData.competencia)) {
      throw new Error('Competência inválida. Use o formato MM/AAAA');
    }

    // Obter usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('payroll_files')
      .insert({
        ...payrollData,
        uploaded_by: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar registro de holerite: ${error.message}`);
    }

    return data;
  }

  /**
   * Atualiza um arquivo de holerite
   */
  static async update(id: string, payrollData: UpdatePayrollFileData): Promise<PayrollFile> {
    const { data, error } = await supabase
      .from('payroll_files')
      .update(payrollData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar arquivo de holerite: ${error.message}`);
    }

    return data;
  }

  /**
   * Deleta um arquivo de holerite
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('payroll_files')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar arquivo de holerite: ${error.message}`);
    }
  }

  /**
   * Obtém estatísticas de holerites de uma empresa
   */
  static async getStats(companyId: string): Promise<PayrollStats> {
    const { data, error } = await supabase
      .rpc('get_payroll_stats', { company_uuid: companyId });

    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {
        total_files: 0,
        files_this_week: 0,
        files_this_month: 0
      };
    }

    const stats = data?.[0] || {
      total_files: 0,
      files_this_week: 0,
      files_this_month: 0
    };

    return stats;
  }

  // =====================================================
  // ENHANCED PROCESSING METHODS
  // =====================================================

  /**
   * Processa upload em lote de arquivos PDF
   */
  static async batchUpload(uploadData: BatchUploadData): Promise<BatchUploadResult> {
    try {
      // Validar competência
      if (!this.validateCompetencia(uploadData.competencia)) {
        throw new Error('Competência inválida. Use o formato MM/AAAA');
      }

      // Validar arquivos
      const validationResults = await Promise.all(
        uploadData.files.map(file => this.validateFile(file))
      );

      const validFiles = validationResults.filter(result => result.isValid);
      const invalidFiles = validationResults.filter(result => !result.isValid);

      if (validFiles.length === 0) {
        throw new Error('Nenhum arquivo válido encontrado');
      }

      // Converter arquivos válidos para Base64 e criar registros temporários
      const processPromises = validFiles.map(async (validation) => {
        try {
          // Converter arquivo para Base64
          const base64Data = await this.fileToBase64(validation.file);
          
          // Criar registro temporário no banco de dados (sem s3_url)
          const payrollFile = await this.create({
            company_id: uploadData.company_id,
            filename: validation.file.name,
            original_filename: validation.file.name,
            file_size: validation.file.size,
            competencia: uploadData.competencia,
            // s3_url será preenchido pelo webhook de retorno do n8n
          });

          return {
            payrollFile,
            base64Data,
            originalFile: validation.file
          };
        } catch (error) {
          throw new Error(`Erro no processamento de ${validation.file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      });

      const processResults = await Promise.allSettled(processPromises);
      
      const processedFiles: { payrollFile: PayrollFile; base64Data: string; originalFile: File }[] = [];
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

      // Adicionar arquivos inválidos aos falhas
      invalidFiles.forEach(validation => {
        failedFiles.push({
          file: validation.file,
          error: validation.errors.join(', ')
        });
      });

      // Criar processamento e enviar diretamente para webhook se houver arquivos válidos
      let processingId = '';
      if (processedFiles.length > 0) {
        const fileIds = processedFiles.map(item => item.payrollFile.id);
        
        // Criar registro de processamento
        processingId = await this.startProcessing({
          company_id: uploadData.company_id,
          competency: uploadData.competencia,
          file_ids: fileIds
        }, false); // autoProcess = false para não chamar processWithEnhancedWebhook

        // Enviar diretamente para o webhook n8n
        await this.sendDirectToWebhook(processingId, processedFiles, uploadData);
      }

      return {
        processing_id: processingId,
        uploaded_files: processedFiles.map(item => item.payrollFile),
        failed_files: failedFiles,
        total_files: uploadData.files.length,
        successful_uploads: processedFiles.length,
        failed_uploads: failedFiles.length
      };

    } catch (error) {
      throw new Error(`Erro no upload em lote: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Envia arquivos diretamente para o webhook n8n sem usar Supabase Storage
   */
  private static async sendDirectToWebhook(
    processingId: string, 
    processedFiles: { payrollFile: PayrollFile; base64Data: string; originalFile: File }[],
    uploadData: BatchUploadData
  ): Promise<void> {
    try {
      // Preparar dados dos arquivos para o webhook
      const filesData = processedFiles.map(item => ({
        file_id: item.payrollFile.id,
        pdf_base64: item.base64Data,
        filename: item.originalFile.name
      }));

      const webhookPayload: WebhookPayload = {
        processing_id: processingId,
        files: filesData,
        competency: uploadData.competencia,
        company_id: uploadData.company_id,
        callback_url: `${window.location.origin}/api/webhook/payroll-status`
      };

      const webhookUrl = 'https://n8n-lab-n8n.bjivvx.easypanel.host/webhook/processar-folha-pagamento';
      
      // Log da requisição
      await this.addProcessingLog(processingId, 'INFO', 'Enviando arquivos para webhook n8n', {
        webhook_url: webhookUrl,
        files_count: processedFiles.length,
        payload_size: JSON.stringify(webhookPayload).length
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
        signal: AbortSignal.timeout(60000) // 60 segundos timeout
      });

      // Log da resposta HTTP
      await this.addProcessingLog(processingId, 'INFO', `Resposta do webhook recebida: ${response.status} ${response.statusText}`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição para webhook: ${response.status} ${response.statusText}`);
      }

      // Tentar obter o texto da resposta primeiro
      const responseText = await response.text();
      
      // Log do conteúdo da resposta
      await this.addProcessingLog(processingId, 'DEBUG', 'Conteúdo da resposta do webhook', {
        response_text: responseText,
        response_length: responseText.length
      });

      let result: WebhookResponse | null = null;

      // Tentar fazer parse do JSON apenas se houver conteúdo
      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText);
          await this.addProcessingLog(processingId, 'INFO', 'Resposta JSON parseada com sucesso', {
            parsed_response: result
          });
        } catch (jsonError) {
          // Se não conseguir fazer parse do JSON, log do erro mas continue
          await this.addProcessingLog(processingId, 'WARN', 'Resposta não é JSON válido, mas requisição foi bem-sucedida', {
            json_error: jsonError instanceof Error ? jsonError.message : 'Erro desconhecido',
            response_text: responseText
          });
        }
      } else {
        await this.addProcessingLog(processingId, 'INFO', 'Webhook retornou resposta vazia (sucesso)', {
          note: 'Resposta vazia é considerada sucesso para este webhook'
        });
      }

      // Atualizar processamento com resposta inicial
      await this.updateProcessing(processingId, {
        status: 'processing',
        progress: 10,
        webhook_response: result || { status: 'accepted', message: 'Webhook processou a requisição com sucesso' },
        estimated_time: result?.estimated_time
      });

      // Log de sucesso
      await this.addProcessingLog(processingId, 'INFO', `Arquivos enviados com sucesso para webhook n8n - ${processedFiles.length} arquivo(s)`, {
        webhook_response: result,
        files_count: processedFiles.length,
        success: true
      });

    } catch (error) {
      // Log detalhado do erro
      await this.addProcessingLog(processingId, 'ERROR', 'Erro detalhado ao enviar para webhook n8n', {
        error_name: error instanceof Error ? error.constructor.name : 'Unknown',
        error_message: error instanceof Error ? error.message : 'Erro desconhecido',
        error_stack: error instanceof Error ? error.stack : undefined,
        webhook_url: 'https://n8n-lab-n8n.bjivvx.easypanel.host/webhook/processar-folha-pagamento'
      });

      // Atualizar status para erro
      await this.updateProcessing(processingId, {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      throw error;
    }
  }

  /**
   * Inicia um novo processamento
   */
  static async startProcessing(data: CreatePayrollProcessingData, autoProcess: boolean = true): Promise<string> {
    try {
      const { data: result, error } = await supabase
        .rpc('start_payroll_processing', {
          p_file_ids: data.file_ids,
          p_company_id: data.company_id,
          p_competency: data.competency
        });

      if (error) {
        throw new Error(`Erro ao iniciar processamento: ${error.message}`);
      }

      const processingId = result;

      // Só chama processWithEnhancedWebhook se autoProcess for true
      // Para novos uploads via batchUpload, autoProcess será false pois já enviamos via sendDirectToWebhook
      if (autoProcess) {
        await this.processWithEnhancedWebhook(processingId);
      }

      return processingId;
    } catch (error) {
      throw new Error(`Erro ao iniciar processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Processa via webhook n8n com funcionalidades aprimoradas
   * NOTA: Este método agora é usado apenas para reprocessamento de arquivos que já foram processados
   * Para novos uploads, use o método batchUpload que envia diretamente para o webhook
   */
  static async processWithEnhancedWebhook(processingId: string): Promise<void> {
    try {
      // Buscar dados do processamento
      const processing = await this.getProcessingById(processingId);
      if (!processing) {
        throw new Error('Processamento não encontrado');
      }

      // Buscar arquivos relacionados
      const files = await this.getFilesByProcessingId(processingId);
      if (files.length === 0) {
        throw new Error('Nenhum arquivo encontrado para processamento');
      }

      // Log de aviso - este método agora é usado apenas para reprocessamento
      await this.addProcessingLog(processingId, 'INFO', 'Tentativa de reprocessamento via webhook (método legado)', {
        files_count: files.length,
        note: 'Novos uploads usam sendDirectToWebhook automaticamente'
      });

      // Verificar se os arquivos têm s3_url (arquivos antigos) ou se são novos
      const filesWithStorage = files.filter(file => file.s3_url);
      const filesWithoutStorage = files.filter(file => !file.s3_url);

      if (filesWithoutStorage.length > 0) {
        // Para arquivos novos sem s3_url, não podemos reprocessar pois não temos o arquivo original
        throw new Error(`${filesWithoutStorage.length} arquivo(s) não possuem URL de storage e não podem ser reprocessados. Estes arquivos foram enviados diretamente para o webhook n8n durante o upload.`);
      }

      if (filesWithStorage.length === 0) {
        throw new Error('Nenhum arquivo com storage encontrado para reprocessamento. Arquivos novos são processados automaticamente durante o upload.');
      }

      // Log de erro - Supabase Storage não está configurado
      await this.addProcessingLog(processingId, 'ERROR', 'Tentativa de reprocessamento falhou: Supabase Storage não configurado', {
        files_with_storage: filesWithStorage.length,
        error: 'Bucket payroll-files não existe no Supabase Storage'
      });

      throw new Error('Reprocessamento não disponível: Supabase Storage não está configurado. O sistema agora envia arquivos diretamente para o webhook n8n durante o upload.');

    } catch (error) {
      // Atualizar status para erro
      await this.updateProcessing(processingId, {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      // Log de erro
      await this.addProcessingLog(processingId, 'ERROR', 'Erro ao tentar reprocessar via webhook', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      throw error;
    }
  }

  /**
   * Busca processamento por ID
   */
  static async getProcessingById(id: string): Promise<PayrollProcessing | null> {
    const { data, error } = await supabase
      .from('payroll_processing')
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
  static async updateProcessing(id: string, data: UpdatePayrollProcessingData): Promise<PayrollProcessing> {
    const { data: result, error } = await supabase
      .from('payroll_processing')
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
  static async getFilesByProcessingId(processingId: string): Promise<PayrollFile[]> {
    // Primeiro buscar os IDs dos arquivos relacionados ao processamento
    const { data: fileIds, error: fileIdsError } = await supabase
      .from('payroll_files_processing')
      .select('payroll_file_id')
      .eq('processing_id', processingId);

    if (fileIdsError) {
      throw new Error(`Erro ao buscar IDs dos arquivos: ${fileIdsError.message}`);
    }

    if (!fileIds || fileIds.length === 0) {
      return [];
    }

    // Buscar os arquivos pelos IDs
    const ids = fileIds.map(item => item.payroll_file_id);
    const { data, error } = await supabase
      .from('payroll_files')
      .select('*')
      .in('id', ids);

    if (error) {
      throw new Error(`Erro ao buscar arquivos do processamento: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Adiciona log de processamento
   */
  static async addProcessingLog(
    processingId: string, 
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', 
    message: string, 
    metadata?: any
  ): Promise<void> {
    const { error } = await supabase
      .from('processing_logs')
      .insert({
        processing_id: processingId,
        log_level: level,
        message,
        metadata
      });

    if (error) {
      console.error('Erro ao adicionar log:', error);
    }
  }

  /**
   * Busca logs de processamento
   */
  static async getProcessingLogs(processingId: string): Promise<ProcessingLog[]> {
    const { data, error } = await supabase
      .from('processing_logs')
      .select('*')
      .eq('processing_id', processingId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar logs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Obtém status de processamento em tempo real
   */
  static async getProcessingStatus(processingId: string): Promise<ProcessingStatus | null> {
    const processing = await this.getProcessingById(processingId);
    if (!processing) return null;

    const files = await this.getFilesByProcessingId(processingId);
    const completedFiles = files.filter(f => f.status === 'completed').length;

    return {
      processing_id: processingId,
      status: processing.status,
      progress: processing.progress,
      current_step: this.getCurrentStep(processing.progress),
      estimated_time_remaining: this.calculateEstimatedTime(processing),
      files_processed: completedFiles,
      total_files: files.length,
      error_message: processing.error_message,
      last_updated: processing.updated_at
    };
  }

  /**
   * Obtém estatísticas aprimoradas
   */
  static async getEnhancedStats(companyId?: string): Promise<EnhancedPayrollStats> {
    const { data, error } = await supabase
      .rpc('get_processing_stats', { p_company_id: companyId });

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
      .from('payroll_processing')
      .select(`
        id,
        competency,
        status,
        progress,
        started_at,
        completed_at,
        result_file_url,
        companies!inner(name),
        payroll_files_processing!inner(count)
      `, { count: 'exact' });

    // Aplicar filtros
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters?.competency) {
      query = query.eq('competency', filters.competency);
    }

    if (filters?.company_id) {
      query = query.eq('company_id', filters.company_id);
    }

    if (filters?.date_range) {
      query = query
        .gte('started_at', filters.date_range.start)
        .lte('started_at', filters.date_range.end);
    }

    // Aplicar ordenação
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    } else {
      query = query.order('started_at', { ascending: false });
    }

    // Aplicar paginação
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar histórico: ${error.message}`);
    }

    const processedData: ProcessingHistory[] = (data || []).map(item => ({
      id: item.id,
      company_name: (item.companies as any)?.name || 'N/A',
      competency: item.competency,
      files_count: (item.payroll_files_processing as any)?.length || 0,
      status: item.status,
      progress: item.progress,
      started_at: item.started_at,
      completed_at: item.completed_at,
      processing_time: item.completed_at ? 
        Math.round((new Date(item.completed_at).getTime() - new Date(item.started_at).getTime()) / 60000) : 
        undefined,
      result_file_url: item.result_file_url,
      can_download: item.status === 'completed' && !!item.result_file_url
    }));

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
    // First try to get companies with is_active filter
    let { data, error } = await supabase
      .from('companies')
      .select('id, name, cnpj')
      .eq('is_active', true)
      .order('name');

    // If error mentions is_active column doesn't exist, fallback to getting all companies
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

  /**
   * Recebe atualização de status do webhook
   */
  static async receiveWebhookStatusUpdate(update: WebhookStatusUpdate): Promise<void> {
    try {
      // Atualizar processamento
      await this.updateProcessing(update.processing_id, {
        status: update.status,
        progress: update.progress,
        result_file_url: update.result_file_url,
        extracted_data: update.extracted_data,
        error_message: update.error_message,
        completed_at: update.status === 'completed' ? new Date().toISOString() : undefined
      });

      // Adicionar log
      await this.addProcessingLog(
        update.processing_id,
        update.status === 'error' ? 'ERROR' : 'INFO',
        `Status atualizado: ${update.status}`,
        {
          progress: update.progress,
          current_step: update.current_step,
          error: update.error_message
        }
      );

    } catch (error) {
      console.error('Erro ao receber atualização do webhook:', error);
      throw error;
    }
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

    // Validar tipo
    if (!file.type.includes('pdf')) {
      errors.push('Apenas arquivos PDF são permitidos');
    }

    // Validar tamanho
    if (file.size > 10 * 1024 * 1024) { // 10MB
      errors.push('Arquivo muito grande. Máximo 10MB');
    }

    if (file.size === 0) {
      errors.push('Arquivo vazio');
    }

    // Validar nome
    if (file.name.length > 255) {
      errors.push('Nome do arquivo muito longo');
    }

    // Verificar caracteres especiais no nome
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name.replace(/\.[^/.]+$/, ""))) {
      warnings.push('Nome do arquivo contém caracteres especiais');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      file
    };
  }

  /**
   * Calcula tempo estimado restante
   */
  private static calculateEstimatedTime(processing: PayrollProcessing): number | undefined {
    if (!processing.estimated_time || processing.progress === 0) {
      return undefined;
    }

    const remainingProgress = 100 - processing.progress;
    const timePerPercent = processing.estimated_time / 100;
    return Math.round(remainingProgress * timePerPercent);
  }

  /**
   * Obtém etapa atual baseada no progresso
   */
  private static getCurrentStep(progress: number): string {
    if (progress < 20) return 'Iniciando processamento';
    if (progress < 40) return 'Extraindo texto dos PDFs';
    if (progress < 60) return 'Processando com IA';
    if (progress < 80) return 'Organizando dados';
    if (progress < 100) return 'Gerando planilha';
    return 'Concluído';
  }

  // =====================================================
  // LEGACY METHODS (MAINTAINED FOR COMPATIBILITY)
  // =====================================================

  /**
   * Processa upload de arquivo PDF (método legado)
   */
  static async uploadPdf(uploadData: PayrollUploadData): Promise<PayrollFile> {
    try {
      // Usar novo método de batch upload para um arquivo
      const batchResult = await this.batchUpload({
        files: [uploadData.file],
        competencia: uploadData.competencia,
        company_id: uploadData.company_id
      });

      if (batchResult.failed_uploads > 0) {
        throw new Error(batchResult.failed_files[0].error);
      }

      return batchResult.uploaded_files[0];
    } catch (error) {
      throw new Error(`Erro no upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Processa arquivo via webhook n8n (método legado)
   */
  static async processWithWebhook(
    payrollFileId: string, 
    base64Data: string, 
    competencia: string
  ): Promise<void> {
    // Implementação legada mantida para compatibilidade
    try {
      await this.update(payrollFileId, { status: 'processing' });

      const webhookUrl = 'https://n8n-lab-n8n.bjivvx.easypanel.host/webhook/processar-folha-pagamento';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payroll_file_id: payrollFileId,
          pdf_base64: base64Data,
          competencia: competencia
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      await this.update(payrollFileId, {
        status: 'completed',
        extracted_data: result.data,
        excel_url: result.excel_url,
        processed_at: new Date().toISOString()
      });

    } catch (error) {
      await this.update(payrollFileId, {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      throw error;
    }
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
   * Gera URL de download para arquivo Excel
   */
  static getDownloadUrl(payrollFile: PayrollFile): string | null {
    return payrollFile.excel_url || null;
  }

  /**
   * Verifica se arquivo pode ser baixado
   */
  static canDownload(payrollFile: PayrollFile): boolean {
    return payrollFile.status === 'completed' && !!payrollFile.excel_url;
  }
}