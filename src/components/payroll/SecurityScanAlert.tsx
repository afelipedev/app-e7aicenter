import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  FileX,
  Scan,
  X,
  Info,
  CheckCircle
} from "lucide-react";

interface SecurityScanResult {
  fileName: string;
  status: 'scanning' | 'safe' | 'warning' | 'threat' | 'error';
  threats?: string[];
  warnings?: string[];
  scanTime?: number;
  fileSize: number;
}

interface SecurityScanAlertProps {
  scanResults: SecurityScanResult[];
  onRemoveFile: (fileName: string) => void;
  onDismiss: () => void;
  onRescan?: (fileName: string) => void;
}

export function SecurityScanAlert({ 
  scanResults, 
  onRemoveFile, 
  onDismiss,
  onRescan 
}: SecurityScanAlertProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: SecurityScanResult['status']) => {
    switch (status) {
      case 'scanning':
        return <Scan className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'safe':
        return <ShieldCheck className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <ShieldAlert className="w-4 h-4 text-yellow-500" />;
      case 'threat':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'error':
        return <FileX className="w-4 h-4 text-gray-500" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: SecurityScanResult['status']) => {
    switch (status) {
      case 'scanning':
        return <Badge variant="outline" className="text-blue-600">Verificando</Badge>;
      case 'safe':
        return <Badge variant="outline" className="text-green-600">Seguro</Badge>;
      case 'warning':
        return <Badge variant="outline" className="text-yellow-600">Atenção</Badge>;
      case 'threat':
        return <Badge variant="destructive">Ameaça</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-gray-600">Erro</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getAlertVariant = () => {
    const hasThreats = scanResults.some(result => result.status === 'threat');
    const hasWarnings = scanResults.some(result => result.status === 'warning');
    
    if (hasThreats) return 'destructive';
    if (hasWarnings) return 'default';
    return 'default';
  };

  const getSummaryMessage = () => {
    const scanning = scanResults.filter(r => r.status === 'scanning').length;
    const safe = scanResults.filter(r => r.status === 'safe').length;
    const warnings = scanResults.filter(r => r.status === 'warning').length;
    const threats = scanResults.filter(r => r.status === 'threat').length;
    const errors = scanResults.filter(r => r.status === 'error').length;

    if (scanning > 0) {
      return `Verificando segurança de ${scanning} arquivo(s)...`;
    }

    if (threats > 0) {
      return `${threats} arquivo(s) com ameaças detectadas. Remoção recomendada.`;
    }

    if (warnings > 0) {
      return `${warnings} arquivo(s) com avisos de segurança. Verifique antes de continuar.`;
    }

    if (errors > 0) {
      return `${errors} arquivo(s) não puderam ser verificados.`;
    }

    if (safe > 0) {
      return `${safe} arquivo(s) verificado(s) e considerado(s) seguro(s).`;
    }

    return 'Verificação de segurança em andamento...';
  };

  if (scanResults.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Summary Alert */}
      <Alert variant={getAlertVariant()}>
        <Shield className="h-4 w-4" />
        <AlertTitle>Verificação de Segurança</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{getSummaryMessage()}</span>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <X className="w-4 h-4" />
          </Button>
        </AlertDescription>
      </Alert>

      {/* Detailed Scan Results */}
      <div className="space-y-3">
        {scanResults.map((result, index) => (
          <div 
            key={index}
            className={`border rounded-lg p-4 ${
              result.status === 'threat' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
              result.status === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
              result.status === 'safe' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
              result.status === 'scanning' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' :
              'border-gray-500 bg-gray-50 dark:bg-gray-950'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(result.status)}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{result.fileName}</span>
                    {getStatusBadge(result.status)}
                    <Badge variant="outline" className="text-xs">
                      {formatFileSize(result.fileSize)}
                    </Badge>
                  </div>

                  {/* Scanning Progress */}
                  {result.status === 'scanning' && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Scan className="w-3 h-3 animate-spin" />
                      <span>Verificando arquivo por ameaças...</span>
                    </div>
                  )}

                  {/* Threats */}
                  {result.threats && result.threats.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">
                          Ameaças Detectadas:
                        </span>
                      </div>
                      {result.threats.map((threat, threatIndex) => (
                        <div key={threatIndex} className="ml-6 text-sm text-red-600 dark:text-red-400">
                          • {threat}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warnings */}
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                          Avisos:
                        </span>
                      </div>
                      {result.warnings.map((warning, warningIndex) => (
                        <div key={warningIndex} className="ml-6 text-sm text-yellow-600 dark:text-yellow-400">
                          • {warning}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Safe Status */}
                  {result.status === 'safe' && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      <span>Arquivo verificado e considerado seguro</span>
                      {result.scanTime && (
                        <span className="text-xs text-gray-500">
                          (verificado em {result.scanTime}ms)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Error Status */}
                  {result.status === 'error' && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileX className="w-3 h-3" />
                      <span>Não foi possível verificar este arquivo</span>
                    </div>
                  )}

                  {/* Security Recommendations */}
                  {result.status === 'threat' && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800 dark:text-red-200">
                          Ação Recomendada
                        </span>
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-300">
                        Este arquivo contém ameaças de segurança e deve ser removido imediatamente. 
                        Não prossiga com o upload deste arquivo.
                      </p>
                    </div>
                  )}

                  {result.status === 'warning' && (
                    <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 rounded border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldAlert className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Verificação Recomendada
                        </span>
                      </div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Este arquivo apresenta características que requerem atenção. 
                        Verifique se é um arquivo confiável antes de continuar.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 ml-2">
                {result.status === 'error' && onRescan && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRescan(result.fileName)}
                  >
                    <Scan className="w-4 h-4" />
                  </Button>
                )}
                {(result.status === 'threat' || result.status === 'warning' || result.status === 'error') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFile(result.fileName)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2">
        {scanResults.some(r => r.status === 'threat') && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              scanResults
                .filter(r => r.status === 'threat')
                .forEach(r => onRemoveFile(r.fileName));
            }}
          >
            Remover Arquivos com Ameaças
          </Button>
        )}
        
        {scanResults.some(r => r.status === 'warning') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              scanResults
                .filter(r => r.status === 'warning')
                .forEach(r => onRemoveFile(r.fileName));
            }}
          >
            Remover Arquivos com Avisos
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Fechar
        </Button>
      </div>
    </div>
  );
}