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

// =====================================================
// ENHANCED PROCESSING TYPES
// =====================================================

export interface PayrollProcessing {
  id: string;
  company_id: string;
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

export interface CreatePayrollProcessingData {
  company_id: string;
  competency: string;
  file_ids: string[];
}

export interface UpdatePayrollProcessingData {
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

export interface ProcessingLog {
  id: string;
  processing_id: string;
  log_level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  metadata?: any;
  created_at: string;
}

export interface RubricPattern {
  id: string;
  pattern_name: string;
  pattern_regex: string;
  normalized_name: string;
  rubric_type: 'provento' | 'desconto' | 'base';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtractedRubric {
  id: string;
  processing_id: string;
  original_text: string;
  normalized_name?: string;
  value?: number;
  rubric_type?: 'provento' | 'desconto' | 'base';
  pattern_id?: string;
  confidence_score?: number; // 0.0 - 1.0
  created_at: string;
}

export interface PayrollFileProcessing {
  id: string;
  payroll_file_id: string;
  processing_id: string;
  created_at: string;
}

// =====================================================
// BATCH UPLOAD TYPES
// =====================================================

export interface BatchUploadData {
  files: File[];
  competencia: string;
  company_id: string;
}

export interface BatchUploadResult {
  processing_id: string;
  uploaded_files: PayrollFile[];
  failed_files: {
    file: File;
    error: string;
  }[];
  total_files: number;
  successful_uploads: number;
  failed_uploads: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  file: File;
}

// =====================================================
// PROCESSING STATUS TYPES
// =====================================================

export interface ProcessingStatus {
  processing_id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  current_step?: string;
  estimated_time_remaining?: number; // em minutos
  files_processed: number;
  total_files: number;
  error_message?: string;
  last_updated: string;
}

export interface ProcessingStep {
  step_name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

// =====================================================
// ENHANCED STATS TYPES
// =====================================================

export interface EnhancedPayrollStats {
  total_processings: number;
  completed_this_month: number;
  in_progress: number;
  total_files_processed: number;
  average_processing_time?: number; // em minutos
  success_rate?: number; // 0-100
  most_common_errors?: string[];
}

export interface ProcessingHistory {
  id: string;
  company_name: string;
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

// =====================================================
// WEBHOOK TYPES
// =====================================================

export interface WebhookPayload {
  processing_id: string;
  files: {
    file_id: string;
    pdf_base64: string;
    filename: string;
  }[];
  competency: string;
  company_id: string;
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

// =====================================================
// UI COMPONENT TYPES
// =====================================================

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

export interface CompanyOption {
  id: string;
  name: string;
  cnpj?: string;
}

// =====================================================
// ERROR HANDLING TYPES
// =====================================================

export interface PayrollError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context?: {
    file_id?: string;
    processing_id?: string;
    company_id?: string;
    competency?: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// =====================================================
// FILTER AND SEARCH TYPES
// =====================================================

export interface ProcessingFilters {
  status?: ('pending' | 'processing' | 'completed' | 'error')[];
  competency?: string;
  company_id?: string;
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