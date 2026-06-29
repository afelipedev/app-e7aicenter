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
  Eye,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useActiveProcessings } from "@/hooks/useProcessingUpdates";
import { useErrorHandler, ValidationError, ProcessingError } from "@/utils/errorHandling";
import { useAuth } from '@/contexts/AuthContext';
import { PayrollService } from '@/services/payrollService';
import { CompanyService } from '@/services/companyService';
import {
  PayrollBatchUploadForm,
  createInitialUploadRows,
  type UploadRow,
} from '@/features/payroll/components/PayrollBatchUploadForm';
import { formatCompetenciaInput } from '@/features/payroll/utils/holeriteWebhook';
import type {
  Company,
  PayrollFile,
  PayrollBatchUploadData,
  PayrollStats,
  BatchUploadResult,
  ProcessingHistory,
  PaginatedResult,
} from '../../shared/types/payroll';

// Constants
const MAX_FILES = 12;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf'];
const REFRESH_INTERVAL = 5000; // 5 seconds for real-time updates

// Função para formatar máscara MM/AAAA
const formatCompetencia = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 6 dígitos (MMAAAA)
  const limitedNumbers = numbers.slice(0, 6);
  
  // Aplica a máscara MM/AAAA
  if (limitedNumbers.length <= 2) {
    return limitedNumbers;
  } else {
    return `${limitedNumbers.slice(0, 2)}/${limitedNumbers.slice(2)}`;
  }
};

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
  const [processingHistory, setProcessingHistory] = useState<PaginatedResult<ProcessingHistory> | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Enhanced upload state
  const [uploadRows, setUploadRows] = useState<UploadRow[]>(createInitialUploadRows);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
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

      const [companyData, filesData, statsData, historyData] = await Promise.all([
        CompanyService.getById(companyId),
        PayrollService.getByCompanyId(companyId),
        PayrollService.getStats(companyId),
        PayrollService.getProcessingHistory(
          { status: ['completed'], company_id: companyId },
          { field: 'started_at', direction: 'desc' },
          1,
          5
        )
      ]);

      setCompany(companyData);
      setPayrollFiles(filesData);
      setStats(statsData);
      setProcessingHistory(historyData);
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

  // Cancel/delete upload in progress
  const handleCancelUpload = async (fileId: string) => {
    try {
      // Validar se o ID é um UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(fileId)) {
        console.error('ID inválido para cancelamento:', fileId);
        toast({
          title: "Erro ao cancelar",
          description: "ID de processamento inválido. Aguarde alguns instantes e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      await cancelProcessing(fileId);
      toast({
        title: "Upload cancelado",
        description: "O processamento foi cancelado com sucesso",
      });
      // Atualizar lista de processamentos
      await refreshProcessings();
    } catch (error) {
      console.error('Erro ao cancelar upload:', error);
      toast({
        title: "Erro ao cancelar",
        description: error instanceof Error ? error.message : "Não foi possível cancelar o processamento",
        variant: "destructive",
      });
    }
  };

  const handleBatchUpload = async (uploadData: PayrollBatchUploadData) => {
    try {
      if (!companyId) {
        throw new ValidationError('ID da empresa não encontrado');
      }

      setUploadStatus('uploading');

      const result = await PayrollService.batchUpload({
        ...uploadData,
        company_id: companyId,
      });

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

      if (result.duplicate) {
        setUploadStatus('error');
        toast({
          title: "Processamento em andamento",
          description:
            "Este lote já está sendo processado. Aguarde a conclusão antes de reenviar.",
          variant: "destructive",
        });
        return;
      }

      if (result.success) {
        setUploadStatus('completed');

        const toastResult = toast({
          title: "Lote enviado com sucesso!",
          description: `${result.successful_files} holerite(s) enviado(s) ao N8N. Aguarde a conclusão ou consulte o histórico para baixar o Excel.`,
        });

        setTimeout(() => {
          toastResult?.dismiss?.();
        }, 5000);

        setUploadRows(createInitialUploadRows());

        await Promise.all([
          loadData(),
          refreshProcessings(),
          loadProcessingHistory(1),
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

  // Load processing history with pagination
  const loadProcessingHistory = async (page: number = currentPage) => {
    if (!companyId) return;
    
    try {
      const history = await PayrollService.getProcessingHistory(
        { status: ['completed'], company_id: companyId },
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
        const toastResult = toast({
          title: "Arquivo não disponível",
          description: "O arquivo Excel não está disponível para download",
          variant: "destructive",
        });
        setTimeout(() => {
          if (toastResult?.dismiss) {
            toastResult.dismiss();
          }
        }, 5000);
        return;
      }

      const filename = `holerite_${item.competency}_${item.company_name || 'processado'}.xlsx`;
      await PayrollService.downloadFile(item.result_file_url, filename);
      
      toast({
        title: "Download iniciado",
        description: "O download do arquivo Excel foi iniciado",
      });
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      const toastResult = toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo Excel",
        variant: "destructive",
      });
      setTimeout(() => {
        if (toastResult?.dismiss) {
          toastResult.dismiss();
        }
      }, 5000);
    }
  };

  // Download PDF file from processing history
  const handleDownloadPDF = async (processingId: string) => {
    try {
      const files = await PayrollService.getFilesByProcessingId(processingId);
      if (files.length === 0) {
        const toastResult = toast({
          title: "Arquivo não disponível",
          description: "Nenhum arquivo PDF encontrado para este processamento",
          variant: "destructive",
        });
        setTimeout(() => toastResult?.dismiss?.(), 5000);
        return;
      }

      // Resolve a URL do PDF original no S3: usa s3_url legado quando existir,
      // senão reconstrói a chave determinística salva pelo N8N.
      const downloads = files
        .map((file) => {
          const url =
            file.s3_url ||
            PayrollService.buildHoleritePdfUrl(company?.name, file.competencia, file.id);
          return url
            ? { url, filename: file.original_filename || file.filename }
            : null;
        })
        .filter((item): item is { url: string; filename: string } => item !== null);

      if (downloads.length === 0) {
        const toastResult = toast({
          title: "Arquivo não disponível",
          description: "Não foi possível localizar o PDF deste processamento no armazenamento.",
          variant: "destructive",
        });
        setTimeout(() => toastResult?.dismiss?.(), 5000);
        return;
      }

      // Baixa o PDF (download seguro via blob, mesmo fluxo do Excel) — um por arquivo do lote.
      for (const download of downloads) {
        await PayrollService.downloadFile(download.url, download.filename);
      }

      toast({
        title: "Download iniciado",
        description:
          downloads.length > 1
            ? `Download de ${downloads.length} arquivo(s) PDF iniciado`
            : "O download do arquivo PDF foi iniciado",
      });
    } catch (error) {
      console.error('Error downloading PDF file:', error);
      const toastResult = toast({
        title: "Erro no download",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível baixar o arquivo PDF",
        variant: "destructive",
      });
      setTimeout(() => toastResult?.dismiss?.(), 5000);
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Carregando dados...</span>
        </div>
      </div>
    );
  }

  // Show error state if there's a connectivity issue
  if (error && !isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Problema de Conectividade
          </h2>
          <p className="text-muted-foreground mb-6">
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Empresa não encontrada</h2>
          <button
            onClick={() => navigate('/companies')}
            className="text-primary hover:underline"
          >
            Voltar para lista de empresas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            onClick={() => navigate('/companies')}
            className="self-start p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg self-start sm:self-auto">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{company.name}</h1>
              <p className="text-sm sm:text-base text-muted-foreground break-all sm:break-normal">CNPJ: {CompanyService.formatCnpj(company.cnpj)}</p>
            </div>
          </div>
        </div>
      </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Esta Semana</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{stats.files_this_week}</p>
                </div>
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-ai-blue flex-shrink-0 ml-2" />
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Este Mês</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{stats.files_this_month}</p>
                </div>
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-ai-green flex-shrink-0 ml-2" />
              </div>
            </Card>

            <Card className="p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{stats.total_files}</p>
                </div>
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-ai-orange flex-shrink-0 ml-2" />
              </div>
            </Card>
          </div>
        )}

        <div className="space-y-4">
          <PayrollBatchUploadForm
            companyId={companyId || ''}
            companyName={company?.name}
            hideCompanySelector
            rows={uploadRows}
            onRowsChange={setUploadRows}
            onSubmit={handleBatchUpload}
            isUploading={uploadStatus === 'uploading'}
            maxFiles={MAX_FILES}
          />

          {uploadProgress.length > 0 && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base">Processamentos em andamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 sm:p-6">
                {uploadProgress.map((progress) => (
                  <div key={progress.file_id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm gap-2">
                      <span className="flex-1 truncate">{progress.filename}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span>{progress.progress}%</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelUpload(progress.file_id)}
                          disabled={progress.status === 'completed'}
                          className="h-6 w-6 p-0 text-red-500"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={progress.progress} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 sm:p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <span className="text-sm sm:text-base text-destructive break-words">{error}</span>
          </div>
        )}

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
                            <span className="text-green-600">
                              <CheckCircle className="w-4 h-4" />
                            </span>
                            <span>Concluído</span>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(item.started_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadPDF(item.id)}
                              title="Download PDF"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadExcel(item)}
                              disabled={!item.result_file_url}
                              title="Download Excel"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4 border border-border">
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-destructive/10 rounded-lg flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Confirmar Exclusão
                  </h3>
                </div>
              </div>

              <p className="text-sm sm:text-base text-muted-foreground mb-6 break-words">
                Tem certeza que deseja excluir o arquivo <strong className="break-all">{fileToDelete.filename}</strong>?
                Esta ação não pode ser desfeita.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 px-4 py-2 text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors order-2 sm:order-1"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 order-1 sm:order-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="hidden sm:inline">Excluindo...</span>
                      <span className="sm:hidden">...</span>
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