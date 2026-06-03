import React, { useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, X, Loader2, AlertCircle } from 'lucide-react';
import type { CompanyOption, PayrollBatchUploadData } from '~shared/types/payroll';
import {
  formatCompetenciaInput,
  isValidCompetencia,
  MAX_HOLERITE_BATCH_FILES,
  sortCompetencias,
} from '@/features/payroll/utils/holeriteWebhook';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export type UploadRow = {
  id: string;
  file: File | null;
  competencia: string;
};

function newRow(): UploadRow {
  return { id: crypto.randomUUID(), file: null, competencia: '' };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export interface PayrollBatchUploadFormProps {
  companies?: CompanyOption[];
  companyId: string;
  onCompanyChange?: (companyId: string) => void;
  companyName?: string;
  hideCompanySelector?: boolean;
  rows: UploadRow[];
  onRowsChange: (rows: UploadRow[]) => void;
  onSubmit: (data: PayrollBatchUploadData) => void | Promise<void>;
  isUploading?: boolean;
  maxFiles?: number;
}

export function PayrollBatchUploadForm({
  companies = [],
  companyId,
  onCompanyChange,
  companyName,
  hideCompanySelector = false,
  rows,
  onRowsChange,
  onSubmit,
  isUploading = false,
  maxFiles = MAX_HOLERITE_BATCH_FILES,
}: PayrollBatchUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filledRows = rows.filter((r) => r.file);
  const canAddMore = rows.length < maxFiles;

  const competenciasPreview = useMemo(() => {
    const list = rows
      .filter((r) => r.file && r.competencia.trim())
      .map((r) => r.competencia);
    return sortCompetencias(list);
  }, [rows]);

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!companyId && !hideCompanySelector) {
      issues.push('Selecione uma empresa');
    }
    if (filledRows.length === 0) {
      issues.push('Adicione pelo menos um PDF');
    }
    rows.forEach((row, index) => {
      if (row.file && !row.competencia.trim()) {
        issues.push(`Linha ${index + 1}: informe a competência (MM/AAAA)`);
      }
      if (row.file && row.competencia && !isValidCompetencia(row.competencia)) {
        issues.push(`Linha ${index + 1}: competência inválida (${row.competencia})`);
      }
    });
    return issues;
  }, [companyId, hideCompanySelector, filledRows.length, rows]);

  const canSubmit = validationIssues.length === 0 && !isUploading;

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files).filter((f) => f.type.includes('pdf') || f.name.toLowerCase().endsWith('.pdf'));
      if (incoming.length === 0) return;

      const next = [...rows];

      for (const file of incoming) {
        if (next.filter((r) => r.file).length >= maxFiles) break;

        const emptyIdx = next.findIndex((r) => !r.file);
        if (emptyIdx >= 0) {
          next[emptyIdx] = { ...next[emptyIdx], file };
        } else {
          next.push({ ...newRow(), file });
        }
      }

      onRowsChange(next);
    },
    [rows, maxFiles, onRowsChange]
  );

  const updateRow = (id: string, patch: Partial<UploadRow>) => {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    onRowsChange(rows.filter((r) => r.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const items = rows
      .filter((r) => r.file && r.competencia.trim())
      .map((r) => ({ file: r.file!, competencia: r.competencia.trim() }));
    onSubmit({ company_id: companyId, items });
  };

  const hasFileRows = filledRows.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload de Holerites em Lote</CardTitle>
        <p className="text-sm text-muted-foreground">
          Até {maxFiles} PDFs por envio — um XLSX consolidado com todas as competências
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hideCompanySelector ? (
          <div className="space-y-2">
            <Label htmlFor="payroll-company">Empresa</Label>
            <select
              id="payroll-company"
              value={companyId}
              onChange={(e) => onCompanyChange?.(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              disabled={isUploading}
            >
              <option value="">Selecione uma empresa</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          companyName && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="font-medium text-foreground">Empresa:</span> {companyName}
            </p>
          )
        )}

        <div
          className="border-2 border-dashed rounded-lg p-6 text-center transition-colors border-muted-foreground/25 hover:border-muted-foreground/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Arraste PDFs aqui ou selecione arquivos</p>
          <p className="text-xs text-muted-foreground mb-3">
            {filledRows.length}/{maxFiles} arquivos • máx. {formatFileSize(MAX_FILE_SIZE)} cada
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !canAddMore}
          >
            Adicionar PDFs
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {hasFileRows && (
          <div className="space-y-3">
            <Label>Arquivos e competências</Label>
            {rows
              .filter((row) => row.file)
              .map((row, index) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2 items-start p-3 border rounded-lg"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-red-500 shrink-0 mt-1" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{row.file!.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(row.file!.size)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Competência</Label>
                    <Input
                      placeholder="MM/AAAA"
                      value={row.competencia}
                      onChange={(e) =>
                        updateRow(row.id, { competencia: formatCompetenciaInput(e.target.value) })
                      }
                      maxLength={7}
                      disabled={isUploading}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeRow(row.id)}
                    disabled={isUploading}
                    title="Remover arquivo"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
          </div>
        )}

        {competenciasPreview.length > 0 && (
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p className="font-medium mb-1">Competências neste lote (ordem de processamento):</p>
            <p className="text-muted-foreground">{competenciasPreview.join(' → ')}</p>
          </div>
        )}

        {validationIssues.length > 0 && filledRows.length > 0 && (
          <div className="flex gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <ul className="list-disc list-inside">
              {validationIssues.slice(0, 3).map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <Button type="button" onClick={handleSubmit} disabled={!canSubmit} className="w-full">
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando {filledRows.length} holerite(s) — aguarde...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Processar lote ({filledRows.length} arquivo{filledRows.length !== 1 ? 's' : ''})
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function createInitialUploadRows(): UploadRow[] {
  return [];
}
