import { supabase } from '../lib/supabase';
import type { Company, CreateCompanyData, UpdateCompanyData, CompanyWithStats } from '../../shared/types/company';

export class CompanyService {
  /**
   * Busca todas as empresas
   */
  static async getAll(): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(`Erro ao buscar empresas: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Busca uma empresa por ID
   */
  static async getById(id: string): Promise<Company | null> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Empresa não encontrada
        }
        console.error('Supabase error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Erro ao buscar empresa: ${error.message}`);
      }

      return data;
    } catch (err) {
      // Captura erros de rede ou outros erros não relacionados ao Supabase
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        console.error('Network connectivity error:', err);
        throw new Error('Erro de conectividade: Verifique sua conexão com a internet e tente novamente.');
      }
      
      console.error('Unexpected error in getById:', err);
      throw err;
    }
  }

  /**
   * Busca uma empresa por CNPJ
   */
  static async getByCnpj(cnpj: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('cnpj', cnpj)
      .maybeSingle(); // Usa maybeSingle em vez de single para evitar erro 406

    if (error) {
      // Se for erro de "não encontrado", retorna null
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar empresa por CNPJ: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Renova a sessão do usuário se necessário
   */
  private static async ensureAuthenticatedSession(): Promise<void> {
    try {
      // Tentar renovar a sessão
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.warn('Erro ao renovar sessão:', refreshError);
        // Se não conseguir renovar, verificar se ainda há sessão válida
        const { data: { user }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError || !user) {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
      }
    } catch (error) {
      console.error('Erro ao garantir sessão autenticada:', error);
      throw error;
    }
  }

  /**
   * Cria uma nova empresa
   */
  static async create(companyData: CreateCompanyData): Promise<Company> {
    // Validar CNPJ antes de criar
    if (!this.validateCnpj(companyData.cnpj)) {
      throw new Error('CNPJ inválido');
    }

    // Garantir que a sessão está válida antes de criar empresa
    await this.ensureAuthenticatedSession();

    // Obter usuário atual (fazer antes da verificação para evitar timeout)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Tentar inserir diretamente - a constraint unique do banco já valida duplicidade
    // Isso é mais eficiente que fazer uma query separada para verificar
    const { data, error } = await supabase
      .from('companies')
      .insert({
        ...companyData,
        created_by: user.id,
        status: 'ativo'
      })
      .select()
      .single();

    if (error) {
      // Se for erro de constraint unique, retornar mensagem amigável
      if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
        throw new Error('Já existe uma empresa cadastrada com este CNPJ');
      }
      throw new Error(`Erro ao criar empresa: ${error.message}`);
    }

    return data;
  }

  /**
   * Atualiza uma empresa
   */
  static async update(id: string, companyData: UpdateCompanyData): Promise<Company> {
    // Validar CNPJ se fornecido
    if (companyData.cnpj && !this.validateCnpj(companyData.cnpj)) {
      throw new Error('CNPJ inválido');
    }

    // Verificar se já existe outra empresa com este CNPJ
    if (companyData.cnpj) {
      const existingCompany = await this.getByCnpj(companyData.cnpj);
      if (existingCompany && existingCompany.id !== id) {
        throw new Error('Já existe uma empresa cadastrada com este CNPJ');
      }
    }

    const { data, error } = await supabase
      .from('companies')
      .update(companyData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar empresa: ${error.message}`);
    }

    return data;
  }

  /**
   * Deleta uma empresa
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar empresa: ${error.message}`);
    }
  }

  /**
   * Busca empresas com estatísticas de holerites
   * Otimizado para fazer queries em paralelo com limite de concorrência
   */
  static async getAllWithStats(): Promise<CompanyWithStats[]> {
    const companies = await this.getAll();
    
    // Limitar concorrência para evitar sobrecarga
    const BATCH_SIZE = 10;
    const companiesWithStats: CompanyWithStats[] = [];
    
    for (let i = 0; i < companies.length; i += BATCH_SIZE) {
      const batch = companies.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (company) => {
          const stats = await this.getPayrollStats(company.id);
          return {
            ...company,
            ...stats
          };
        })
      );
      companiesWithStats.push(...batchResults);
    }

    return companiesWithStats;
  }

  /**
   * Obtém estatísticas de holerites de uma empresa
   */
  static async getPayrollStats(companyId: string): Promise<{
    total_payroll_files: number;
    files_this_week: number;
    files_this_month: number;
  }> {
    const { data, error } = await supabase
      .rpc('get_payroll_stats', { company_uuid: companyId });

    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {
        total_payroll_files: 0,
        files_this_week: 0,
        files_this_month: 0
      };
    }

    const stats = data?.[0] || {
      total_files: 0,
      files_this_week: 0,
      files_this_month: 0
    };

    return {
      total_payroll_files: stats.total_files,
      files_this_week: stats.files_this_week,
      files_this_month: stats.files_this_month
    };
  }

  /**
   * Valida formato de CNPJ
   */
  static validateCnpj(cnpj: string): boolean {
    // Remove caracteres não numéricos
    const cleanCnpj = cnpj.replace(/[^\d]/g, '');
    
    // Verifica se tem 14 dígitos
    if (cleanCnpj.length !== 14) {
      return false;
    }
    
    // Verifica se não são todos os dígitos iguais
    if (/^(\d)\1{13}$/.test(cleanCnpj)) {
      return false;
    }
    
    // Validação dos dígitos verificadores
    let tamanho = cleanCnpj.length - 2;
    let numeros = cleanCnpj.substring(0, tamanho);
    const digitos = cleanCnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(0))) {
      return false;
    }
    
    tamanho = tamanho + 1;
    numeros = cleanCnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(1))) {
      return false;
    }
    
    return true;
  }

  /**
   * Formata CNPJ para exibição
   */
  static formatCnpj(cnpj: string): string {
    const cleanCnpj = cnpj.replace(/[^\d]/g, '');
    return cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  /**
   * Remove formatação do CNPJ
   */
  static cleanCnpj(cnpj: string): string {
    return cnpj.replace(/[^\d]/g, '');
  }

  /**
   * Busca empresas por nome ou CNPJ
   */
  static async searchCompanies(query: string): Promise<{ data: CompanyWithStats[] | null; error: any }> {
    try {
      // Primeiro buscar empresas que correspondem à query
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .or(`name.ilike.%${query}%,cnpj.ilike.%${query}%`)
        .order('name');

      if (error) {
        return { data: null, error };
      }

      if (!companies || companies.length === 0) {
        return { data: [], error: null };
      }

      // Adicionar estatísticas para cada empresa encontrada
      const companiesWithStats = await Promise.all(
        companies.map(async (company) => {
          const stats = await this.getPayrollStats(company.id);
          return {
            ...company,
            ...stats
          };
        })
      );

      return { data: companiesWithStats, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}