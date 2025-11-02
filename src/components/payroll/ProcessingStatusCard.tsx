import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  Download,
  RefreshCw,
  Pause,
  Play,
  X
} from "lucide-react";
import { PayrollService } from "@/services/payrollService";
import { toast } from "@/hooks/use-toast";
import type {
  PayrollProcessing,
  ProcessingStatus
} from "@/shared/types/payroll";

interface ProcessingStatusCardProps {
  processing: PayrollProcessing;
  onViewDetails: (processingId: string) => void;
  onRefresh: () => void;
  showActions?: boolean;
}

export function ProcessingStatusCard({ 
  processing, 
  onViewDetails, 
  onRefresh,
  showActions = true 
}: ProcessingStatusCardProps) {
  const [currentProcessing, setCurrentProcessing] = useState(processing);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setCurrentProcessing(processing);
  }, [processing]);

  // Auto-refresh for active processings
  useEffect(() => {
    if (['pending', 'processing'].includes(currentProcessing.status)) {
      const interval = setInterval(async () => {
        try {
          const updated = await PayrollService.getProcessingById(currentProcessing.id);
          setCurrentProcessing(updated);
          onRefresh();
        } catch (error) {
          console.error('Error refreshing processing status:', error);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [currentProcessing.status, currentProcessing.id, onRefresh]);

  const getStatusIcon = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing': return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusText = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'processing': return 'Processando';
      case 'error': return 'Erro';
      default: return 'Pendente';
    }
  };

  const getProgressColor = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const updated = await PayrollService.getProcessingById(currentProcessing.id);
      setCurrentProcessing(updated);
      onRefresh();
    } catch (error) {
      console.error('Error refreshing processing:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do processamento",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const downloadExcel = async () => {
    if (!currentProcessing.excel_url) return;
    
    try {
      window.open(currentProcessing.excel_url, '_blank');
      toast({
        title: "Download iniciado",
        description: "O arquivo Excel está sendo baixado",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao baixar arquivo Excel",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const calculateProgress = () => {
    if (currentProcessing.total_files === 0) return 0;
    return Math.round((currentProcessing.processed_files / currentProcessing.total_files) * 100);
  };

  const getEstimatedTime = () => {
    if (currentProcessing.status !== 'processing') return null;
    
    const remainingFiles = currentProcessing.total_files - currentProcessing.processed_files;
    if (remainingFiles === 0) return null;
    
    // Estimate 30 seconds per file (this could be more sophisticated)
    const estimatedMinutes = Math.ceil((remainingFiles * 30) / 60);
    return estimatedMinutes;
  };

  const estimatedTime = getEstimatedTime();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(currentProcessing.status)}
            <div>
              <CardTitle className="text-lg">
                {currentProcessing.company_name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {currentProcessing.competencia} • ID: {currentProcessing.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(currentProcessing.status)}>
            {getStatusText(currentProcessing.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Progresso</span>
            <span className="text-muted-foreground">
              {currentProcessing.processed_files}/{currentProcessing.total_files} arquivos
            </span>
          </div>
          <Progress 
            value={calculateProgress()} 
            className="h-2"
          />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{calculateProgress()}% concluído</span>
            {estimatedTime && (
              <span>~{estimatedTime} min restantes</span>
            )}
          </div>
        </div>

        {/* Timing Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Iniciado em</p>
            <p className="font-medium">{formatDate(currentProcessing.created_at)}</p>
          </div>
          {currentProcessing.completed_at && (
            <div>
              <p className="text-muted-foreground">Concluído em</p>
              <p className="font-medium">{formatDate(currentProcessing.completed_at)}</p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {currentProcessing.status === 'error' && currentProcessing.error_message && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {currentProcessing.error_message}
            </AlertDescription>
          </Alert>
        )}

        {/* Current Step */}
        {currentProcessing.status === 'processing' && currentProcessing.current_step && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {currentProcessing.current_step}
            </span>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(currentProcessing.id)}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver Detalhes
            </Button>
            
            {currentProcessing.status === 'completed' && currentProcessing.excel_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={downloadExcel}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Excel
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}

        {/* Processing Stats */}
        {currentProcessing.status === 'completed' && (
          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Sucessos</p>
              <p className="text-sm font-bold text-green-600">
                {currentProcessing.processed_files}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Erros</p>
              <p className="text-sm font-bold text-red-600">
                {currentProcessing.total_files - currentProcessing.processed_files}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Taxa</p>
              <p className="text-sm font-bold">
                {calculateProgress()}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}