export type SpedType = 'SPED ICMS IPI' | 'SPED Contribuições';

export interface SpedFile {
  id: string;
  company_id: string;
  sped_type: SpedType;
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

export interface CreateSpedFileData {
  company_id: string;
  sped_type: SpedType;
  filename: string;
  original_filename: string;
  file_size: number;
  competencia: string;
  s3_url?: string;
}

export interface UpdateSpedFileData {
  status?: 'pending' | 'processing' | 'completed' | 'error';
  s3_url?: string;
  excel_url?: string;
  extracted_data?: any;
  error_message?: string;
  processed_at?: string;
}

export interface SpedProcessing {
  id: string;
  company_id: string;
  sped_type: SpedType;
  competency: string; // MM/AAAA
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number; // 0-100
  result_file_path?: string;
  result_file_url?: string;
  extracted_data?: any;
  error_message?: string;
  webhook_response?: any;
  estimated_time?: number; // em minutos
  started_at: string;
  completed_at?: string;
  initiated_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSpedProcessingData {
  company_id: string;
  sped_type: SpedType;
  competency: string;
  file_ids: string[];
}

export interface UpdateSpedProcessingData {
  status?: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  result_file_path?: string;
  result_file_url?: string;
  extracted_data?: any;
  error_message?: string;
  webhook_response?: any;
  estimated_time?: number;
  completed_at?: string;
}

export interface SpedUploadData {
  files: File[];
  competencia: string;
  company_id: string;
  sped_type: SpedType;
}

export interface BatchSpedUploadResult {
  success: boolean;
  partial_success: boolean;
  processing_id?: string;
  total_files: number;
  successful_files: number;
  failed_files: number;
  uploaded_files?: SpedFile[];
  failed_uploads?: {
    filename: string;
    error: string;
  }[];
  error?: string;
}

export interface ProcessingStatus {
  id: string;
  company_id: string;
  company_name?: string;
  sped_type: SpedType;
  competency: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  files_count: number;
  current_step?: string;
  estimated_completion_time?: string;
  result_url?: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  statistics?: {
    successful_files?: number;
    failed_files?: number;
    total_records?: number;
    processing_time?: string;
  };
}

export interface EnhancedSpedStats {
  total_processings: number;
  completed_this_month: number;
  in_progress: number;
  total_files_processed: number;
  average_processing_time?: number; // em minutos
  success_rate?: number; // 0-100
}

export interface ProcessingHistory {
  id: string;
  company_name: string;
  sped_type: SpedType;
  competency: string;
  files_count: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  started_at: string;
  completed_at?: string;
  processing_time?: number; // em minutos
  result_file_url?: string;
  can_download: boolean;
}

export interface ProcessingFilters {
  status?: ('pending' | 'processing' | 'completed' | 'error')[];
  competency?: string;
  company_id?: string;
  sped_type?: SpedType;
  date_range?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface ProcessingSort {
  field: 'started_at' | 'completed_at' | 'competency' | 'status' | 'progress';
  direction: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  file: File;
}

export interface CompanyOption {
  id: string;
  name: string;
  cnpj?: string;
}

export interface WebhookPayload {
  processing_id: string;
  files: {
    file_id: string;
    txt_base64: string;
    filename: string;
  }[];
  competency: string;
  company_id: string;
  sped_type: SpedType;
  callback_url?: string;
}

export interface WebhookResponse {
  success: boolean;
  processing_id: string;
  message: string;
  estimated_time?: number;
  error?: string;
  data?: any;
}

export interface WebhookStatusUpdate {
  processing_id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  current_step?: string;
  result_file_url?: string;
  extracted_data?: any;
  error_message?: string;
}

export interface UploadProgress {
  file_id: string;
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error_message?: string;
}

export interface DragDropState {
  isDragOver: boolean;
  isDragActive: boolean;
  files: File[];
  errors: string[];
}
