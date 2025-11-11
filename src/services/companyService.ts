import { supabase } from '../lib/supabase';
import type { Company, CreateCompanyData, UpdateCompanyData, CompanyWithStats } from '../../shared/types/company';
import type { Session, User } from '@supabase/supabase-js';

// Timeout padrão para operações (15 segundos)
const DEFAULT_TIMEOUT = 15000;

// Função utilitária para adicionar timeout a promises
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = DEFAULT_TIMEOUT): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operação expirou. Verifique sua conexão e tente novamente.')), timeoutMs)
    )
  ]);
};

export class CompanyService {
  /**
   * Busca todas as empresas
   */
  static async getAll(): Promise<Company[]> {
    try {
      const queryPromise = supabase
        .from('companies')
        .select('*')
        .order('name');

      const { data, error } = await withTimeout(queryPromise, DEFAULT_TIMEOUT);

      if (error) {
        throw new Error(`Erro ao buscar empresas: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      if (error instanceof Error && error.message.includes('expirou')) {
        throw error;
      }
      throw new Error(`Erro ao buscar empresas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca uma empresa por ID
   */
  static async getById(id: string): Promise<Company | null> {
    try {
      const queryPromise = supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await withTimeout(queryPromise, DEFAULT_TIMEOUT);

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
      // Captura erros de timeout
      if (err instanceof Error && err.message.includes('expirou')) {
        throw err;
      }
      // Captura erros de rede ou outros erros não relacionados ao Supabase
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        console.error('Network connectivity error:', err);
        throw new Error('Erro de conectividade: Verifique sua conexão com a internet e tente novamente.');
      }
      
      console.error('Unexpected error in getById:', err);
      throw err instanceof Error ? err : new Error('Erro desconhecido ao buscar empresa');
    }
  }

  /**
   * Busca uma empresa por CNPJ
   */
  static async getByCnpj(cnpj: string): Promise<Company | null> {
    try {
      const queryPromise = supabase
        .from('companies')
        .select('*')
        .eq('cnpj', cnpj)
        .maybeSingle(); // Usa maybeSingle em vez de single para evitar erro 406

      const { data, error } = await withTimeout(queryPromise, DEFAULT_TIMEOUT);

      if (error) {
        // Se for erro de "não encontrado", retorna null
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Erro ao buscar empresa por CNPJ: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('expirou')) {
        throw error;
      }
      throw new Error(`Erro ao buscar empresa por CNPJ: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Verifica se há uma sessão autenticada válida e retorna a sessão
   * Usa getSession() que é mais rápido e confiável que getUser()
   * NÃO renova sessão automaticamente para evitar loops infinitos
   */
  private static async ensureAuthenticatedSession(): Promise<{ session: Session; user: User }> {
    try {
      // Usar getSession() que é mais rápido e verifica a sessão local primeiro
      const getSessionPromise = supabase.auth.getSession();
      const { data: { session }, error: sessionError } = await withTimeout(getSessionPromise, 10000);
      
      if (sessionError) {
        console.warn('Erro ao verificar sessão:', sessionError);
        throw new Error('Erro ao verificar autenticação. Tente novamente.');
      }

      if (!session || !session.user) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }

      // NÃO renovar sessão automaticamente aqui para evitar loops infinitos
      // O Supabase já renova automaticamente com autoRefreshToken: true
      // Renovação manual pode causar loops com onAuthStateChange

      return { session, user: session.user };
    } catch (error) {
      console.error('Erro ao garantir sessão autenticada:', error);
      if (error instanceof Error) {
        // Re-throw erros já tratados
        throw error;
      }
      throw new Error('Erro ao verificar autenticação. Tente novamente.');
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

    try {
      // Garantir que a sessão está válida e obter dados da sessão (evita chamada duplicada)
      const { user } = await this.ensureAuthenticatedSession();

      // Tentar inserir diretamente - a constraint unique do banco já valida duplicidade
      // Isso é mais eficiente que fazer uma query separada para verificar
      const insertPromise = supabase
        .from('companies')
        .insert({
          ...companyData,
          created_by: user.id,
          status: 'ativo'
        })
        .select()
        .single();

      const { data, error } = await withTimeout(insertPromise, DEFAULT_TIMEOUT);

      if (error) {
        // Se for erro de constraint unique, retornar mensagem amigável
        if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
          throw new Error('Já existe uma empresa cadastrada com este CNPJ');
        }
        throw new Error(`Erro ao criar empresa: ${error.message}`);
      }

      if (!data) {
        throw new Error('Erro ao criar empresa: nenhum dado retornado');
      }

      return data;
    } catch (error) {
      // Re-throw erros já tratados
      if (error instanceof Error) {
        throw error;
      }
      // Erros não esperados
      throw new Error('Erro inesperado ao criar empresa. Tente novamente.');
    }
  }

  /**
   * Atualiza uma empresa
   */
  static async update(id: string, companyData: UpdateCompanyData): Promise<Company> {
    // Validar CNPJ se fornecido
    if (companyData.cnpj && !this.validateCnpj(companyData.cnpj)) {
      throw new Error('CNPJ inválido');
    }

    try {
      // Verificar se já existe outra empresa com este CNPJ
      if (companyData.cnpj) {
        const existingCompany = await this.getByCnpj(companyData.cnpj);
        if (existingCompany && existingCompany.id !== id) {
          throw new Error('Já existe uma empresa cadastrada com este CNPJ');
        }
      }

      const updatePromise = supabase
        .from('companies')
        .update(companyData)
        .eq('id', id)
        .select()
        .single();

      const { data, error } = await withTimeout(updatePromise, DEFAULT_TIMEOUT);

      if (error) {
        throw new Error(`Erro ao atualizar empresa: ${error.message}`);
      }

      if (!data) {
        throw new Error('Erro ao atualizar empresa: nenhum dado retornado');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro inesperado ao atualizar empresa. Tente novamente.');
    }
  }

  /**
   * Deleta uma empresa
   */
  static async delete(id: string): Promise<void> {
    try {
      const deletePromise = supabase
        .from('companies')
        .delete()
        .eq('id', id);

      const { error } = await withTimeout(deletePromise, DEFAULT_TIMEOUT);

      if (error) {
        throw new Error(`Erro ao deletar empresa: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('expirou')) {
        throw error;
      }
      throw new Error(`Erro ao deletar empresa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
    try {
      const rpcPromise = supabase
        .rpc('get_payroll_stats', { company_uuid: companyId });

      const { data, error } = await withTimeout(rpcPromise, 10000); // Timeout menor para RPC

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
    } catch (error) {
      console.error('Erro ao buscar estatísticas (timeout ou erro):', error);
      return {
        total_payroll_files: 0,
        files_this_week: 0,
        files_this_month: 0
      };
    }
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
      const searchPromise = supabase
        .from('companies')
        .select('*')
        .or(`name.ilike.%${query}%,cnpj.ilike.%${query}%`)
        .order('name');

      const { data: companies, error } = await withTimeout(searchPromise, DEFAULT_TIMEOUT);

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