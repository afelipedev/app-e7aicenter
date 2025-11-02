import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  FileX, 
  Shield, 
  FileText,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import type { FileValidationResult } from "@/shared/types/payroll";

interface FileValidationAlertProps {
  validationResults: FileValidationResult[];
  onRemoveFile: (fileIndex: number) => void;
  onDismiss: () => void;
}

export function FileValidationAlert({ 
  validationResults, 
  onRemoveFile, 
  onDismiss 
}: FileValidationAlertProps) {
  const invalidFiles = validationResults.filter(result => !result.isValid);
  const validFiles = validationResults.filter(result => result.isValid);

  if (invalidFiles.length === 0) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getErrorIcon = (errors: string[]) => {
    if (errors.some(error => error.includes('malicioso') || error.includes('vírus'))) {
      return <Shield className="w-4 h-4 text-red-500" />;
    }
    if (errors.some(error => error.includes('tipo') || error.includes('formato'))) {
      return <FileX className="w-4 h-4 text-orange-500" />;
    }
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  const getErrorSeverity = (errors: string[]) => {
    if (errors.some(error => error.includes('malicioso') || error.includes('vírus'))) {
      return 'critical';
    }
    if (errors.some(error => error.includes('tipo') || error.includes('formato'))) {
      return 'high';
    }
    return 'medium';
  };

  return (
    <div className="space-y-4">
      {/* Summary Alert */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            {invalidFiles.length} arquivo(s) com problemas encontrado(s). 
            {validFiles.length > 0 && ` ${validFiles.length} arquivo(s) válido(s).`}
          </span>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <X className="w-4 h-4" />
          </Button>
        </AlertDescription>
      </Alert>

      {/* Detailed File Errors */}
      <div className="space-y-3">
        {invalidFiles.map((result, index) => {
          const severity = getErrorSeverity(result.errors);
          const fileIndex = validationResults.findIndex(r => r.file === result.file);
          
          return (
            <div 
              key={index}
              className={`border rounded-lg p-4 ${
                severity === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
                severity === 'high' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' :
                'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getErrorIcon(result.errors)}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium text-sm">{result.file.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(result.file.size)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      {result.errors.map((error, errorIndex) => (
                        <div key={errorIndex} className="flex items-center gap-2">
                          <AlertCircle className="w-3 h-3 text-red-500" />
                          <span className="text-sm text-red-700 dark:text-red-300">
                            {error}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Security Warnings */}
                    {severity === 'critical' && (
                      <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800 dark:text-red-200">
                            Arquivo potencialmente perigoso
                          </span>
                        </div>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          Este arquivo foi identificado como potencialmente malicioso e não pode ser processado por motivos de segurança.
                        </p>
                      </div>
                    )}

                    {/* File Type Suggestions */}
                    {result.errors.some(error => error.includes('tipo') || error.includes('formato')) && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>Dica:</strong> Apenas arquivos PDF são aceitos. Certifique-se de que o arquivo tenha a extensão .pdf e seja um documento PDF válido.
                        </p>
                      </div>
                    )}

                    {/* Size Suggestions */}
                    {result.errors.some(error => error.includes('grande') || error.includes('tamanho')) && (
                      <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 rounded border border-orange-200 dark:border-orange-800">
                        <p className="text-xs text-orange-700 dark:text-orange-300">
                          <strong>Dica:</strong> O tamanho máximo permitido é 10MB. Tente comprimir o PDF ou dividi-lo em arquivos menores.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(fileIndex)}
                  className="ml-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Valid Files Summary */}
      {validFiles.length > 0 && (
        <div className="border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="font-medium text-sm text-green-800 dark:text-green-200">
              {validFiles.length} arquivo(s) válido(s)
            </span>
          </div>
          <div className="space-y-1">
            {validFiles.map((result, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <FileText className="w-3 h-3" />
                <span>{result.file.name}</span>
                <Badge variant="outline" className="text-xs">
                  {formatFileSize(result.file.size)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            invalidFiles.forEach((result) => {
              const fileIndex = validationResults.findIndex(r => r.file === result.file);
              onRemoveFile(fileIndex);
            });
          }}
        >
          Remover Arquivos Inválidos
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Fechar
        </Button>
      </div>
    </div>
  );
}