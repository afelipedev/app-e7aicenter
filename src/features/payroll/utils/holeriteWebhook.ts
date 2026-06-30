import type { WebhookResponse } from '~shared/types/payroll';

export const MAX_HOLERITE_BATCH_FILES = 12;

const COMPETENCIA_REGEX = /^(0[1-9]|1[0-2])\/\d{4}$/;

/** Máscara MM/AAAA a partir de dígitos digitados */
export function formatCompetenciaInput(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 6);
  if (numbers.length <= 2) return numbers;
  return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
}

export function isValidCompetencia(competencia: string): boolean {
  if (!COMPETENCIA_REGEX.test(competencia)) return false;
  const [month, year] = competencia.split('/');
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  if (monthNum < 1 || monthNum > 12) return false;
  return yearNum <= new Date().getFullYear();
}

/** Ordena competências MM/AAAA do mais antigo ao mais novo */
export function sortCompetencias(competencias: string[]): string[] {
  return [...competencias].sort((a, b) => {
    const [mA, yA] = a.split('/').map(Number);
    const [mB, yB] = b.split('/').map(Number);
    if (yA !== yB) return yA - yB;
    return mA - mB;
  });
}

const COMPETENCIA_RANGE_STORAGE_REGEX =
  /^(0[1-9]|1[0-2])\/\d{4}-(0[1-9]|1[0-2])\/\d{4}$/;

/**
 * Valor persistido em payroll_processing.competency (aceito pela RPC).
 * Um arquivo: MM/AAAA. Lote: MM/AAAA-MM/AAAA (hífen ASCII, cabe em VARCHAR(32)).
 */
export function formatCompetenciaForStorage(competencias: string[]): string {
  const sorted = sortCompetencias(competencias.filter(Boolean));
  if (sorted.length === 0) return '';
  if (sorted.length === 1) return sorted[0];
  return `${sorted[0]}-${sorted[sorted.length - 1]}`;
}

/** Rótulo para UI (ex.: 10/2025 — 12/2025) */
export function formatCompetenciaLabel(competencias: string[]): string {
  const sorted = sortCompetencias(competencias.filter(Boolean));
  if (sorted.length === 0) return '';
  if (sorted.length === 1) return sorted[0];
  return `${sorted[0]} — ${sorted[sorted.length - 1]}`;
}

/** Converte competency do banco (MM/AAAA ou MM/AAAA-MM/AAAA) para exibição */
export function formatCompetenciaDisplay(stored: string): string {
  if (!stored) return '';
  if (COMPETENCIA_RANGE_STORAGE_REGEX.test(stored)) {
    const [start, end] = stored.split('-');
    return `${start} — ${end}`;
  }
  return stored;
}

export function resolveHoleriteDownloadUrl(response: WebhookResponse | Record<string, unknown> | null | undefined): string | null {
  if (!response) return null;
  const r = response as Record<string, unknown>;
  const data = r.data as Record<string, unknown> | undefined;
  const arquivo = data?.arquivo as Record<string, unknown> | undefined;
  const urls = arquivo?.urls as Record<string, unknown> | undefined;
  const legacyArquivos = data?.arquivos as Record<string, unknown> | undefined;
  const legacyExcel = legacyArquivos?.excel as Record<string, unknown> | undefined;

  const candidates = [
    r.download_url,
    r.url,
    r.excel_url,
    r.file_url,
    r.fileUrl,
    r.downloadUrl,
    r.link,
    r.href,
    arquivo?.download_url,
    arquivo?.url,
    arquivo?.excel_url,
    urls?.excel_download,
    urls?.download,
    urls?.excel,
    legacyExcel?.url,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c;
  }
  return null;
}

export function resolveHoleriteDownloadFilename(
  response: WebhookResponse | Record<string, unknown> | null | undefined
): string {
  if (!response) return 'holerite.xlsx';
  const r = response as Record<string, unknown>;
  const data = r.data as Record<string, unknown> | undefined;
  const arquivo = data?.arquivo as Record<string, unknown> | undefined;

  const name =
    r.filename ||
    r.excel_filename ||
    r.nome_arquivo ||
    arquivo?.filename ||
    arquivo?.excel_filename;

  return typeof name === 'string' && name.trim() ? name : 'holerite.xlsx';
}

export function isHoleriteProcessingComplete(response: WebhookResponse | Record<string, unknown> | null | undefined): boolean {
  if (!response) return false;
  const r = response as Record<string, unknown>;
  if (r.duplicate === true) return false;
  if (!r.success) return false;
  return r.status === 'completed' || r.completed === true;
}

export function isDuplicateWebhookResponse(response: WebhookResponse | Record<string, unknown> | null | undefined): boolean {
  if (!response) return false;
  const r = response as Record<string, unknown>;
  return r.duplicate === true || r.duplicate_execution === true;
}

