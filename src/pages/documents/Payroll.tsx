import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useActiveProcessings } from "@/hooks/useProcessingUpdates";
import { 
  FileText, 
  X, 
  Loader2, 
  Clock, 
  CheckCircle, 
  Search, 
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { PayrollService } from '@/services/payrollService';
import {
  PayrollBatchUploadForm,
  createInitialUploadRows,
  type UploadRow,
} from '@/features/payroll/components/PayrollBatchUploadForm';
import {
  formatCompetenciaInput,
  isHoleriteProcessingComplete,
  resolveHoleriteDownloadUrl,
} from '@/features/payroll/utils/holeriteWebhook';
import type {
  PayrollBatchUploadData,
  ProcessingHistory,
  UploadProgress,
  CompanyOption,
  BatchUploadResult,
  EnhancedPayrollStats,
  PaginatedResult,
  ProcessingFilters,
} from '../../../shared/types/payroll';
import type { Company } from '../../../shared/types/company';

export default function Payroll() {
  const { toast } = useToast();

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
  const [uploadRows, setUploadRows] = useState<UploadRow[]>(createInitialUploadRows);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [stats, setStats] = useState<EnhancedPayrollStats | null>(null);
  const [processingHistory, setProcessingHistory] = useState<PaginatedResult<ProcessingHistory> | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [historyCompanyFilter, setHistoryCompanyFilter] = useState<string>('');
  const [historyCompetenciaFilter, setHistoryCompetenciaFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUploadResult, setLastUploadResult] = useState<BatchUploadResult | null>(null);

  const buildCompletedHistoryFilters = useCallback((
    companyId: string = historyCompanyFilter,
    competency: string = historyCompetenciaFilter
  ): ProcessingFilters => {
    const filters: ProcessingFilters = { status: ['completed'] };

    if (companyId) {
      filters.company_id = companyId;
    }

    if (competency) {
      filters.competency = competency;
    }

    return filters;
  }, [historyCompanyFilter, historyCompetenciaFilter]);

  // Initialize data
  const initializeData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [companiesData, statsData, historyData] = await Promise.all([
        PayrollService.getCompanies(),
        PayrollService.getEnhancedStats(),
        PayrollService.getProcessingHistory(
          buildCompletedHistoryFilters(),
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
  }, [toast, buildCompletedHistoryFilters]);

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
      setUploadStatus('uploading');

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
          description: `${result.successful_files} holerite(s) enviado(s) ao N8N. O processamento pode levar vários minutos; o Excel será baixado automaticamente ao concluir ou estará no histórico.`,
        });

        setTimeout(() => {
          toastResult?.dismiss?.();
        }, 5000);

        setUploadRows(createInitialUploadRows());
        setUploadProgress([]);

        await Promise.all([initializeData(), refreshProcessings()]);
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
  const loadProcessingHistory = async (
    page: number = currentPage,
    customFilters?: { companyId?: string; competency?: string }
  ) => {
    try {
      const history = await PayrollService.getProcessingHistory(
        buildCompletedHistoryFilters(customFilters?.companyId, customFilters?.competency),
        { field: 'started_at', direction: 'desc' },
        page,
        5 // 5 itens por página
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

  const handleHistoryCompetenciaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHistoryCompetenciaFilter(formatCompetenciaInput(e.target.value));
  };

  const applyHistoryFilters = () => {
    loadProcessingHistory(1);
  };

  const clearHistoryFilters = () => {
    setHistoryCompanyFilter('');
    setHistoryCompetenciaFilter('');
    loadProcessingHistory(1, { companyId: '', competency: '' });
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

      // Use the PayrollService downloadFile method
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
        setTimeout(() => {
          if (toastResult?.dismiss) {
            toastResult.dismiss();
          }
        }, 5000);
        return;
      }

      // Baixar o primeiro arquivo PDF (ou todos se necessário)
      const fileWithS3 = files.find(f => f.s3_url);
      if (!fileWithS3 || !fileWithS3.s3_url) {
        const toastResult = toast({
          title: "Arquivo não disponível",
          description: "O arquivo PDF não está disponível para download",
          variant: "destructive",
        });
        setTimeout(() => {
          if (toastResult?.dismiss) {
            toastResult.dismiss();
          }
        }, 5000);
        return;
      }

      // Fazer download do PDF
      const link = document.createElement('a');
      link.href = fileWithS3.s3_url;
      link.download = fileWithS3.filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download iniciado",
        description: "O download do arquivo PDF foi iniciado",
      });
    } catch (error) {
      console.error('Error downloading PDF file:', error);
      const toastResult = toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo PDF",
        variant: "destructive",
      });
      setTimeout(() => {
        if (toastResult?.dismiss) {
          toastResult.dismiss();
        }
      }, 5000);
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

  const isUploading = uploadStatus === 'uploading';

  useEffect(() => {
    activeProcessings.forEach((processing) => {
      if (processing.status === 'completed' && processing.progress === 100) {
        const webhookResponse = processing.webhook_response;
        if (isHoleriteProcessingComplete(webhookResponse) && resolveHoleriteDownloadUrl(webhookResponse)) {
          toast({
            title: "Download automático concluído!",
            description:
              "O XLSX consolidado foi baixado automaticamente para sua pasta de downloads.",
          });
        }
      }
    });
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

      </div>



      <PayrollBatchUploadForm
        companies={companies}
        companyId={selectedCompany}
        onCompanyChange={setSelectedCompany}
        rows={uploadRows}
        onRowsChange={setUploadRows}
        onSubmit={handleBatchUpload}
        isUploading={isUploading}
      />

      {uploadProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processamentos em andamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {uploadProgress.map((progress) => (
              <div key={progress.file_id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex-1">{progress.filename}</span>
                  <div className="flex items-center gap-2">
                    <span>{progress.progress}%</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelUpload(progress.file_id)}
                      disabled={progress.status === 'completed'}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Cancelar processamento"
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



      {/* Processing History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Processamentos (Concluídos)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="history-company-filter">Empresa</Label>
              <select
                id="history-company-filter"
                value={historyCompanyFilter}
                onChange={(e) => setHistoryCompanyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Todas as empresas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="history-competencia-filter">Competência</Label>
              <Input
                id="history-competencia-filter"
                type="text"
                placeholder="MM/AAAA"
                value={historyCompetenciaFilter}
                onChange={handleHistoryCompetenciaChange}
                maxLength={7}
                className="h-[38px]"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={applyHistoryFilters}
                className="w-full md:w-auto md:w-10"
                size="icon"
                aria-label="Buscar histórico"
                title="Buscar histórico"
              >
                <Search className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={clearHistoryFilters} className="w-full md:w-auto">
                Limpar
              </Button>
            </div>
          </div>

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
                          <span className={getStatusColor(item.status)}>
                            {getStatusIcon(item.status)}
                          </span>
                          <span>{getStatusText(item.status)}</span>
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
    </div>
  );
}
