import { supabase } from '../lib/supabase';
import { PayrollConfig } from '@/config/payrollConfig';
import {
  formatCompetenciaForStorage,
  formatCompetenciaDisplay,
  getHoleriteWebhookTimeoutMs,
  isDuplicateWebhookResponse,
  isHoleriteProcessingComplete,
  isValidCompetencia,
  MAX_HOLERITE_BATCH_FILES,
  resolveHoleriteDownloadFilename,
  resolveHoleriteDownloadUrl,
  isWebhookGatewayTimeoutStatus,
  isWebhookTransportError,
  sortItemsByCompetencia,
  validateBatchWebhookResponse,
  WEBHOOK_DEFERRED_MESSAGE,
} from '@/features/payroll/utils/holeriteWebhook';
import type { 
  PayrollFile, 
  CreatePayrollFileData, 
  UpdatePayrollFileData, 
  PayrollStats,
  PayrollUploadData,
  PayrollBatchUploadData,
  HoleriteWebhookBatchPayload,
  // Enhanced types
  PayrollProcessing,
  CreatePayrollProcessingData,
  UpdatePayrollProcessingData,
  ProcessingLog,
  RubricPattern,
  ExtractedRubric,
  BatchUploadResult,
  FileValidationResult,
  ProcessingStatus,
  EnhancedPayrollStats,
  ProcessingHistory,
  WebhookResponse,
  WebhookStatusUpdate,
  ProcessingFilters,
  ProcessingSort,
  PaginatedResult,
  PayrollError,
  CompanyOption
} from '../../shared/types/payroll';

