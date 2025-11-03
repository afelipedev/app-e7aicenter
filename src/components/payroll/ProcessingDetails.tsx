import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  Eye, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Activity,
  Loader2,
  X
} from "lucide-react";
import { PayrollService } from "@/services/payrollService";
import { toast } from "@/hooks/use-toast";
import type {
  PayrollProcessing,
  ProcessingLog,
  PayrollFile,
  ProcessingStatus
} from "@/shared/types/payroll";

interface ProcessingDetailsProps {
  processingId: string;
  onClose: () => void;
}

export function ProcessingDetails({ processingId, onClose }: ProcessingDetailsProps) {
  const [processing, setProcessing] = useState<PayrollProcessing | null>(null);
  const [files, setFiles] = useState<PayrollFile[]>([]);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadProcessingDetails();
  }, [processingId]);

  // Auto-refresh if processing is active
  useEffect(() => {
    if (processing && ['pending', 'processing'].includes(processing.status)) {
      const interval = setInterval(() => {
        refreshData();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [processing?.status]);

  const loadProcessingDetails = async () => {
    try {
      setIsLoading(true);
      const [processingData, filesData, logsData] = await Promise.all([
        PayrollService.getProcessingById(processingId),
        PayrollService.getFilesByProcessingId(processingId),
        PayrollService.getProcessingLogs(processingId)
      ]);

      setProcessing(processingData);
      setFiles(filesData);
      setLogs(logsData);
    } catch (error) {
      console.error('Error loading processing details:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do processamento",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setIsRefreshing(true);
      await loadProcessingDetails();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing': return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
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

  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing': return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const downloadExcel = async () => {
    if (!processing?.excel_url) return;
    
    try {
      const filename = `holerite_${processing.competency || 'processado'}.xlsx`;
      await PayrollService.downloadFile(processing.excel_url, filename);
      toast({
        title: "Download iniciado",
        description: "O arquivo Excel está sendo baixado automaticamente",
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!processing) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Processamento não encontrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(processing.status)}
              <div>
                <CardTitle>Processamento #{processing.id.slice(0, 8)}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {processing.company_name} • {processing.competencia}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status and Progress */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Status</p>
              <Badge variant={getStatusBadgeVariant(processing.status)}>
                {processing.status === 'processing' ? 'Processando' : 
                 processing.status === 'completed' ? 'Concluído' : 
                 processing.status === 'error' ? 'Erro' : 'Pendente'}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Progresso</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{processing.processed_files}/{processing.total_files} arquivos</span>
                  <span>{Math.round((processing.processed_files / processing.total_files) * 100)}%</span>
                </div>
                <Progress value={(processing.processed_files / processing.total_files) * 100} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Criado em</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(processing.created_at)}
              </p>
            </div>
          </div>

          {/* Download Button */}
          {processing.status === 'completed' && processing.excel_url && (
            <div className="flex justify-end">
              <Button onClick={downloadExcel} className="gap-2">
                <Download className="w-4 h-4" />
                Baixar Excel
              </Button>
            </div>
          )}

          {/* Error Message */}
          {processing.status === 'error' && processing.error_message && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {processing.error_message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Arquivos ({files.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {files.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileStatusIcon(file.status)}
                        <span className="font-medium">{file.filename}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {file.file_size ? formatFileSize(file.file_size) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(file.status as ProcessingStatus)}>
                        {file.status === 'processing' ? 'Processando' : 
                         file.status === 'completed' ? 'Concluído' : 
                         file.status === 'error' ? 'Erro' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {file.processed_at ? formatDate(file.processed_at) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {file.s3_url && (
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {file.excel_url && (
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum arquivo encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Logs de Processamento ({logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="border-l-2 border-muted pl-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {log.level === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      {log.level === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                      {log.level === 'info' && <CheckCircle className="w-4 h-4 text-blue-500" />}
                      <span className="font-medium">{log.step}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.message}</p>
                  {log.details && (
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum log encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}