import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  X, 
  FileText,
  Clock,
  Zap
} from "lucide-react";
import type { UploadProgress as UploadProgressType } from "@/shared/types/payroll";

interface UploadProgressProps {
  progress: UploadProgressType;
  onCancel?: () => void;
  onRetry?: () => void;
  onClose?: () => void;
}

export function UploadProgress({ 
  progress, 
  onCancel, 
  onRetry, 
  onClose 
}: UploadProgressProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'uploading':
        return <Upload className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'processing':
        return <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'uploading':
        return 'Enviando arquivos...';
      case 'processing':
        return 'Processando holerites...';
      case 'completed':
        return 'Upload concluído com sucesso!';
      case 'error':
        return 'Erro durante o upload';
      default:
        return 'Preparando upload...';
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'uploading':
      case 'processing':
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      case 'completed':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">{getStatusText()}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {progress.status === 'uploading' && onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          )}
          {progress.status === 'error' && onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Tentar Novamente
            </Button>
          )}
          {(progress.status === 'completed' || progress.status === 'error') && onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(progress.status === 'uploading' || progress.status === 'processing') && (
        <div className="space-y-2 mb-3">
          <Progress value={progress.percentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{Math.round(progress.percentage)}% concluído</span>
            {progress.estimatedTimeRemaining && (
              <span>Tempo restante: {formatTime(progress.estimatedTimeRemaining)}</span>
            )}
          </div>
        </div>
      )}

      {/* File Details */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {progress.filesProcessed} de {progress.totalFiles} arquivos
          </span>
          <Badge variant="outline" className="text-xs">
            {formatFileSize(progress.totalSize)}
          </Badge>
        </div>

        {/* Current File */}
        {progress.currentFile && (
          <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium flex-1 truncate">
              {progress.currentFile}
            </span>
            {progress.status === 'uploading' && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs text-blue-600">Enviando</span>
              </div>
            )}
            {progress.status === 'processing' && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-xs text-yellow-600">Processando</span>
              </div>
            )}
          </div>
        )}

        {/* Speed and Stats */}
        {progress.status === 'uploading' && progress.uploadSpeed && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Velocidade: {formatFileSize(progress.uploadSpeed)}/s</span>
            {progress.bytesUploaded && (
              <span>
                {formatFileSize(progress.bytesUploaded)} / {formatFileSize(progress.totalSize)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error Details */}
      {progress.status === 'error' && progress.error && (
        <div className="mt-3 p-2 bg-red-100 dark:bg-red-900 rounded border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-800 dark:text-red-200">
              Erro no Upload
            </span>
          </div>
          <p className="text-xs text-red-700 dark:text-red-300">
            {progress.error}
          </p>
        </div>
      )}

      {/* Success Details */}
      {progress.status === 'completed' && (
        <div className="mt-3 p-2 bg-green-100 dark:bg-green-900 rounded border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Upload Concluído
            </span>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300">
            {progress.totalFiles} arquivo(s) enviado(s) e processamento iniciado com sucesso.
          </p>
          {progress.processingId && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              ID do Processamento: {progress.processingId}
            </p>
          )}
        </div>
      )}
    </div>
  );
}