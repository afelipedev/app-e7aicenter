import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  FileText, 
  Download, 
  Filter, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  Eye,
  Trash2,
  Search,
  Calendar,
  Building2,
  TrendingUp,
  Activity,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PayrollService } from "@/services/payrollService";
import { toast } from "@/hooks/use-toast";
import type {
  CompanyOption,
  BatchUploadData,
  BatchUploadResult,
  FileValidationResult,
  UploadProgress,
  DragDropState,
  EnhancedPayrollStats,
  ProcessingHistory,
  ProcessingFilters,
  ProcessingSort,
  PaginatedResult,
  PayrollProcessing,
  ProcessingStatus
} from "../../../shared/types/payroll";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf'];

export default function Payroll() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'completed' | 'error'>('idle');
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState<EnhancedPayrollStats | null>(null);
  const [processingHistory, setProcessingHistory] = useState<PaginatedResult<ProcessingHistory> | null>(null);
  const [currentProcessings, setCurrentProcessings] = useState<ProcessingHistory[]>([]);
  const [filters, setFilters] = useState<ProcessingFilters>({});
  const [sort, setSort] = useState<ProcessingSort>({ field: 'started_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          loadCompanies(),
          loadStats(),
          loadProcessingHistory(),
          loadCurrentProcessings()
        ]);
      } catch (error) {
        console.error('Error initializing payroll data:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados iniciais",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      initializeData();
    }
  }, [user]);

  // Auto-refresh current processings
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentProcessings.some(p => ['pending', 'processing'].includes(p.status))) {
        loadCurrentProcessings();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [currentProcessings]);

  // Load companies
  const loadCompanies = async () => {
    try {
      const companiesData = await PayrollService.getCompanies();
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error loading companies:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar empresas",
        variant: "destructive"
      });
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const statsData = await PayrollService.getEnhancedStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Load processing history
  const loadProcessingHistory = async () => {
    try {
      const historyData = await PayrollService.getProcessingHistory(
        filters,
        sort,
        currentPage,
        10
      );
      setProcessingHistory(historyData);
    } catch (error) {
      console.error('Error loading processing history:', error);
    }
  };

  // Load current processings
  const loadCurrentProcessings = async () => {
    try {
      const processings = await PayrollService.getProcessingHistory(
        { status: ['pending', 'processing'] },
        { field: 'started_at', direction: 'desc' },
        1,
        5
      );
      setCurrentProcessings(processings.data);
    } catch (error) {
      console.error('Error loading current processings:', error);
    }
  };

  // File validation
  const validateFile = (file: File): FileValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push('Apenas arquivos PDF são permitidos');
    }

    if (file.size > MAX_FILE_SIZE) {
      errors.push(`Arquivo muito grande. Máximo: ${formatFileSize(MAX_FILE_SIZE)}`);
    }

    if (file.size === 0) {
      errors.push('Arquivo vazio');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      file
    };
  };

  // Validate competencia format
  const validateCompetencia = (value: string): boolean => {
    const regex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    if (!regex.test(value)) return false;
    
    const [month, year] = value.split('/');
    const currentYear = new Date().getFullYear();
    return parseInt(year) <= currentYear;
  };

  // Handle file selection
  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (selectedFiles.length + fileArray.length > MAX_FILES) {
      toast({
        title: "Limite excedido",
        description: `Máximo de ${MAX_FILES} arquivos permitidos`,
        variant: "destructive"
      });
      return;
    }

    const validationResults = fileArray.map(validateFile);
    const validFiles = validationResults.filter(r => r.isValid).map(r => r.file);
    const invalidFiles = validationResults.filter(r => !r.isValid);

    if (invalidFiles.length > 0) {
      invalidFiles.forEach(result => {
        toast({
          title: `Erro no arquivo: ${result.file.name}`,
          description: result.errors.join(', '),
          variant: "destructive"
        });
      });
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState(prev => ({ 
      ...prev,
      isDragOver: true, 
      isDragActive: true 
    }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState(prev => ({ 
      ...prev,
      isDragOver: false, 
      isDragActive: false 
    }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState(prev => ({ 
      ...prev,
      isDragOver: false, 
      isDragActive: false 
    }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState(prev => ({ 
      ...prev,
      isDragOver: false, 
      isDragActive: false 
    }));

    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  }, []);

  // Remove file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedCompany || !competencia || selectedFiles.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione empresa, competência e pelo menos um arquivo",
        variant: "destructive"
      });
      return;
    }

    if (!validateCompetencia(competencia)) {
      toast({
        title: "Competência inválida",
        description: "Use o formato MM/AAAA (ex: 01/2025)",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Initialize progress tracking with correct UploadProgress type
      const initialProgress: UploadProgress[] = selectedFiles.map((file, index) => ({
        file_id: `temp-${index}`,
        filename: file.name,
        progress: 0,
        status: 'uploading'
      }));
      setUploadProgress(initialProgress);

      const batchData: BatchUploadData = {
        files: selectedFiles,
        company_id: selectedCompany,
        competencia
      };

      // Start batch upload (without callback since it doesn't support it)
      const result: BatchUploadResult = await PayrollService.batchUpload(batchData);

      // Check if upload was successful based on failed_uploads
      if (result.failed_uploads === 0) {
        toast({
          title: "Upload concluído",
          description: `${result.successful_uploads} arquivos enviados com sucesso`,
        });

        // Reset form
        setSelectedFiles([]);
        setUploadProgress([]);
        setSelectedCompany('');
        setCompetencia('');

        // Refresh data
        await Promise.all([
          loadStats(),
          loadProcessingHistory(),
          loadCurrentProcessings()
        ]);
      } else {
        toast({
          title: "Upload parcialmente concluído",
          description: `${result.successful_uploads} sucessos, ${result.failed_files.length} erros`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: "Erro ao enviar arquivos. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  // Get status icon
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestão de Holerites</h1>
          <p className="text-muted-foreground">
            Upload e processamento inteligente de folhas de pagamento
          </p>
        </div>
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          className="gap-2"
          disabled={isUploading}
        >
          <Upload className="w-4 h-4" />
          Novo Upload
        </Button>
      </div>

      {/* Current Processing Status */}
      {currentProcessings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Processamentos em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentProcessings.map((processing) => (
              <div key={processing.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(processing.status)}
                  <div>
                    <p className="font-medium">{processing.company_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {processing.competencia} • {processing.total_files} arquivos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {processing.processed_files}/{processing.total_files}
                    </p>
                    <Progress 
                      value={(processing.processed_files / processing.total_files) * 100} 
                      className="w-24"
                    />
                  </div>
                  <Badge variant={getStatusBadgeVariant(processing.status)}>
                    {processing.status === 'processing' ? 'Processando' : 
                     processing.status === 'completed' ? 'Concluído' : 
                     processing.status === 'error' ? 'Erro' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload de Holerites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Empresa *</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="competencia">Competência (MM/AAAA) *</Label>
              <Input
                id="competencia"
                type="text"
                placeholder="01/2025"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                maxLength={7}
              />
            </div>
          </div>

          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragState.isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-foreground font-medium mb-1">
              Clique para fazer upload ou arraste os arquivos
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Formatos aceitos: PDF • Máximo: {MAX_FILES} arquivos de {MAX_FILE_SIZE / 1024 / 1024}MB cada
            </p>
            {selectedFiles.length > 0 && (
              <p className="text-xs text-primary">
                {selectedFiles.length} arquivo(s) selecionado(s)
              </p>
            )}
          </div>

          {/* Hidden File Input */}
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
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
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
                      <span>{progress.filename}</span>
                      <span>{progress.progress}%</span>
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
