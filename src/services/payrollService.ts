import { supabase } from '../lib/supabase';
import type { 
  PayrollFile, 
  CreatePayrollFileData, 
  UpdatePayrollFileData, 
  PayrollStats,
  PayrollUploadData 
} from '../../shared/types/payroll';

export class PayrollService {
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

  /**
   * Processa upload de arquivo PDF
   */
  static async uploadPdf(uploadData: PayrollUploadData): Promise<PayrollFile> {
    try {
      // Validar arquivo
      if (!uploadData.file.type.includes('pdf')) {
        throw new Error('Apenas arquivos PDF são permitidos');
      }

      if (uploadData.file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('Arquivo muito grande. Máximo 10MB');
      }

      // Validar competência
      if (!this.validateCompetencia(uploadData.competencia)) {
        throw new Error('Competência inválida. Use o formato MM/AAAA');
      }

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const filename = `${timestamp}_${uploadData.file.name}`;

      // Converter arquivo para Base64
      const base64 = await this.fileToBase64(uploadData.file);

      // Criar registro no banco
      const payrollFile = await this.create({
        company_id: uploadData.company_id,
        filename,
        original_filename: uploadData.file.name,
        file_size: uploadData.file.size,
        competencia: uploadData.competencia
      });

      // Processar via webhook n8n
      await this.processWithWebhook(payrollFile.id, base64, uploadData.competencia);

      return payrollFile;
    } catch (error) {
      throw new Error(`Erro no upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Processa arquivo via webhook n8n
   */
  static async processWithWebhook(
    payrollFileId: string, 
    base64Data: string, 
    competencia: string
  ): Promise<void> {
    try {
      // Atualizar status para processing
      await this.update(payrollFileId, { 
        status: 'processing' 
      });

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
        signal: AbortSignal.timeout(60000) // 60 segundos timeout
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Atualizar com resultado do processamento
      await this.update(payrollFileId, {
        status: 'completed',
        extracted_data: result.data,
        excel_url: result.excel_url,
        processed_at: new Date().toISOString()
      });

    } catch (error) {
      // Atualizar status para erro
      await this.update(payrollFileId, {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      // Tentar novamente após 3 segundos (1 tentativa)
      setTimeout(async () => {
        try {
          await this.processWithWebhook(payrollFileId, base64Data, competencia);
        } catch (retryError) {
          console.error('Erro na tentativa de retry:', retryError);
        }
      }, 3000);

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
        // Remove o prefixo "data:application/pdf;base64,"
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

    // Validar mês
    if (monthNum < 1 || monthNum > 12) {
      return false;
    }

    // Validar ano (não pode ser futuro)
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