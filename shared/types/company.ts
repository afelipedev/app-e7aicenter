export interface Company {
  id: string;
  name: string;
  cnpj: string;
  status?: 'ativo' | 'inativo';
  payslips_count?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCompanyData {
  name: string;
  cnpj: string;
}

export interface UpdateCompanyData {
  name?: string;
  cnpj?: string;
  status?: 'ativo' | 'inativo';
}

export interface CompanyWithStats extends Company {
  total_payroll_files: number;
  files_this_week: number;
  files_this_month: number;
}