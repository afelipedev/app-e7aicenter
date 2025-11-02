import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useActiveProcessings } from "@/hooks/useProcessingUpdates";
import { ValidationError, ProcessingError } from "@/utils/errorHandling";
import { 
  Upload, 
  FileText, 
  X, 
  Loader2, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Search, 
  RefreshCw, 
  Download, 
  Eye,
  AlertCircle,
  Building2,
  Calendar,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PayrollService } from '@/services/payrollService';
import { CompanyService } from '@/services/companyService';
import type { 
  PayrollUploadData, 
  PayrollStats, 
  ProcessingHistory, 
  UploadProgress,
  DragDropState,
  CompanyOption,
  BatchUploadResult,
  ProcessingStatus,
  EnhancedPayrollStats,
  PaginatedResult
} from '../../../shared/types/payroll';
import type { Company } from '../../../shared/types/company';

// Constants
const MAX_FILES = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf'];

export default function Payroll() {
  const { user } = useAuth();
  const { toast } = useToast();
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

  // State management
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [competencia, setCompetencia] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [dragState, setDragState] = useState<DragDropState>({
    isDragOver: false,
    isDragActive: false,
    files: [],
    errors: []
  });
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [stats, setStats] = useState<EnhancedPayrollStats | null>(null);
  const [processingHistory, setProcessingHistory] = useState<PaginatedResult<ProcessingHistory> | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUploadResult, setLastUploadResult] = useState<BatchUploadResult | null>(null);

  // Initialize data
  const initializeData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [companiesData, statsData, historyData] = await Promise.all([
        PayrollService.getCompanies(),
        PayrollService.getEnhancedStats(),
        PayrollService.getProcessingHistory({ page: 1, limit: 10 })
      ]);

      setCompanies(companiesData);
      setStats(statsData);
      setProcessingHistory(historyData);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Error initializing data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados iniciais",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Update upload progress based on active processings
  useEffect(() => {
    if (activeProcessings.length > 0) {
      const progressData = activeProcessings.map(p => ({
        file_id: p.id,
        filename: `${p.company?.name || 'Empresa'} - ${p.competency}`,
        progress: p.progress || 0,
        status: p.status,
        estimated_time: p.estimated_completion_time
      }));
      setUploadProgress(progressData);
    } else {
      // Clear progress when no active processings
      setUploadProgress([]);
    }
  }, [activeProcessings]);

  // Initialize component
  useEffect(() => {
    initializeData();
  }, []); // Executar apenas uma vez na montagem do componente

  // Competencia validation
  const validateCompetencia = (comp: string): boolean => {
    const regex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    if (!regex.test(comp)) return false;
    
    const [month, year] = comp.split('/').map(Number);
    const currentYear = new Date().getFullYear();
    
    return year >= 2020 && year <= currentYear + 1;
  };

  // Local validation functions to avoid dependency issues
  const validateSingleFile = (file: File) => {
    if (!file) {
      throw new ValidationError('Nenhum arquivo selecionado');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError(
        `Arquivo muito grande. Tamanho máximo: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new ValidationError(
        'Tipo de arquivo não suportado. Apenas arquivos PDF são aceitos.'
      );
    }
  };

  const validateFileBatch = (files: File[]) => {
    if (!files || files.length === 0) {
      throw new ValidationError('Nenhum arquivo selecionado para upload');
    }

    if (files.length > MAX_FILES) {
      throw new ValidationError(
        `Muitos arquivos selecionados. Máximo: ${MAX_FILES} arquivos`
      );
    }
  };

  // Handle file selection with enhanced validation
  const handleFileSelect = (files: FileList) => {
    try {
      const fileArray = Array.from(files);
      
      // Validate batch upload
      validateFileBatch([...selectedFiles, ...fileArray]);
      
      const validFiles: File[] = [];
      const errors: string[] = [];

      // Validate each file
      fileArray.forEach(file => {
        try {
          validateSingleFile(file);
          
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
      console.error('Error in file selection:', error);
      toast({
        title: "Erro na seleção de arquivos",
        description: "Não foi possível processar os arquivos selecionados",
        variant: "destructive",
      });
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState(prev => ({ ...prev, isDragOver: true, isDragActive: true }));
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState(prev => ({ ...prev, isDragOver: false, isDragActive: false }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState(prev => ({ ...prev, isDragOver: false, isDragActive: false }));
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Remove file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Cancel/delete upload in progress
  const handleCancelUpload = async (fileId: string) => {
    try {
      await cancelProcessing(fileId);
      toast({
        title: "Upload cancelado",
        description: "O processamento foi cancelado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao cancelar upload:', error);
      toast({
        title: "Erro ao cancelar",
        description: "Não foi possível cancelar o processamento",
        variant: "destructive",
      });
    }
  };

  // Handle file upload with enhanced error handling and n8n webhook integration
  const handleUpload = async () => {
    if (!selectedCompany || !competencia || selectedFiles.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione uma empresa, competência e pelo menos um arquivo",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadStatus('uploading');
      
      // Validate files before upload using local validation
      try {
        if (selectedFiles.length === 0) {
          throw new Error('Nenhum arquivo selecionado para upload');
        }

        if (selectedFiles.length > MAX_FILES) {
          throw new Error(`Muitos arquivos selecionados. Máximo: ${MAX_FILES} arquivos`);
        }

        selectedFiles.forEach((file, index) => {
          if (!file) {
            throw new Error('Arquivo inválido encontrado');
          }

          if (file.size > MAX_FILE_SIZE) {
            throw new Error(
              `Arquivo ${file.name} muito grande. Tamanho máximo: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
            );
          }

          if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error(
              `Arquivo ${file.name}: Tipo não suportado. Apenas arquivos PDF são aceitos.`
            );
          }
        });
      } catch (validationError) {
        setUploadStatus('error');
        toast({
          title: "Erro de Validação",
          description: validationError instanceof Error ? validationError.message : "Erro na validação dos arquivos",
          variant: "destructive",
        });
        return;
      }

      const uploadData: PayrollUploadData = {
        company_id: selectedCompany,
        competencia,
        files: selectedFiles,
        user_id: user?.id || ''
      };

      // Initialize progress tracking
      const initialProgress = selectedFiles.map((file, index) => ({
        file_id: `upload-${Date.now()}-${index}`,
        filename: file.name,
        progress: 0,
        status: 'uploading' as const,
        error_message: undefined
      }));
      setUploadProgress(initialProgress);

      // Perform upload
      const result = await PayrollService.batchUpload(uploadData);

      if (!result) {
        setUploadStatus('error');
        toast({
          title: "Erro no Upload",
          description: "Resposta inválida do servidor",
          variant: "destructive",
        });
        return;
      }

      setLastUploadResult(result);

      if (result.success) {
        setUploadStatus('completed');
        
        // Trigger n8n webhook for workflow execution
        try {
          const webhookPayload = {
            company_id: selectedCompany,
            competencia,
            files: selectedFiles.map(file => ({
              name: file.name,
              size: file.size,
              type: file.type
            })),
            user_id: user?.id || '',
            upload_result: result,
            timestamp: new Date().toISOString()
          };

          // Make POST request to n8n webhook
          const webhookResponse = await fetch('/api/webhook/n8n/payroll-processing', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload)
          });

          if (!webhookResponse.ok) {
            console.warn('N8N webhook call failed:', webhookResponse.statusText);
            // Don't fail the upload if webhook fails, just log it
          } else {
            console.log('N8N workflow triggered successfully');
          }
        } catch (webhookError) {
          console.warn('Error calling n8n webhook:', webhookError);
          // Don't fail the upload if webhook fails
        }

        toast({
          title: "Upload realizado com sucesso!",
          description: `${result.successful_files} arquivo(s) enviado(s) para processamento. O arquivo XLSX será baixado automaticamente quando o processamento for concluído.`,
        });

        // Clear form
        setSelectedFiles([]);
        setCompetencia('');
        setUploadProgress([]);
        
        // Refresh data
        await Promise.all([
          initializeData(),
          refreshProcessings()
        ]);
        
      } else if (result.partial_success) {
        setUploadStatus('completed');
        toast({
          title: "Upload parcialmente realizado",
          description: `${result.successful_files} de ${result.total_files} arquivo(s) processado(s)`,
          variant: "destructive",
        });
      } else {
        setUploadStatus('error');
        toast({
          title: "Erro no Upload",
          description: result.error || "Erro desconhecido durante o upload",
          variant: "destructive",
        });
      }
    } catch (error) {
      setUploadStatus('error');
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido durante o upload";
      
      console.error('PayrollSystem Error:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        context: 'upload'
      });

      // Verificar se é um erro específico do webhook n8n
      let userFriendlyMessage = errorMessage;
      let toastTitle = "Erro no Upload";
      
      if (errorMessage.includes('webhook n8n não está ativo')) {
        toastTitle = "Webhook N8N Inativo";
        userFriendlyMessage = "O workflow do N8N não está ativo. Verifique a configuração do workflow no N8N e certifique-se de que está ativo.";
      } else if (errorMessage.includes('Failed to fetch')) {
        toastTitle = "Erro de Conexão";
        userFriendlyMessage = "Erro de conexão com o servidor. Verifique sua conexão de internet e tente novamente.";
      } else if (errorMessage.includes('not registered')) {
        toastTitle = "Webhook Não Configurado";
        userFriendlyMessage = "O webhook do N8N não está configurado corretamente. Entre em contato com o administrador do sistema.";
      }

      toast({
        title: toastTitle,
        description: userFriendlyMessage,
        variant: "destructive",
      });
    }
  };

  // Load processing history with enhanced error handling
  const loadProcessingHistory = async () => {
    try {
      const history = await PayrollService.getProcessingHistory({ 
        page: 1, 
        limit: 10,
        search: searchTerm 
      });
      setProcessingHistory(history);
    } catch (error) {
      console.error('Error loading processing history:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de processamento",
        variant: "destructive",
      });
    }
  };

  // Test webhook connectivity
  const testWebhookConnection = async () => {
    try {
      const webhookUrl = 'https://n8n-lab-n8n.bjivvx.easypanel.host/webhook/processar-holerite';
      
      toast({
        title: "Testando Webhook N8N",
        description: "Verificando conectividade com o webhook...",
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString()
        }),
        signal: AbortSignal.timeout(10000) // 10 segundos timeout
      });

      if (response.ok) {
        toast({
          title: "✅ Webhook N8N Ativo",
          description: "O webhook está funcionando corretamente!",
        });
      } else {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        if (response.status === 404 && errorData.message?.includes('not registered')) {
          toast({
            title: "⚠️ Webhook N8N Inativo",
            description: "O workflow do N8N não está ativo. Ative o workflow no N8N para processar arquivos.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "❌ Erro no Webhook N8N",
            description: `Status: ${response.status} - ${errorData.message || response.statusText}`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "❌ Erro de Conexão",
        description: `Não foi possível conectar ao webhook N8N: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Status helpers
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
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

  // Escutar mudanças nos processamentos para detectar downloads automáticos
  useEffect(() => {
    if (activeProcessings.length > 0) {
      activeProcessings.forEach(processing => {
        // Verificar se o processamento foi concluído com sucesso
        if (processing.status === 'completed' && processing.progress === 100) {
          // Verificar se há dados de resposta do webhook indicando download
          const webhookResponse = processing.webhook_response as any;
          if (webhookResponse?.success && webhookResponse?.data?.arquivo?.urls?.excel_download) {
            toast({
              title: "Download automático concluído!",
              description: `O arquivo XLSX processado foi baixado automaticamente para sua pasta de downloads.`,
            });
          }
        }
      });
    }
  }, [activeProcessings, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando dados...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Holerites</h1>
          <p className="text-muted-foreground">
            Faça upload e processe holerites em lote com integração N8N
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={testWebhookConnection}
            disabled={isUploading}
          >
            <Zap className="w-4 h-4 mr-2" />
            Testar N8N
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Upload className="w-4 h-4 mr-2" />
            Novo Upload
          </Button>
        </div>
      </div>



      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload de Holerites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <select
                id="company"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                disabled={isUploading}
              >
                <option value="">Selecione uma empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="competencia">Competência (MM/AAAA)</Label>
              <Input
                id="competencia"
                type="text"
                placeholder="12/2024"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragState.isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Arraste arquivos PDF aqui
            </h3>
            <p className="text-muted-foreground mb-4">
              ou clique para selecionar arquivos
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Selecionar Arquivos
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Máximo {MAX_FILES} arquivos • {formatFileSize(MAX_FILE_SIZE)} por arquivo
            </p>
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
              <Label>Arquivos Selecionados</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
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
                      <span className="flex-1">{progress.filename}</span>
                      <div className="flex items-center gap-2">
                        <span>{progress.progress}%</span>
                        {progress.error_message && (
                          <span className="text-xs text-red-500">
                            {progress.error_message}
                          </span>
                        )}
                        {/* Botão de cancelar/excluir upload */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelUpload(progress.file_id)}
                          disabled={progress.status === 'completed'}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Cancelar upload"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={progress.progress} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <Button 
            onClick={handleUpload} 
            disabled={!selectedCompany || !competencia || selectedFiles.length === 0 || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Enviar {selectedFiles.length} arquivo(s)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Arquivos</p>
                <p className="text-2xl font-bold text-foreground">{stats.total_files}</p>
              </div>
              <FileText className="w-8 h-8 text-ai-green" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processados Este Mês</p>
                <p className="text-2xl font-bold text-foreground">{stats.files_this_month}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-ai-blue" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Processamento</p>
                <p className="text-2xl font-bold text-foreground">{stats.processing_files}</p>
              </div>
              <Clock className="w-8 h-8 text-ai-orange" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-foreground">{stats.success_rate}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-ai-green" />
            </div>
          </Card>
        </div>
      )}

      {/* Processing History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Processamentos</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="sm" onClick={loadProcessingHistory}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {processingHistory && processingHistory.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Arquivos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processingHistory.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.company_name}</TableCell>
                    <TableCell>{item.competency}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.files_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={getStatusColor(item.status)}>
                          {getStatusIcon(item.status)}
                        </span>
                        <span className="capitalize">{item.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(item.started_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.can_download && (
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum processamento encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