/** Competências para exibição no histórico */
export function getCompetenciasFromWebhookResponse(
  webhookResponse: unknown,
  fallbackCompetency: string
): string {
  if (!webhookResponse || typeof webhookResponse !== 'object') return fallbackCompetency;
  const wr = webhookResponse as Record<string, unknown>;
  const data = wr.data as Record<string, unknown> | undefined;
  const list = data?.competencias;
  if (Array.isArray(list) && list.length > 0) {
    return formatCompetenciaLabel(list.map(String));
  }
  if (COMPETENCIA_RANGE_STORAGE_REGEX.test(fallbackCompetency)) {
    return formatCompetenciaDisplay(fallbackCompetency);
  }
  return fallbackCompetency;
}

/**
 * Timeout em ms para fetch ao webhook.
 *
 * O N8N agora responde 202 imediatamente (fluxo assíncrono): o processamento OCR/IA roda em
 * segundo plano e o progresso/conclusão chegam por callback (Edge Function) + Realtime.
 * Portanto o timeout só precisa cobrir o UPLOAD do lote (PDFs em base64) + a validação inicial,
 * não o processamento inteiro. Mantém uma folga proporcional ao nº de arquivos.
 */
export function getHoleriteWebhookTimeoutMs(fileCount: number): number {
  if (fileCount <= 1) return 45_000;
  if (fileCount <= 3) return 90_000;
  if (fileCount <= 6) return 150_000;
  return 240_000;
}

/** Erros em que o N8N pode ter recebido o lote mas o browser não obteve a resposta HTTP */
export function isWebhookTransportError(error: Error | null | undefined): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  return (
    error.name === 'AbortError' ||
    msg.includes('aborted') ||
    msg.includes('abort') ||
    msg.includes('timeout') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network') ||
    msg.includes('load failed') ||
    msg.includes('falha em todas as tentativas')
  );
}

export function isWebhookGatewayTimeoutStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504 || status === 524;
}

export const WEBHOOK_DEFERRED_MESSAGE =
  'O lote foi enviado ao N8N. O processamento pode levar vários minutos; acompanhe o status abaixo e baixe o Excel quando concluir.';

export type BatchWebhookValidation = {
  ok: boolean;
  warnings: string[];
  sentCount: number;
  receivedCount: number | null;
  sentCompetencias: string[];
  receivedCompetencias: string[];
};

/** Ordena itens do lote por competência (alinha com o N8N) */
export function sortItemsByCompetencia<T extends { competencia: string }>(items: T[]): T[] {
  const order = sortCompetencias(items.map((i) => i.competencia));
  return [...items].sort(
    (a, b) => order.indexOf(a.competencia) - order.indexOf(b.competencia)
  );
}

/**
 * Compara competências enviadas com a resposta do webhook.
 * Não valida conteúdo do Excel — apenas metadados retornados pelo N8N.
 */
export function validateBatchWebhookResponse(
  sentCompetencias: string[],
  filesCount: number,
  response: WebhookResponse | Record<string, unknown> | null | undefined
): BatchWebhookValidation {
  const sent = sortCompetencias(sentCompetencias.filter(Boolean));
  const warnings: string[] = [];
  let received: string[] = [];
  let receivedCount: number | null = null;

  if (response && typeof response === 'object') {
    const data = (response as Record<string, unknown>).data as Record<string, unknown> | undefined;
    if (Array.isArray(data?.competencias)) {
      received = sortCompetencias(data.competencias.map(String));
    }
    if (typeof data?.total_arquivos === 'number') {
      receivedCount = data.total_arquivos;
    }
  }

  if (filesCount > 1 && receivedCount !== null && receivedCount !== filesCount) {
    warnings.push(
      `O N8N reportou ${receivedCount} arquivo(s), mas o app enviou ${filesCount}.`
    );
  }

  if (filesCount > 1 && received.length > 0) {
    const sentKey = sent.join('|');
    const receivedKey = received.join('|');
    if (sentKey !== receivedKey) {
      warnings.push(
        `Competências na resposta (${received.join(', ')}) diferem das enviadas (${sent.join(', ')}).`
      );
    }
  } else if (filesCount > 1 && received.length === 0) {
    warnings.push(
      'Resposta do N8N não incluiu o array data.competencias; não foi possível confirmar o lote.'
    );
  }

  if (filesCount > 1 && received.length === 1 && sent.length > 1) {
    warnings.push(
      'Apenas uma competência na resposta para um lote com vários PDFs — verifique o Excel e o fluxo N8N (nó Processar e Calcular).'
    );
  }

  if (filesCount > 1 && response && typeof response === 'object') {
    const data = (response as Record<string, unknown>).data as Record<string, unknown> | undefined;
    const legacyComp = typeof data?.competencia === 'string' ? data.competencia : '';
    if (
      legacyComp &&
      sent.length > 1 &&
      legacyComp === sent[0] &&
      received.length > 1
    ) {
      warnings.push(
        `O N8N preencheu data.competencia apenas com "${legacyComp}" (primeira do lote). Se o Excel tiver só essa competência, corrija o nó "Processar e Calcular" no workflow.`
      );
    }
  }

  return {
    ok: warnings.length === 0,
    warnings,
    sentCount: filesCount,
    receivedCount,
    sentCompetencias: sent,
    receivedCompetencias: received,
  };
}
