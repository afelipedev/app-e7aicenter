import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ValidationError } from "@/utils/errorHandling";
import { 
  Upload, 
  FileText, 
  X, 
  Loader2, 
  Clock, 
  CheckCircle, 
  Search, 
  RefreshCw, 
  Download, 
  AlertCircle,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SpedService } from '@/services/spedService';
import type { 
  SpedUploadData, 
  EnhancedSpedStats, 
  ProcessingHistory, 
  UploadProgress,
  DragDropState,
  CompanyOption,
  BatchSpedUploadResult,
  ProcessingStatus,
  PaginatedResult,
  SpedType
} from '../../../shared/types/sped';

// Constants
const MAX_FILES = 12; // Máximo de 12 arquivos conforme validação do n8n
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['text/plain'];

// Função para formatar máscara MM/AAAA
const formatCompetencia = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  const limitedNumbers = numbers.slice(0, 6);
  
  if (limitedNumbers.length <= 2) {
    return limitedNumbers;
  } else {
    return `${limitedNumbers.slice(0, 2)}/${limitedNumbers.slice(2)}`;
  }
};

export default function Sped() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [spedType, setSpedType] = useState<SpedType>('SPED ICMS IPI');
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
  const [stats, setStats] = useState<EnhancedSpedStats | null>(null);
  const [processingHistory, setProcessingHistory] = useState<PaginatedResult<ProcessingHistory> | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUploadResult, setLastUploadResult] = useState<BatchSpedUploadResult | null>(null);

  // Initialize data
  const initializeData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [companiesData, statsData, historyData] = await Promise.all([
        SpedService.getCompanies(),
        SpedService.getEnhancedStats(),
        SpedService.getProcessingHistory(
          { status: ['completed'] },
          { field: 'started_at', direction: 'desc' },
          1,
          5
        )
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

  // Initialize component
  useEffect(() => {
    initializeData();
  }, []);

  // Handle competencia input with mask
  const handleCompetenciaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCompetencia(e.target.value);
    setCompetencia(formattedValue);
  };

  // Competencia validation
  const validateCompetencia = (comp: string): boolean => {
    const regex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    if (!regex.test(comp)) return false;
    
    const [month, year] = comp.split('/').map(Number);
    const currentYear = new Date().getFullYear();
    
    return year >= 2020 && year <= currentYear + 1;
  };

  // Local validation functions
  const validateSingleFile = (file: File) => {
    if (!file) {
      throw new ValidationError('Nenhum arquivo selecionado');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError(
        `Arquivo muito grande. Tamanho máximo: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
      );
    }

    if (!file.name.toLowerCase().endsWith('.txt')) {
      throw new ValidationError(
        'Tipo de arquivo não suportado. Apenas arquivos TXT são aceitos.'
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
      
      validateFileBatch([...selectedFiles, ...fileArray]);
      
      const validFiles: File[] = [];
      const errors: string[] = [];

      fileArray.forEach(file => {
        try {
          validateSingleFile(file);
          
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

      if (errors.length > 0) {
        toast({
          title: "Alguns arquivos não foram adicionados",
          description: errors.slice(0, 3).join(', ') + (errors.length > 3 ? '...' : ''),
          variant: "destructive",
        });
      }

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

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedCompany || !competencia || selectedFiles.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione uma empresa, tipo de SPED, competência e pelo menos um arquivo",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadStatus('uploading');
      
      try {
        if (selectedFiles.length === 0) {
          throw new Error('Nenhum arquivo selecionado para upload');
        }

        if (selectedFiles.length > MAX_FILES) {
          throw new Error(`Muitos arquivos selecionados. Máximo: ${MAX_FILES} arquivos`);
        }

        selectedFiles.forEach((file) => {
          if (!file) {
            throw new Error('Arquivo inválido encontrado');
          }

          if (file.size > MAX_FILE_SIZE) {
            throw new Error(
              `Arquivo ${file.name} muito grande. Tamanho máximo: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
            );
          }

          if (!file.name.toLowerCase().endsWith('.txt')) {
            throw new Error(
              `Arquivo ${file.name}: Tipo não suportado. Apenas arquivos TXT são aceitos.`
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

      const uploadData: SpedUploadData = {
        company_id: selectedCompany,
        sped_type: spedType,
        competencia,
        files: selectedFiles,
      };

      const result = await SpedService.batchUpload(uploadData);

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
        
        toast({
          title: "Upload realizado com sucesso!",
          description: `${result.successful_files} arquivo(s) enviado(s) para processamento. O arquivo XLSX será baixado automaticamente quando o processamento for concluído.`,
        });

        // Clear form
        setSelectedFiles([]);
        setCompetencia('');
        setUploadProgress([]);
        
        // Refresh data
        await initializeData();
        
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
      
      console.error('SpedSystem Error:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        context: 'upload'
      });

      let userFriendlyMessage = errorMessage;
      let toastTitle = "Erro no Upload";
      
      // Verificar se é erro de variável de ambiente não configurada
      if (errorMessage.includes('VITE_N8N_WEBHOOK_SPED não configurado') || 
          errorMessage.includes('VITE_N8N_WEBHOOK_SPED')) {
        toastTitle = "Configuração Necessária";
        userFriendlyMessage = "A variável VITE_N8N_WEBHOOK_SPED não está configurada. Adicione-a ao arquivo .env e reinicie o servidor. Veja CONFIGURAR_SPED_ENV.md para mais detalhes.";
      } else if (errorMessage.includes('webhook n8n não está ativo')) {
        toastTitle = "Webhook N8N Inativo";
        userFriendlyMessage = "O workflow do N8N não está ativo. Verifique a configuração do workflow no N8N e certifique-se de que está ativo.";
      } else if (errorMessage.includes('There was a problem executing the workflow')) {
        toastTitle = "Falha no Workflow N8N";
        userFriendlyMessage =
          "O N8N recebeu a requisição, mas o workflow falhou ao executar (erro 500). " +
          "Isso normalmente indica problema em alguma etapa/branch do workflow para o tipo enviado (ex.: CONTRIBUICOES). " +
          "Abra o N8N → Executions desse webhook e veja o node que falhou. O app agora envia headers X-Processing-Id e X-Sped-Type para facilitar a busca.";
      } else if (errorMessage.includes('Failed to fetch')) {
        toastTitle = "Erro de Conexão";
        userFriendlyMessage = "Erro de conexão com o servidor. Verifique sua conexão de internet e tente novamente.";
      }

      toast({
        title: toastTitle,
        description: userFriendlyMessage,
        variant: "destructive",
        duration: 10000, // Mostrar por 10 segundos para erros de configuração
      });
    }
  };

  // Load processing history
  const loadProcessingHistory = async (page: number = currentPage) => {
    try {
      const history = await SpedService.getProcessingHistory(
        { status: ['completed'] },
        { field: 'started_at', direction: 'desc' },
        page,
        5
      );
      setProcessingHistory(history);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading processing history:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de processamento",
        variant: "destructive",
      });
    }
  };

  // Download Excel file from processing history
  const handleDownloadExcel = async (item: ProcessingHistory) => {
    try {
      if (!item.result_file_url) {
        toast({
          title: "Arquivo não disponível",
          description: "O arquivo Excel não está disponível para download",
          variant: "destructive",
        });
        return;
      }

      const filename = `sped_${item.competency}_${item.company_name || 'processado'}.xlsx`;
      await SpedService.downloadFile(item.result_file_url, filename);
      
      toast({
        title: "Download iniciado",
        description: "O download do arquivo Excel foi iniciado",
      });
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo Excel",
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'processing': return 'Processando';
      case 'failed': return 'Falhou';
      case 'pending': return 'Pendente';
      default: return status;
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
          <h1 className="text-3xl font-bold">Gestão de SPEDs</h1>
          <p className="text-muted-foreground">
            Faça upload e processe arquivos SPED em lote com integração N8N
          </p>
        </div>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload de SPEDs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company, SPED Type and Competencia Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spedType">Tipo de SPED</Label>
              <select
                id="spedType"
                value={spedType}
                onChange={(e) => setSpedType(e.target.value as SpedType)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                disabled={isUploading}
              >
                <option value="SPED ICMS IPI">SPED ICMS IPI</option>
                <option value="SPED Contribuições">SPED Contribuições</option>
              </select>
            </div>

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
                onChange={handleCompetenciaChange}
                disabled={isUploading}
                maxLength={7}
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
              Arraste arquivos TXT aqui
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
            accept=".txt"
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
                      <FileText className="w-4 h-4 text-blue-500" />
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

      {/* Processing History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Processamentos (Concluídos)</CardTitle>
        </CardHeader>
        <CardContent>
          {processingHistory && processingHistory.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Tipo SPED</TableHead>
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
                      <TableCell>
                        <Badge variant="outline">{item.sped_type}</Badge>
                      </TableCell>
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
                          <span>{getStatusText(item.status)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(item.started_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadExcel(item)}
                          disabled={!item.result_file_url}
                          title="Download Excel"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Paginação */}
              {processingHistory.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {processingHistory.page} de {processingHistory.total_pages} 
                    ({processingHistory.total} processamentos)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadProcessingHistory(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadProcessingHistory(currentPage + 1)}
                      disabled={currentPage >= processingHistory.total_pages}
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum processamento concluído encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
