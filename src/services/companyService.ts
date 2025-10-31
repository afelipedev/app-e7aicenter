import { supabase, Company } from '../lib/supabase'

export interface CreateCompanyData {
  name: string
  cnpj: string
  payslips_count?: number
  status?: 'active' | 'inactive'
}

export interface UpdateCompanyData {
  name?: string
  cnpj?: string
  payslips_count?: number
  status?: 'active' | 'inactive'
}

export class CompanyService {
  static async getCompanies(): Promise<{ data: Company[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async getCompanyById(id: string): Promise<{ data: Company | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async createCompany(companyData: CreateCompanyData): Promise<{ data: Company | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: companyData.name,
          cnpj: companyData.cnpj,
          payslips_count: companyData.payslips_count || 0,
          status: companyData.status || 'active'
        })
        .select()
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async updateCompany(id: string, companyData: UpdateCompanyData): Promise<{ data: Company | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update({
          ...companyData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async deleteCompany(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)

      return { error }
    } catch (error) {
      return { error }
    }
  }

  static async searchCompanies(query: string): Promise<{ data: Company[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .or(`name.ilike.%${query}%,cnpj.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async getCompaniesByStatus(status: 'active' | 'inactive'): Promise<{ data: Company[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async updatePayslipsCount(id: string, count: number): Promise<{ data: Company | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update({
          payslips_count: count,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async incrementPayslipsCount(id: string): Promise<{ data: Company | null; error: any }> {
    try {
      // First get current count
      const { data: company, error: fetchError } = await this.getCompanyById(id)
      
      if (fetchError || !company) {
        return { data: null, error: fetchError }
      }

      // Then increment
      const newCount = company.payslips_count + 1
      return await this.updatePayslipsCount(id, newCount)
    } catch (error) {
      return { data: null, error }
    }
  }

  static async decrementPayslipsCount(id: string): Promise<{ data: Company | null; error: any }> {
    try {
      // First get current count
      const { data: company, error: fetchError } = await this.getCompanyById(id)
      
      if (fetchError || !company) {
        return { data: null, error: fetchError }
      }

      // Then decrement (but not below 0)
      const newCount = Math.max(0, company.payslips_count - 1)
      return await this.updatePayslipsCount(id, newCount)
    } catch (error) {
      return { data: null, error }
    }
  }
}