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
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Empresa não encontrada
      }
      throw new Error(`Erro ao buscar empresa: ${error.message}`);
    }

    return data;
  }

  /**
   * Busca uma empresa por CNPJ
   */
  static async getByCnpj(cnpj: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('cnpj', cnpj)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Empresa não encontrada
      }
      throw new Error(`Erro ao buscar empresa por CNPJ: ${error.message}`);
    }

    return data;
  }

  /**
   * Cria uma nova empresa
   */
  static async create(companyData: CreateCompanyData): Promise<Company> {
    // Validar CNPJ antes de criar
    if (!this.validateCnpj(companyData.cnpj)) {
      throw new Error('CNPJ inválido');
    }

    // Verificar se já existe empresa com este CNPJ
    const existingCompany = await this.getByCnpj(companyData.cnpj);
    if (existingCompany) {
      throw new Error('Já existe uma empresa cadastrada com este CNPJ');
    }

    // Obter usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

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
   */
  static async getAllWithStats(): Promise<CompanyWithStats[]> {
    const companies = await this.getAll();
    
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const stats = await this.getPayrollStats(company.id);
        return {
          ...company,
          ...stats
        };
      })
    );

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
}