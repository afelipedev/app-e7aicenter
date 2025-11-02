import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  FileText, 
  Download, 
  RefreshCw,
  Calendar,
  Building2,
  User,
  Activity,
  Zap,
  Eye,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { PayrollService } from '../../services/payrollService';
import { useErrorHandler } from '../../utils/errorHandling';
import { ValidationError } from '../../utils/errorHandling';
import type { ProcessingStatus, ProcessingLog } from '../../../shared/types/payroll';

interface PayrollProcessingDetailsProps {
  processingId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PayrollProcessingDetails: React.FC<PayrollProcessingDetailsProps> = ({
  processingId,
  isOpen,
  onClose
}) => {
  const { toast } = useToast();
  const { handleError, handleAsync } = useErrorHandler();
  const [processing, setProcessing] = useState<ProcessingStatus | null>(null);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadProcessingDetails = async () => {
    setError(null);
    
    const { result, error: loadError } = await handleAsync(async () => {
      const [processingData, logsData] = await Promise.all([
        PayrollService.getProcessingStatus(processingId),
        PayrollService.getProcessingLogs(processingId)
      ]);
      
      return { processingData, logsData };
    }, 'processing_details_load');

    if (loadError) {
      setError(loadError.message);
    } else {
      setProcessing(result.processingData);
      setLogs(result.logsData);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (!isOpen || !processingId) return;

    loadProcessingDetails();

    // Auto-refresh every 3 seconds if processing is active
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh && processing?.status === 'processing') {
      interval = setInterval(loadProcessingDetails, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, processingId, autoRefresh, processing?.status]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs}s`;
    }
    return `${diffSecs}s`;
  };

  const handleDownloadResults = async () => {
    try {
      if (!processing?.result_url) {
        throw new ValidationError('Arquivo de resultados não disponível para download');
      }

      const { result: url, error } = await handleAsync(
        () => PayrollService.getDownloadUrl(processing.result_url!),
        'results_download'
      );

      if (error) return;

      const link = document.createElement('a');
      link.href = url;
      link.download = `processamento_${processing.competency}_${processing.id}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download iniciado",
        description: "O download dos resultados foi iniciado",
      });
    } catch (error) {
      handleError(error, 'results_download');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Detalhes do Processamento
              </h2>
              <p className="text-sm text-gray-600">
                ID: {processingId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadProcessingDetails}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-600">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>Carregando detalhes...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={loadProcessingDetails}>
                  Tentar novamente
                </Button>
              </div>
            </div>
          ) : processing ? (
            <div className="space-y-6">
              {/* Processing Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Visão Geral
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Empresa</span>
                      </div>
                      <p className="font-medium">{processing.company_name}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Competência</span>
                      </div>
                      <p className="font-medium">{processing.competency}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Arquivos</span>
                      </div>
                      <p className="font-medium">{processing.files_count} arquivo(s)</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Duração</span>
                      </div>
                      <p className="font-medium">
                        {formatDuration(processing.created_at, processing.completed_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status and Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Status e Progresso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(processing.status)}
                        <Badge className={getStatusColor(processing.status)}>
                          {processing.status === 'completed' ? 'Concluído' :
                           processing.status === 'processing' ? 'Processando' :
                           processing.status === 'error' ? 'Erro' :
                           processing.status === 'partial' ? 'Parcial' : processing.status}
                        </Badge>
                      </div>
                      
                      {processing.result_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadResults}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar Resultados
                        </Button>
                      )}
                    </div>
                    
                    {processing.progress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progresso</span>
                          <span>{processing.progress}%</span>
                        </div>
                        <Progress value={processing.progress} />
                      </div>
                    )}
                    
                    {processing.estimated_completion_time && (
                      <div className="text-sm text-gray-600">
                        Tempo estimado: {processing.estimated_completion_time}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Processing Logs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Logs de Processamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum log disponível
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {logs.map((log, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          {getLogIcon(log.level)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {log.message}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(log.timestamp)}
                              </span>
                            </div>
                            {log.details && (
                              <p className="text-sm text-gray-600">{log.details}</p>
                            )}
                            {log.file_name && (
                              <div className="flex items-center gap-1 mt-1">
                                <FileText className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">{log.file_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Processing Statistics */}
              {processing.statistics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Estatísticas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {processing.statistics.successful_files || 0}
                        </div>
                        <div className="text-sm text-green-700">Sucessos</div>
                      </div>
                      
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {processing.statistics.failed_files || 0}
                        </div>
                        <div className="text-sm text-red-700">Falhas</div>
                      </div>
                      
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {processing.statistics.total_records || 0}
                        </div>
                        <div className="text-sm text-blue-700">Registros</div>
                      </div>
                      
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {processing.statistics.processing_time || '0s'}
                        </div>
                        <div className="text-sm text-purple-700">Tempo</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Processamento não encontrado
            </div>
          )}
        </div>
      </div>
    </div>
  );
};