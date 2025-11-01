export interface PayrollFile {
  id: string;
  company_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  competencia: string; // MM/AAAA
  status: 'pending' | 'processing' | 'completed' | 'error';
  s3_url?: string;
  excel_url?: string;
  extracted_data?: any;
  error_message?: string;
  processed_at?: string;
  uploaded_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePayrollFileData {
  company_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  competencia: string;
  s3_url?: string;
}

export interface UpdatePayrollFileData {
  status?: 'pending' | 'processing' | 'completed' | 'error';
  s3_url?: string;
  excel_url?: string;
  extracted_data?: any;
  error_message?: string;
  processed_at?: string;
}

export interface PayrollStats {
  total_files: number;
  files_this_week: number;
  files_this_month: number;
}

export interface PayrollUploadData {
  file: File;
  competencia: string;
  company_id: string;
}