import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Pause, 
  Play, 
  RefreshCw,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader,
  Eye,
  Download
} from "lucide-react";
import { PayrollService } from "@/services/payrollService";
import { useToast } from "@/hooks/use-toast";
import type { ProcessingStatus } from "@/shared/types/payroll";

interface RealTimeStatusTrackerProps {
  processingIds: string[];
  onStatusUpdate?: (processingId: string, status: ProcessingStatus) => void;
  onViewDetails?: (processingId: string) => void;
  onDownload?: (processingId: string) => void;
  refreshInterval?: number;
}

export function RealTimeStatusTracker({
  processingIds,
  onStatusUpdate,
  onViewDetails,
  onDownload,
  refreshInterval = 5000
}: RealTimeStatusTrackerProps) {
  const [statuses, setStatuses] = useState<Record<string, ProcessingStatus>>({});
  const [isTracking, setIsTracking] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchStatuses = useCallback(async () => {
    if (!isTracking || processingIds.length === 0) return;

    setLoading(true);
    try {
      const statusPromises = processingIds.map(async (id) => {
        const status = await PayrollService.getProcessingStatus(id);
        return { id, status };
      });

      const results = await Promise.all(statusPromises);
      const newStatuses: Record<string, ProcessingStatus> = {};

      results.forEach(({ id, status }) => {
        newStatuses[id] = status;
        
        // Check for status changes
        const oldStatus = statuses[id];
        if (oldStatus && oldStatus.status !== status.status) {
          // Notify about status change
          if (status.status === 'completed') {
            toast({
              title: "Processamento Concluído",
              description: `O processamento ${id.slice(0, 8)}... foi concluído com sucesso.`,
            });
          } else if (status.status === 'error') {
            toast({
              title: "Erro no Processamento",
              description: `O processamento ${id.slice(0, 8)}... encontrou um erro.`,
              variant: "destructive",
            });
          }
        }

        // Call external status update handler
        if (onStatusUpdate) {
          onStatusUpdate(id, status);
        }
      });

      setStatuses(newStatuses);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching processing statuses:', error);
      toast({
        title: "Erro ao Atualizar Status",
        description: "Não foi possível atualizar o status dos processamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [processingIds, isTracking, statuses, onStatusUpdate, toast]);

  // Auto-refresh effect
  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(fetchStatuses, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStatuses, refreshInterval, isTracking]);

  // Initial fetch
  useEffect(() => {
    fetchStatuses();
  }, [processingIds]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-green-600">Concluído</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-blue-600">Processando</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600">Pendente</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const activeProcessings = Object.values(statuses).filter(
    status => status.status === 'processing' || status.status === 'pending'
  );

  if (processingIds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Nenhum processamento ativo para monitorar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Status em Tempo Real
            {activeProcessings.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {activeProcessings.length} ativo(s)
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTracking(!isTracking)}
            >
              {isTracking ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Retomar
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStatuses}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          Última atualização: {formatTime(lastUpdate)}
          {isTracking && (
            <span className="ml-2">
              • Atualizando a cada {refreshInterval / 1000}s
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {Object.entries(statuses).map(([processingId, status]) => (
          <div
            key={processingId}
            className="border rounded-lg p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(status.status)}
                <span className="font-medium text-sm">
                  {processingId.slice(0, 8)}...
                </span>
                {getStatusBadge(status.status)}
              </div>
              
              <div className="flex items-center gap-1">
                {onViewDetails && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(processingId)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                {status.status === 'completed' && onDownload && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload(processingId)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Progress */}
            {(status.status === 'processing' || status.status === 'pending') && (
              <div className="space-y-2">
                <Progress value={status.progress || 0} className="h-2" />
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{Math.round(status.progress || 0)}% concluído</span>
                  {status.estimatedTimeRemaining && (
                    <span>
                      Tempo restante: {formatDuration(status.estimatedTimeRemaining)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Current Step */}
            {status.currentStep && (
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-3 h-3 text-blue-500" />
                <span className="text-gray-600">{status.currentStep}</span>
              </div>
            )}

            {/* Files Progress */}
            {status.filesProcessed !== undefined && status.totalFiles !== undefined && (
              <div className="text-sm text-gray-600">
                Arquivos: {status.filesProcessed} de {status.totalFiles} processados
              </div>
            )}

            {/* Error Message */}
            {status.status === 'error' && status.error && (
              <div className="p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4" />
                  <span>{status.error}</span>
                </div>
              </div>
            )}

            {/* Completion Info */}
            {status.status === 'completed' && (
              <div className="p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    Processamento concluído com sucesso
                    {status.completedAt && (
                      <span className="ml-1">
                        em {formatTime(new Date(status.completedAt))}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Summary */}
        {Object.keys(statuses).length > 1 && (
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {Object.values(statuses).filter(s => s.status === 'completed').length}
                </div>
                <div className="text-xs text-gray-500">Concluídos</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-600">
                  {Object.values(statuses).filter(s => s.status === 'processing').length}
                </div>
                <div className="text-xs text-gray-500">Processando</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-yellow-600">
                  {Object.values(statuses).filter(s => s.status === 'pending').length}
                </div>
                <div className="text-xs text-gray-500">Pendentes</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-red-600">
                  {Object.values(statuses).filter(s => s.status === 'error').length}
                </div>
                <div className="text-xs text-gray-500">Erros</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}