import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Building2,
  FileText,
  Calendar,
  TrendingUp,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  RefreshCw,
  Plus,
  File,
  X,
  Loader2,
  Clock,
  CheckCircle,
  Zap,
  Search,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useActiveProcessings } from "@/hooks/useProcessingUpdates";
import { useErrorHandler, ValidationError, ProcessingError } from "@/utils/errorHandling";
import { useAuth } from '@/contexts/AuthContext';
import { PayrollService } from '@/services/payrollService';
import { CompanyService } from '@/services/companyService';
import type { 
  Company, 
  PayrollFile, 
  PayrollUploadData, 
  PayrollStats, 
  UploadProgress,
  DragDropState,
  BatchUploadResult,
  ProcessingStatus
} from '../../shared/types/payroll';

// Constants
const MAX_FILES = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf'];
const REFRESH_INTERVAL = 5000; // 5 seconds for real-time updates

export const PayrollManagement: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleError, handleAsync, validateFile, validateBatchUpload } = useErrorHandler();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use real-time processing updates hook
  const { 
    activeProcessings, 
    loading: processingLoading, 
    error: processingError,
    refresh: refreshProcessings,
    cancelProcessing,
    reprocessBatch
  } = useActiveProcessings();

  const [company, setCompany] = useState<Company | null>(null);
  const [payrollFiles, setPayrollFiles] = useState<PayrollFile[]>([]);
  const [stats, setStats] = useState<PayrollStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enhanced upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [dragState, setDragState] = useState<DragDropState>({
    isDragOver: false,
    isDragActive: false
  });
  const [competencia, setCompetencia] = useState<string>('');
  const [lastUploadResult, setLastUploadResult] = useState<BatchUploadResult | null>(null);

  // Delete confirmation
  const [fileToDelete, setFileToDelete] = useState<PayrollFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter active processings for this company
  const companyProcessings = activeProcessings.filter(p => p.company_id === companyId);

  // Update upload progress based on company-specific active processings
  // Use useMemo to directly compute upload progress without useEffect to prevent loops
  const uploadProgress = useMemo(() => {
    if (companyProcessings.length > 0) {
      return companyProcessings.map(p => ({
        file_id: p.id,
        filename: `Processamento ${p.competency}`,
        progress: p.progress || 0,
        status: p.status,
        estimated_time: p.estimated_completion_time
      }));
    }
    return [];
  }, [companyProcessings]);

  // Load data with enhanced error handling and retry logic - memoize with stable dependencies
  const loadData = useCallback(async (retryCount = 0) => {
    if (!companyId) return;

    const maxRetries = 3;
    const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff

    try {
      setIsLoading(true);
      setError(null);

      const [companyData, filesData, statsData] = await Promise.all([
        CompanyService.getById(companyId),
        PayrollService.getByCompanyId(companyId),
        PayrollService.getStats(companyId)
      ]);

      setCompany(companyData);
      setPayrollFiles(filesData);
      setStats(statsData);
    } catch (err) {
      // Se for erro de conectividade e ainda temos tentativas, retry
      if (err instanceof Error && 
          err.message.includes('conectividade') && 
          retryCount < maxRetries) {
        
        console.log(`Tentativa ${retryCount + 1} falhou, tentando novamente em ${retryDelay}ms...`);
        
        setTimeout(() => {
          loadData(retryCount + 1);
        }, retryDelay);
        
        return; // Não propaga o erro ainda
      }
      
      // Handle error without causing re-renders
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      // Mostrar toast com opção de tentar novamente
      toast({
        title: "Erro ao carregar dados",
        description: errorMessage,
        variant: "destructive",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadData(0)}
          >
            Tentar Novamente
          </Button>
        ),
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, toast]); // Remove handleAsync dependency to prevent loops

  // Load data only when companyId changes, not when loadData changes
  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]); // Only depend on companyId, not loadData

  // Competencia validation
  const validateCompetencia = (comp: string): boolean => {
    const regex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    if (!regex.test(comp)) return false;
    
    const [month, year] = comp.split('/').map(Number);
    const currentYear = new Date().getFullYear();
    
    return year >= 2020 && year <= currentYear + 1;
  };

  // Handle file selection with enhanced validation
  const handleFileSelect = (files: FileList) => {
    try {
      const fileArray = Array.from(files);
      
      // Validate batch upload
      validateBatchUpload([...selectedFiles, ...fileArray], MAX_FILES);
      
      const validFiles: File[] = [];
      const errors: string[] = [];

      // Validate each file
      fileArray.forEach(file => {
        try {
          validateFile(file);
          
          // Check for duplicates
          const isDuplicate = selectedFiles.some(existing => 
            existing.name === file.name && existing.size === file.size
          );
          
          if (!isDuplicate) {
            validFiles.push(file);
          } else {
            errors.push(`Arquivo duplicado: ${file.name}`);
          }
        } catch (error) {
          if (error instanceof ValidationError) {
            errors.push(`${file.name}: ${error.message}`);
          } else {
            errors.push(`${file.name}: Erro de validação`);
          }
        }
      });

      // Show errors if any
      if (errors.length > 0) {
        toast({
          title: "Alguns arquivos não foram adicionados",
          description: errors.slice(0, 3).join(', ') + (errors.length > 3 ? '...' : ''),
          variant: "destructive",
        });
      }

      // Add valid files
      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
        toast({
          title: "Arquivos adicionados",
          description: `${validFiles.length} arquivo(s) adicionado(s) com sucesso`,
        });
      }
    } catch (error) {
      handleError(error, 'file_selection');
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ isDragOver: true, isDragActive: true });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ isDragOver: false, isDragActive: false });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ isDragOver: false, isDragActive: false });
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Remove file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle batch upload
  const handleBatchUpload = async () => {
    try {
      // Validation checks with enhanced error handling
      if (!companyId) {
        throw new ValidationError('ID da empresa não encontrado');
      }

      if (!competencia) {
        throw new ValidationError('Competência é obrigatória');
      }

      if (selectedFiles.length === 0) {
        throw new ValidationError('Adicione pelo menos um arquivo');
      }

      if (!validateCompetencia(competencia)) {
        throw new ValidationError('Use o formato MM/AAAA (ex: 12/2024)');
      }

      // Validate batch upload
      validateBatchUpload(selectedFiles, MAX_FILES);

      // Validate each file
      selectedFiles.forEach(file => validateFile(file));

      setUploadStatus('uploading');
      
      // Initialize progress tracking
      // Upload progress is now handled by the useMemo hook based on active processings

      const uploadData: PayrollUploadData = {
        files: selectedFiles,
        competency: competencia,
        company_id: companyId
      };

      const { result, error } = await handleAsync(
        () => PayrollService.batchUpload(uploadData),
        'batch_upload'
      );

      if (error) {
        setUploadStatus('error');
        return;
      }

      setLastUploadResult(result);

      if (result.success) {
        setUploadStatus('completed');
        toast({
          title: "Upload realizado com sucesso!",
          description: `${result.successful_files} arquivo(s) enviado(s) para processamento`,
        });

        // Clear form
        setSelectedFiles([]);
        setCompetencia('');
        
        // Refresh data
        await handleAsync(() => loadData(), 'data_refresh');
        
      } else if (result.partial_success) {
        setUploadStatus('completed');
        toast({
          title: "Upload parcialmente realizado",
          description: `${result.successful_files} de ${result.total_files} arquivo(s) processado(s)`,
          variant: "destructive",
        });
      } else {
        setUploadStatus('error');
        throw new ProcessingError(result.error || "Erro desconhecido durante o upload");
      }
    } catch (error) {
      setUploadStatus('error');
      handleError(error, 'batch_upload');
    }
  };

  const handleDeleteClick = (file: PayrollFile) => {
    setFileToDelete(file);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await handleAsync(
        () => PayrollService.delete(fileToDelete.id),
        'file_deletion'
      );

      if (!error) {
        await handleAsync(() => loadData(), 'data_refresh');
        setFileToDelete(null);
        toast({
          title: "Arquivo excluído",
          description: "Arquivo excluído com sucesso",
        });
      }
    } catch (error) {
      handleError(error, 'file_deletion');
      setError(error instanceof Error ? error.message : 'Erro ao deletar arquivo');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setFileToDelete(null);
  };

  const handleDownload = async (file: PayrollFile) => {
    try {
      if (!file.excel_url) {
        throw new ValidationError('Arquivo Excel não disponível para download');
      }

      const { result: url, error } = await handleAsync(
        () => PayrollService.getDownloadUrl(file.excel_url!),
        'file_download'
      );

      if (error) return;

      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.filename.replace('.pdf', '')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download iniciado",
        description: "O download do arquivo foi iniciado",
      });
    } catch (error) {
      handleError(error, 'file_download');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isUploading = uploadStatus === 'uploading';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Carregando dados...</span>
        </div>
      </div>
    );
  }

  // Show error state if there's a connectivity issue
  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Problema de Conectividade
          </h2>
          <p className="text-gray-600 mb-6">
            {error.includes('conectividade') 
              ? 'Não foi possível conectar com o servidor. Verifique sua conexão com a internet.'
              : error
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => loadData(0)}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/companies')}
            >
              Voltar para Empresas
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Empresa não encontrada</h2>
          <button
            onClick={() => navigate('/companies')}
            className="text-blue-600 hover:text-blue-700"
          >
            Voltar para lista de empresas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/companies')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                <p className="text-gray-600">CNPJ: {CompanyService.formatCnpj(company.cnpj)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Esta Semana</p>
                  <p className="text-2xl font-bold text-foreground">{stats.files_this_week}</p>
                </div>
                <Calendar className="w-8 h-8 text-ai-blue" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Este Mês</p>
                  <p className="text-2xl font-bold text-foreground">{stats.files_this_month}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-ai-green" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total_files}</p>
                </div>
                <FileText className="w-8 h-8 text-ai-orange" />
              </div>
            </Card>
          </div>
        )}



        {/* Enhanced Upload Area */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload de Holerites em Lote
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Competencia Input */}
            <div className="space-y-2">
              <Label htmlFor="competencia">Competência (MM/AAAA)</Label>
              <Input
                id="competencia"
                type="text"
                placeholder="12/2024"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                disabled={isUploading}
                className="max-w-xs"
              />
            </div>

            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragState.isDragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-600">Processando arquivos...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Arraste arquivos PDF aqui
                  </h3>
                  <p className="text-gray-600 mb-4">
                    ou clique para selecionar múltiplos arquivos
                  </p>
                  
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Selecionar Arquivos
                  </Button>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Máximo {MAX_FILES} arquivos • {formatFileSize(MAX_FILE_SIZE)} por arquivo
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            />

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Arquivos Selecionados ({selectedFiles.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-center gap-3">
                        <File className="w-4 h-4 text-red-500" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress.length > 0 && (
              <div className="space-y-2">
                <Label>Progresso do Upload</Label>
                <div className="space-y-2">
                  {uploadProgress.map((progress) => (
                    <div key={progress.file_id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{progress.filename}</span>
                        <div className="flex items-center gap-2">
                          <span>{progress.progress}%</span>
                          {progress.estimated_time && (
                            <span className="text-xs text-muted-foreground">
                              ~{progress.estimated_time}
                            </span>
                          )}
                        </div>
                      </div>
                      <Progress value={progress.progress} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            {selectedFiles.length > 0 && competencia && (
              <Button
                onClick={handleBatchUpload}
                className="w-full"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando {selectedFiles.length} arquivo(s)...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar {selectedFiles.length} arquivo(s)
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Files List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Arquivos Importados
            </h2>
            <button
              onClick={loadData}
              className="px-3 py-1 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>

          {payrollFiles.length === 0 ? (
            <div className="p-12 text-center">
              <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum arquivo importado
              </h3>
              <p className="text-gray-500">
                Faça o upload dos primeiros arquivos PDF de holerite
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Arquivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Importação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Competência
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tamanho
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrollFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-red-100 rounded-lg mr-3">
                            <File className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {file.filename}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {PayrollService.formatDate(file.created_at || '')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {file.competencia}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatFileSize(file.file_size || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          file.status === 'processed'
                            ? 'bg-green-100 text-green-800'
                            : file.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {file.status === 'processed' ? 'Processado' : 
                           file.status === 'processing' ? 'Processando' : 'Erro'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {file.excel_url && PayrollService.canDownload(file) && (
                            <button
                              onClick={() => handleDownload(file)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Download XLSX"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(file)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deletar arquivo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirmar Exclusão
                </h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir o arquivo <strong>{fileToDelete.filename}</strong>?
                Esta ação não pode ser desfeita.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};