type ProcessedPayrollFile = {
  payrollFile: PayrollFile;
  base64Data: string;
  originalFile: File;
  competencia: string;
};

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
   * Processa upload em lote de arquivos PDF (até 12, competência por arquivo)
   */
  static async batchUpload(uploadData: PayrollBatchUploadData): Promise<BatchUploadResult> {
    try {
      const items = uploadData.items || [];

      if (items.length === 0) {
        throw new Error('Nenhum arquivo selecionado para upload');
      }

      if (items.length > MAX_HOLERITE_BATCH_FILES) {
        throw new Error(`Máximo de ${MAX_HOLERITE_BATCH_FILES} arquivos por lote`);
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.file) {
          throw new Error(`Arquivo ${i + 1}: PDF obrigatório`);
        }
        if (!item.competencia?.trim()) {
          throw new Error(`Arquivo ${item.file.name}: competência obrigatória (MM/AAAA)`);
        }
        if (!isValidCompetencia(item.competencia) && !this.validateCompetencia(item.competencia)) {
          throw new Error(`Arquivo ${item.file.name}: competência inválida. Use MM/AAAA`);
        }
      }

      const validationResults = await Promise.all(
        items.map((item) => this.validateFile(item.file))
      );

      const validEntries = validationResults
        .map((result, index) => ({ result, item: items[index] }))
        .filter(({ result }) => result.isValid);

      const invalidFiles = validationResults.filter((result) => !result.isValid);

      if (validEntries.length === 0) {
        throw new Error('Nenhum arquivo válido encontrado');
      }

      const competencyForRpc = formatCompetenciaForStorage(
        validEntries.map((e) => e.item.competencia)
      );

      const processPromises = validEntries.map(async ({ result: validation, item }) => {
        try {
          const base64Data = await this.fileToBase64(validation.file);

          const payrollFile = await this.create({
            company_id: uploadData.company_id,
            filename: validation.file.name,
            original_filename: validation.file.name,
            file_size: validation.file.size,
            competencia: item.competencia,
          });

          return {
            payrollFile,
            base64Data,
            originalFile: validation.file,
            competencia: item.competencia,
          };
        } catch (error) {
          // Melhor tratamento de erro com informações específicas
          let errorMessage = 'Erro desconhecido';
          
          if (error instanceof Error) {
            if (error.message.includes('Failed to fetch')) {
              errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet e tente novamente.';
            } else if (error.message.includes('não está ativo')) {
              errorMessage = 'O workflow do n8n não está ativo. Entre em contato com o administrador do sistema.';
            } else if (error.message.includes('timeout')) {
              errorMessage = 'Timeout na conexão. O servidor pode estar sobrecarregado.';
            } else if (error.message.includes('CORS')) {
              errorMessage = 'Erro de CORS. Configuração de segurança bloqueou a requisição.';
            } else {
              errorMessage = error.message;
            }
          }
          
          throw new Error(`Erro no upload em lote: ${errorMessage}`);
        }
      });

      const processResults = await Promise.allSettled(processPromises);

      const processedFiles: ProcessedPayrollFile[] = [];
      const failedFiles: { file: File; error: string }[] = [];

      processResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          processedFiles.push(result.value);
        } else {
          failedFiles.push({
            file: validEntries[index].item.file,
            error: result.reason?.message || 'Erro desconhecido',
          });
        }
      });

      invalidFiles.forEach((validation) => {
        failedFiles.push({
          file: validation.file,
          error: validation.errors.join(', '),
        });
      });

      let processingId = '';
      let duplicate = false;

      if (processedFiles.length > 0) {
        const fileIds = processedFiles.map((item) => item.payrollFile.id);

        processingId = await this.startProcessing(
          {
            company_id: uploadData.company_id,
            competency: competencyForRpc,
            file_ids: fileIds,
          },
          false
        );

        try {
          await this.sendDirectToWebhook(
            processingId,
            processedFiles,
            uploadData.company_id
          );
        } catch (webhookError) {
          if (
            webhookError instanceof Error &&
            webhookError.message.includes('DUPLICATE_PROCESSING')
          ) {
            duplicate = true;
          } else {
            throw webhookError;
          }
        }
      }

      return {
        success: processedFiles.length > 0 && !duplicate,
        partial_success: processedFiles.length > 0 && failedFiles.length > 0,
        processing_id: processingId,
        duplicate,
        total_files: items.length,
        successful_files: processedFiles.length,
        failed_files: failedFiles.length,
        uploaded_files: processedFiles.map((item) => item.payrollFile),
        failed_uploads: failedFiles.map((failed) => ({
          filename: failed.file.name,
          error: failed.error,
        })),
      };
    } catch (error) {
      throw new Error(
        `Erro no upload em lote: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * N8N processa de forma síncrona; se o browser não receber a resposta HTTP,
   * o lote pode ainda concluir no servidor — mantém status "processing" para polling.
   */
  private static async markWebhookAwaitingResponse(
    processingId: string,
    filesCount: number,
    detail: string
  ): Promise<void> {
    await this.updateProcessing(processingId, {
      status: 'processing',
      progress: 50,
      error_message: null,
      webhook_response: {
        status: 'processing',
        message: WEBHOOK_DEFERRED_MESSAGE,
        detail,
      },
    });

    await this.addProcessingLog(processingId, 'WARN', WEBHOOK_DEFERRED_MESSAGE, {
      files_count: filesCount,
      detail,
    });
  }

  /**
   * Envia arquivos diretamente para o webhook n8n (contrato lote: arquivos[])
   */
  private static async sendDirectToWebhook(
    processingId: string,
    processedFiles: ProcessedPayrollFile[],
    companyId: string
  ): Promise<void> {
    const webhookUrl = PayrollConfig.getWebhookUrl();
    const filesOrdered = sortItemsByCompetencia(processedFiles);
    const sentCompetencias = filesOrdered.map((f) => f.competencia);

    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, cnpj')
        .eq('id', companyId)
        .single();

      if (companyError || !companyData) {
        throw new Error('Erro ao buscar dados da empresa');
      }

      const webhookPayload: HoleriteWebhookBatchPayload = {
        processing_id: processingId,
        company_id: companyData.id,
        company_name: companyData.name,
        company_cnpj: companyData.cnpj || '',
        arquivos: filesOrdered.map((item) => ({
          pdf_base64: item.base64Data,
          competencia: item.competencia,
          file_id: item.payrollFile.id,
          filename: item.originalFile.name,
        })),
      };

      const competencias = sentCompetencias;

      await this.addProcessingLog(processingId, 'INFO', 'Enviando lote para webhook n8n', {
        webhook_url: webhookUrl,
        files_count: filesOrdered.length,
        payload_size: JSON.stringify(webhookPayload).length,
        company_id: webhookPayload.company_id,
        company_name: webhookPayload.company_name,
        competencias,
      });

      await this.addProcessingLog(processingId, 'DEBUG', 'Detalhes dos arquivos no payload', {
        arquivos: webhookPayload.arquivos.map((file) => ({
          file_id: file.file_id,
          filename: file.filename,
          competencia: file.competencia,
          pdf_size_bytes: file.pdf_base64.length,
        })),
      });

      // Implementar retry logic para webhook.
      // O N8N responde 202 imediatamente (assíncrono); poucas tentativas bastam.
      const maxRetries = 2;
      let response: Response | null = null;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await this.addProcessingLog(processingId, 'INFO', `Tentativa ${attempt}/${maxRetries} de envio para webhook n8n`, {
            attempt,
            max_retries: maxRetries,
            webhook_url: webhookUrl
          });

          const controller = new AbortController();
          const timeoutMs = getHoleriteWebhookTimeoutMs(filesOrdered.length);
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'PayrollSystem/1.0',
            },
            body: JSON.stringify(webhookPayload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Se a resposta foi bem-sucedida, sair do loop
          if (response.ok) {
            break;
          }

          // Para erros 5xx, tentar novamente
          if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
            await this.addProcessingLog(processingId, 'WARN', `Erro ${response.status} no webhook, tentando novamente`, {
              status: response.status,
              statusText: response.statusText,
              attempt,
              next_attempt_in: `${2000 * attempt}ms`
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Backoff exponencial
            continue;
          }

          // Para outros erros, não tentar novamente
          break;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Erro desconhecido');
          
          await this.addProcessingLog(processingId, 'ERROR', `Erro na tentativa ${attempt}/${maxRetries} de webhook`, {
            error: lastError.message,
            attempt,
            error_type: lastError.constructor.name
          });

          // Para erros de rede/timeout, tentar novamente
          if (attempt < maxRetries && (
            lastError.message.includes('fetch') ||
            lastError.message.includes('timeout') ||
            lastError.message.includes('network') ||
            lastError.name === 'AbortError'
          )) {
            await this.addProcessingLog(processingId, 'INFO', `Aguardando antes da próxima tentativa`, {
              wait_time: `${2000 * attempt}ms`,
              next_attempt: attempt + 1
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }

          // Para outros erros ou última tentativa, sair do loop
          break;
        }
      }

      if (!response) {
        if (isWebhookTransportError(lastError)) {
          await this.markWebhookAwaitingResponse(
            processingId,
            filesOrdered.length,
            lastError?.message || 'timeout ou conexão interrompida aguardando resposta do N8N'
          );
          return;
        }
        throw lastError || new Error('Falha em todas as tentativas de conexão com webhook');
      }

      // Log da resposta HTTP
      await this.addProcessingLog(processingId, 'INFO', `Resposta do webhook recebida: ${response.status} ${response.statusText}`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        if (isWebhookGatewayTimeoutStatus(response.status)) {
          await this.markWebhookAwaitingResponse(
            processingId,
            filesOrdered.length,
            `HTTP ${response.status} ${response.statusText} — gateway/proxy; verifique execuções no N8N`
          );
          return;
        }

        let errorDetails = '';
        try {
          const errorResponse = await response.text();
          const errorData = JSON.parse(errorResponse);

          if (response.status === 404 && errorData.message?.includes('not registered')) {
            errorDetails = `Webhook n8n não está ativo ou configurado. ${errorData.hint || 'Verifique se o workflow está ativo no n8n.'}`;
          } else {
            errorDetails = errorData.message || `${response.status} ${response.statusText}`;
          }
        } catch {
          errorDetails = `${response.status} ${response.statusText}`;
        }

        throw new Error(`Erro na requisição para webhook n8n: ${errorDetails}`);
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

      if (result && isDuplicateWebhookResponse(result)) {
        const cached = (result.cached_response || result) as WebhookResponse;
        await this.addProcessingLog(processingId, 'WARN', 'Processamento duplicado detectado pelo webhook', {
          duplicate: true,
          status: result.status,
        });
        if (cached && isHoleriteProcessingComplete(cached)) {
          await this.applyWebhookResult(processingId, cached, filesOrdered.length, sentCompetencias);
        } else {
          throw new Error(
            'DUPLICATE_PROCESSING: Este processamento já está em andamento. Aguarde a conclusão antes de reenviar.'
          );
        }
        return;
      }

      if (result && isHoleriteProcessingComplete(result)) {
        await this.applyWebhookResult(processingId, result, filesOrdered.length, sentCompetencias);
      } else if (result?.success) {
        // 202 aceito: processamento iniciado no N8N. Progresso/conclusão chegam por callback + Realtime.
        await this.updateProcessing(processingId, {
          status: 'processing',
          progress: 10,
          webhook_response: result,
          estimated_time: result?.estimated_time,
        });
      } else {
        await this.updateProcessing(processingId, {
          status: 'processing',
          progress: 10,
          webhook_response: result || {
            status: 'accepted',
            message: 'Webhook processou a requisição com sucesso',
          },
          estimated_time: result?.estimated_time,
        });
      }

      await this.addProcessingLog(
        processingId,
        'INFO',
        `Lote enviado ao webhook n8n - ${filesOrdered.length} arquivo(s)`,
        {
          webhook_response: result,
          files_count: filesOrdered.length,
          download_available: !!(result && resolveHoleriteDownloadUrl(result)),
        }
      );

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Erro desconhecido');

      const isGatewayError =
        isWebhookTransportError(err) ||
        /502|503|504|524/.test(err.message) ||
        err.message.includes('Falha em todas as tentativas');

      if (isGatewayError) {
        await this.markWebhookAwaitingResponse(
          processingId,
          filesOrdered.length,
          err.message
        );
        return;
      }

      let errorType = 'UNKNOWN_ERROR';
      let userFriendlyMessage = err.message || 'Erro ao processar resposta do webhook n8n';

      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorType = 'NETWORK_ERROR';
        userFriendlyMessage =
          'Erro de conectividade com o webhook n8n. Verifique a rede e as execuções no N8N.';
      } else if (err.message.includes('not registered')) {
        errorType = 'WEBHOOK_NOT_ACTIVE';
        userFriendlyMessage =
          'O workflow do n8n não está ativo. Ative o workflow no N8N e tente novamente.';
      } else if (err.message.includes('CORS')) {
        errorType = 'CORS_ERROR';
        userFriendlyMessage = 'Erro de CORS ao ler a resposta do webhook n8n.';
      } else if (err.message.includes('DUPLICATE_PROCESSING')) {
        userFriendlyMessage = err.message.replace('DUPLICATE_PROCESSING: ', '');
      }

      await this.addProcessingLog(processingId, 'ERROR', `Erro ao enviar para webhook n8n - ${errorType}`, {
        error_message: err.message,
        error_type: errorType,
        webhook_url: PayrollConfig.getWebhookUrl(),
      });

      await this.updateProcessing(processingId, {
        status: 'error',
        error_message: userFriendlyMessage,
      });

      throw new Error(userFriendlyMessage);
    }
  }

  /**
   * Persiste resultado do webhook e dispara download automático do XLSX consolidado
   */
  private static async applyWebhookResult(
    processingId: string,
    result: WebhookResponse,
    filesCount: number,
    sentCompetencias: string[] = []
  ): Promise<void> {
    let resultToPersist = result;

    if (filesCount > 1 && sentCompetencias.length > 0) {
      const validation = validateBatchWebhookResponse(
        sentCompetencias,
        filesCount,
        result
      );

      if (!validation.ok) {
        await this.addProcessingLog(
          processingId,
          'WARN',
          'Validação do lote: metadados OK, mas revise o Excel consolidado',
          { batch_validation: validation }
        );
        resultToPersist = {
          ...result,
          batch_validation: validation,
        } as WebhookResponse;
      } else {
        await this.addProcessingLog(processingId, 'INFO', 'Lote validado na resposta do N8N', {
          batch_validation: validation,
        });
      }
    }

    const excelUrl = resolveHoleriteDownloadUrl(resultToPersist);
    const pdfUrl =
      result.data?.arquivo?.urls?.pdf ||
      (result.data as { arquivos?: { pdf?: { url?: string } } })?.arquivos?.pdf?.url ||
      null;

    if (!excelUrl) {
      await this.updateProcessing(processingId, {
        status: 'error',
        progress: 70,
        webhook_response: resultToPersist,
        error_message:
          'Processamento concluído, mas a URL do Excel não foi encontrada na resposta do webhook.',
      });
      return;
    }

    const filename = resolveHoleriteDownloadFilename(resultToPersist);

    try {
      await this.updateProcessing(processingId, {
        status: 'processing',
        progress: 85,
      });

      await this.addProcessingLog(processingId, 'INFO', 'Iniciando download automático do XLSX consolidado', {
        download_url: excelUrl,
        filename,
        files_count: filesCount,
      });

      await this.downloadFile(excelUrl, filename);

      const { error: rpcError } = await supabase.rpc('receive_processing_result', {
        p_processing_id: processingId,
        p_status: 'completed',
        p_progress: 100,
        p_result_file_url: excelUrl,
        p_extracted_data: resultToPersist.data || null,
        p_error_message: null,
        p_webhook_response: resultToPersist,
      });

      if (rpcError) {
        await this.updateProcessing(processingId, {
          status: 'completed',
          progress: 100,
          result_file_url: excelUrl,
          webhook_response: resultToPersist,
          completed_at: new Date().toISOString(),
        });
        await this.updateFilesStatusByProcessingId(processingId, 'completed');
      } else if (pdfUrl || excelUrl) {
        await this.updateFilesUrlsByProcessingId(processingId, pdfUrl, excelUrl);
      }
    } catch (downloadError) {
      await this.addProcessingLog(processingId, 'ERROR', 'Erro no download automático do XLSX', {
        error: downloadError instanceof Error ? downloadError.message : 'Erro desconhecido',
        download_url: excelUrl,
      });

      await this.updateProcessing(processingId, {
        status: 'processing',
        progress: 70,
        webhook_response: resultToPersist,
        result_file_url: excelUrl,
        error_message: `Processamento concluído, mas erro no download: ${
          downloadError instanceof Error ? downloadError.message : 'Erro desconhecido'
        }`,
      });
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
   * URL base do bucket S3 (AWS) onde o N8N armazena os holerites originais (PDF) e o Excel gerado.
   */
  static readonly HOLERITE_S3_BUCKET_URL = 'https://e7pdf-holerite.s3.sa-east-1.amazonaws.com';

  /**
   * Reconstrói a URL do PDF original armazenado no S3 a partir dos dados do arquivo.
   *
   * O workflow do N8N faz upload do PDF com uma chave determinística
   * (ver docs/lote-holerites/webhook-processador-holerites.json):
   *   e7-holerite/{slug(company_name)}/{ano}/{MM_AAAA}/{file_id}.pdf
   * onde slug = company_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().
   *
   * Mantém compatibilidade exata com a lógica do N8N para que a chave bata com o objeto salvo.
   */
  static buildHoleritePdfUrl(
    companyName: string | null | undefined,
    competencia: string | null | undefined,
    fileId: string | null | undefined
  ): string | null {
    if (!companyName || !competencia || !fileId) return null;

    const parts = competencia.split('/');
    if (parts.length !== 2) return null;

    const mes = parts[0].padStart(2, '0');
    const ano = parts[1];
    if (!ano) return null;

    const slug = companyName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const key = `e7-holerite/${slug}/${ano}/${mes}_${ano}/${fileId}.pdf`;

    return `${this.HOLERITE_S3_BUCKET_URL}/${key}`;
  }

  /**
   * Atualiza status dos arquivos relacionados a um processamento
   */
  static async updateFilesStatusByProcessingId(processingId: string, status: 'pending' | 'processing' | 'completed' | 'error'): Promise<void> {
    // Buscar IDs dos arquivos relacionados
    const { data: fileIds, error: fileIdsError } = await supabase
      .from('payroll_files_processing')
      .select('payroll_file_id')
      .eq('processing_id', processingId);

    if (fileIdsError) {
      throw new Error(`Erro ao buscar IDs dos arquivos: ${fileIdsError.message}`);
    }

    if (!fileIds || fileIds.length === 0) {
      return;
    }

    // Atualizar status dos arquivos
    const ids = fileIds.map(item => item.payroll_file_id);
    const { error: updateError } = await supabase
      .from('payroll_files')
      .update({ status })
      .in('id', ids);

    if (updateError) {
      throw new Error(`Erro ao atualizar status dos arquivos: ${updateError.message}`);
    }
  }

  /**
   * Atualiza URLs (s3_url e excel_url) dos arquivos relacionados a um processamento
   */
  static async updateFilesUrlsByProcessingId(
    processingId: string, 
    s3Url: string | null, 
    excelUrl: string | null
  ): Promise<void> {
    // Buscar IDs dos arquivos relacionados
    const { data: fileIds, error: fileIdsError } = await supabase
      .from('payroll_files_processing')
      .select('payroll_file_id')
      .eq('processing_id', processingId);

    if (fileIdsError) {
      throw new Error(`Erro ao buscar IDs dos arquivos: ${fileIdsError.message}`);
    }

    if (!fileIds || fileIds.length === 0) {
      return;
    }

    // Preparar dados de atualização
    const updateData: any = {};
    if (s3Url) {
      updateData.s3_url = s3Url;
    }
    if (excelUrl) {
      updateData.excel_url = excelUrl;
    }

    // Se não há nada para atualizar, retornar
    if (Object.keys(updateData).length === 0) {
      return;
    }

    // Atualizar URLs dos arquivos
    const ids = fileIds.map(item => item.payroll_file_id);
    const { error: updateError } = await supabase
      .from('payroll_files')
      .update(updateData)
      .in('id', ids);

    if (updateError) {
      throw new Error(`Erro ao atualizar URLs dos arquivos: ${updateError.message}`);
    }
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
      id: processingId,
      company_id: processing.company_id,
      company_name: undefined, // Será preenchido se necessário
      competency: processing.competency,
      status: processing.status,
      progress: processing.progress,
      files_count: files.length,
      current_step: this.getCurrentStep(processing.progress),
      estimated_completion_time: this.calculateEstimatedTime(processing)?.toString(),
      result_url: processing.result_file_url,
      error_message: processing.error_message,
      created_at: processing.created_at,
      started_at: processing.started_at,
      completed_at: processing.completed_at,
      statistics: {
        successful_files: completedFiles,
        failed_files: files.length - completedFiles,
        total_records: files.length
      }
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
      competency: formatCompetenciaDisplay(item.competency),
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
      // Se o status for 'completed' ou 'error', usar função RPC que atualiza tanto payroll_processing quanto payroll_files
      if (update.status === 'completed' || update.status === 'error') {
        const { error: rpcError } = await supabase.rpc('receive_processing_result', {
          p_processing_id: update.processing_id,
          p_status: update.status,
          p_progress: update.progress || (update.status === 'completed' ? 100 : null),
          p_result_file_url: update.result_file_url || null,
          p_extracted_data: update.extracted_data || null,
          p_error_message: update.error_message || null,
          p_webhook_response: null
        });

        if (rpcError) {
          console.error('Erro ao atualizar status via RPC:', rpcError);
          // Fallback: atualizar apenas payroll_processing
          await this.updateProcessing(update.processing_id, {
            status: update.status,
            progress: update.progress,
            result_file_url: update.result_file_url,
            extracted_data: update.extracted_data,
            error_message: update.error_message,
            completed_at: update.status === 'completed' ? new Date().toISOString() : undefined
          });
          
          // Atualizar arquivos manualmente como fallback
          await this.updateFilesStatusByProcessingId(update.processing_id, update.status);
        } else if (update.status === 'completed') {
          // Atualizar s3_url e excel_url nos arquivos relacionados quando completado
          // Extrair URLs do webhook_response se disponível
          // A estrutura pode ser: data.arquivos.pdf.url ou data.arquivo.urls.pdf_download
          const webhookResponse = update.extracted_data as WebhookResponse | undefined;
          const s3Url =
            webhookResponse?.data?.arquivo?.urls?.pdf ||
            (webhookResponse as { arquivos?: { pdf?: { url?: string } } })?.arquivos?.pdf?.url ||
            null;
          const excelUrl =
            update.result_file_url || resolveHoleriteDownloadUrl(webhookResponse) || null;
          
          if (s3Url || excelUrl) {
            await this.updateFilesUrlsByProcessingId(
              update.processing_id,
              s3Url,
              excelUrl
            );
          }
        }
      } else {
        // Para outros status, atualizar apenas payroll_processing
        await this.updateProcessing(update.processing_id, {
          status: update.status,
          progress: update.progress,
          result_file_url: update.result_file_url,
          extracted_data: update.extracted_data,
          error_message: update.error_message,
          completed_at: update.status === 'completed' ? new Date().toISOString() : undefined
        });
      }

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
      const batchResult = await this.batchUpload({
        company_id: uploadData.company_id,
        items: [{ file: uploadData.file, competencia: uploadData.competencia }],
      });

      if (batchResult.failed_uploads && batchResult.failed_uploads.length > 0) {
        throw new Error(batchResult.failed_uploads[0].error);
      }

      if (!batchResult.uploaded_files?.[0]) {
        throw new Error('Upload não retornou arquivo processado');
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

      const webhookUrl = PayrollConfig.getWebhookUrl();

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payroll_file_id: payrollFileId,
          pdf: base64Data,
          pdf_base64: base64Data,
          competencia,
          file_id: payrollFileId,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as WebhookResponse;
      const downloadUrl = resolveHoleriteDownloadUrl(result);

      if (isHoleriteProcessingComplete(result) && downloadUrl) {
        try {
          const filename = resolveHoleriteDownloadFilename(result);
          
          // Fazer download automático do arquivo XLSX
          await this.downloadFile(downloadUrl, filename);
          
          await this.update(payrollFileId, {
            status: 'completed',
            extracted_data: result.data,
            excel_url: downloadUrl,
            processed_at: new Date().toISOString(),
          });
        } catch (downloadError) {
          console.error('Erro no download automático:', downloadError);

          await this.update(payrollFileId, {
            status: 'completed',
            extracted_data: result.data,
            excel_url: downloadUrl,
            processed_at: new Date().toISOString(),
            error_message: `Processamento concluído, mas erro no download: ${
              downloadError instanceof Error ? downloadError.message : 'Erro desconhecido'
            }`,
          });
        }
      } else {
        await this.update(payrollFileId, {
          status: 'completed',
          extracted_data: result.data,
          excel_url: downloadUrl || result.excel_url,
          processed_at: new Date().toISOString(),
        });
      }

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

  // =====================================================
  // PROCESSING DETAILS METHODS
  // =====================================================
  
  /**
   * Obtém processamentos ativos
   */
  static async getCurrentProcessings(): Promise<PayrollProcessing[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_processing')
        .select(`
          *,
          company:companies(name, cnpj)
        `)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar processamentos ativos:', error);
      throw new Error('Erro ao buscar processamentos ativos');
    }
  }
  
  /**
   * Obtém detalhes de um processamento específico
   */
  static async getProcessingDetails(processingId: string): Promise<PayrollProcessing | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_processing')
        .select(`
          *,
          company:companies(name, cnpj),
          logs:processing_logs(*)
        `)
        .eq('id', processingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar detalhes do processamento:', error);
      throw new Error('Erro ao buscar detalhes do processamento');
    }
  }
  
  /**
   * Cancela um processamento
   */
  static async cancelProcessing(processingId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('payroll_processing')
        .update({
          status: 'error',
          error_message: 'Processamento cancelado pelo usuário',
          updated_at: new Date().toISOString()
        })
        .eq('id', processingId);

      if (error) throw error;

      // Adicionar log de cancelamento
      await this.addProcessingLog(processingId, 'INFO', 'Processamento cancelado pelo usuário');
    } catch (error) {
      console.error('Erro ao cancelar processamento:', error);
      throw new Error('Erro ao cancelar processamento');
    }
  }
  
  /**
   * Reprocessa um lote
   */
  static async reprocessBatch(processingId: string): Promise<void> {
    try {
      // Buscar dados do processamento original
      const processing = await this.getProcessingDetails(processingId);
      if (!processing) {
        throw new Error('Processamento não encontrado');
      }

      // Resetar status para reprocessamento
      const { error } = await supabase
        .from('payroll_processing')
        .update({
          status: 'pending',
          progress: 0,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', processingId);

      if (error) throw error;

      // Adicionar log de reprocessamento
      await this.addProcessingLog(processingId, 'INFO', 'Reprocessamento iniciado');

      // Chamar webhook para reprocessar
      await this.triggerWebhookProcessing(processingId);
    } catch (error) {
      console.error('Erro ao reprocessar lote:', error);
      throw new Error('Erro ao reprocessar lote');
    }
  }
  
  /**
   * Dispara processamento via webhook
   */
  private static async triggerWebhookProcessing(processingId: string): Promise<void> {
    try {
      const webhookUrl = 'https://n8n-lab-n8n.bjivvx.easypanel.host/webhook/processar-lote-folha';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          processing_id: processingId
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição webhook: ${response.status}`);
      }
    } catch (error) {
      console.error('Erro ao disparar webhook:', error);
      throw error;
    }
  }
  
  /**
   * Subscreve a atualizações de processamento em tempo real
   */
  static subscribeToProcessingUpdates(
    processingId: string,
    callback: (processing: PayrollProcessing) => void
  ): () => void {
    const subscription = supabase
      .channel(`processing_${processingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payroll_processing',
          filter: `id=eq.${processingId}`
        },
        async (payload) => {
          // Buscar dados completos do processamento
          const processing = await this.getProcessingDetails(processingId);
          if (processing) {
            callback(processing);
          }
        }
      )
      .subscribe();

    // Retornar função para cancelar subscrição
    return () => {
      supabase.removeChannel(subscription);
    };
  }

  /**
   * Subscreve a qualquer mudança em payroll_processing (para o painel de ativos).
   * Usa Realtime (websocket) — evita polling REST contínuo. O callback é chamado em
   * INSERT/UPDATE/DELETE; o consumidor decide refazer o fetch da lista de ativos.
   */
  static subscribeToActiveProcessings(callback: () => void): () => void {
    const subscription = supabase
      .channel('payroll_active_processings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payroll_processing',
        },
        () => callback()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }

  /**
   * Subscreve a novos logs de processamento
   */
  static subscribeToProcessingLogs(
    processingId: string,
    callback: (log: ProcessingLog) => void
  ): () => void {
    const subscription = supabase
      .channel(`logs_${processingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'processing_logs',
          filter: `processing_id=eq.${processingId}`
        },
        (payload) => {
          callback(payload.new as ProcessingLog);
        }
      )
      .subscribe();

    // Retornar função para cancelar subscrição
    return () => {
      supabase.removeChannel(subscription);
    };
  }

  /**
   * Função auxiliar para download automático de arquivos do S3
   */
  static async downloadFile(url: string, filename: string): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Tentativa ${attempt}/${maxRetries} de download:`, { url, filename });

        // Fazer fetch do arquivo com timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

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

        // Tratamento específico para diferentes códigos de erro
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
            case 502:
            case 503:
            case 504:
              errorMessage = 'Servidor temporariamente indisponível. Tentando novamente...';
              break;
            default:
              errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
          }

          // Para erros 5xx, tentar novamente
          if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
            console.warn(`${errorMessage} Tentativa ${attempt}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Backoff exponencial
            continue;
          }

          throw new Error(errorMessage);
        }

        // Verificar se o conteúdo é válido
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        
        console.log('Resposta do download:', {
          status: response.status,
          contentType,
          contentLength,
          headers: Object.fromEntries(response.headers.entries())
        });

        // Converter resposta para blob
        const blob = await response.blob();

        // Verificar se o blob tem conteúdo
        if (blob.size === 0) {
          throw new Error('Arquivo baixado está vazio');
        }

        // Criar URL temporária do blob
        const blobUrl = window.URL.createObjectURL(blob);

        // Criar elemento <a> temporário
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';

        // Adicionar ao DOM, clicar e remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Liberar memória
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 100);

        console.log('Download concluído com sucesso:', {
          filename,
          size: blob.size,
          type: blob.type
        });

        return; // Sucesso, sair do loop

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Erro desconhecido no download');
        
        console.error(`Erro na tentativa ${attempt}/${maxRetries}:`, {
          error: lastError.message,
          url,
          filename
        });

        // Se não é a última tentativa e o erro pode ser temporário, continuar
        if (attempt < maxRetries && (
          lastError.message.includes('fetch') ||
          lastError.message.includes('timeout') ||
          lastError.message.includes('network') ||
          lastError.message.includes('Servidor temporariamente')
        )) {
          console.log(`Aguardando ${1000 * attempt}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        // Para outros erros ou última tentativa, lançar o erro
        if (attempt === maxRetries) {
          break;
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    const finalError = new Error(
      `Falha no download após ${maxRetries} tentativas: ${lastError?.message || 'Erro desconhecido'}`
    );
    
    console.error('Download falhou definitivamente:', {
      url,
      filename,
      attempts: maxRetries,
      lastError: lastError?.message
    });

    throw finalError;
  }
}