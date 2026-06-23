// Normalização dos metadados retornados pela API Pública do DataJud
// (formato Elasticsearch) para o modelo unificado persistido em
// process_snapshots e consumido pelo frontend.

import { onlyDigitsCnj, parseCnjSegments } from "./aliases.ts";

type JsonRecord = Record<string, unknown>;

const safeArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" ? (value as JsonRecord) : {};

/** Formata os 20 dígitos do CNJ no padrão NNNNNNN-DD.AAAA.J.TR.OOOO. */
export const formatCnj = (cnj: string): string => {
  const segments = parseCnjSegments(cnj);
  if (!segments) return cnj;
  const { sequencial, digitoVerificador, ano, justica, tribunal, origem } = segments;
  return `${sequencial}-${digitoVerificador}.${ano}.${justica}.${tribunal}.${origem}`;
};

export const formatDateLabel = (value?: string | null): string => {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

/** Converte o grau do DataJud (G1, G2, JE, ...) para o rótulo da instância. */
export const mapGrade = (grau?: string | null): string => {
  const value = String(grau ?? "").trim().toUpperCase();
  if (value === "G1" || value === "JE") return "1ª instância";
  if (value === "G2") return "2ª instância";
  if (!value) return "1ª instância";
  return "Tribunal superior";
};

const coded = (value: unknown): { codigo: number | null; nome: string } => {
  const record = asRecord(value);
  const codigoRaw = record.codigo;
  const codigo =
    typeof codigoRaw === "number"
      ? codigoRaw
      : codigoRaw != null && !Number.isNaN(Number(codigoRaw))
        ? Number(codigoRaw)
        : null;
  return {
    codigo,
    nome: String(record.nome ?? "").trim(),
  };
};

export interface DatajudMovement {
  id: string;
  codigo: number | null;
  date: string;
  dataHora: string | null;
  title: string;
  description: string;
}

const normalizeMovements = (movimentos: JsonRecord[]): DatajudMovement[] =>
  movimentos
    .map((movimento, index) => {
      const dataHora = String(movimento.dataHora ?? "") || null;
      const nome = String(movimento.nome ?? "").trim() || `Movimentação ${index + 1}`;
      const complementos = safeArray<JsonRecord>(movimento.complementosTabelados)
        .map((complemento) => String(complemento.nome ?? complemento.descricao ?? "").trim())
        .filter(Boolean);
      const codigoRaw = movimento.codigo;
      return {
        id: `${codigoRaw ?? "mov"}-${index}`,
        codigo: typeof codigoRaw === "number" ? codigoRaw : Number(codigoRaw ?? NaN) || null,
        date: formatDateLabel(dataHora),
        dataHora,
        title: nome,
        description: complementos.length ? complementos.join(" • ") : "Sem complementos registrados.",
      };
    })
    // Mais recentes primeiro.
    .sort((left, right) => String(right.dataHora ?? "").localeCompare(String(left.dataHora ?? "")));

/**
 * Constrói o payload de process_snapshots a partir de um hit (_source) do DataJud.
 * Retorna null quando o documento não possui número de processo.
 */
export const buildSnapshotPayload = (
  source: JsonRecord,
  requestRowId: string,
  sourceKind: "query" | "advanced" | "detail",
  alias: string,
): JsonRecord | null => {
  const numeroProcessoRaw = onlyDigitsCnj(String(source.numeroProcesso ?? ""));
  if (!numeroProcessoRaw) {
    return null;
  }

  const cnjFormatted = formatCnj(numeroProcessoRaw);
  const classe = coded(source.classe);
  const orgaoJulgadorRecord = asRecord(source.orgaoJulgador);
  const orgaoJulgador = coded(orgaoJulgadorRecord);
  const formato = coded(source.formato);
  const sistema = coded(source.sistema);
  const assuntos = safeArray<JsonRecord>(source.assuntos).map(coded);
  const movements = normalizeMovements(safeArray<JsonRecord>(source.movimentos));
  const tribunal = String(source.tribunal ?? alias.toUpperCase()).trim();
  const grau = String(source.grau ?? "").trim();
  const dataAjuizamento = String(source.dataAjuizamento ?? "") || null;
  const ibge = orgaoJulgadorRecord.codigoMunicipioIBGE;
  const codigoMunicipioIBGE =
    typeof ibge === "number" ? ibge : ibge != null && !Number.isNaN(Number(ibge)) ? Number(ibge) : null;

  const assuntoNames = assuntos.map((assunto) => assunto.nome).filter(Boolean);

  return {
    cnj: cnjFormatted,
    title: classe.nome ? `${classe.nome} — ${cnjFormatted}` : cnjFormatted,
    active_party: null,
    passive_party: null,
    tribunal,
    grade: mapGrade(grau),
    created_at_label: formatDateLabel(dataAjuizamento),
    distributed_at_label: formatDateLabel(dataAjuizamento),
    status: "Em andamento",
    orgao_julgador: orgaoJulgador.nome || "Não informado",
    class_processual: classe.nome || "Não informado",
    assuntos: assuntoNames,
    tags: [],
    parties: [],
    value_label: null,
    last_movement: movements[0]?.title ?? "Sem movimentações registradas",
    summary: [classe.nome, assuntoNames.join(", ")].filter(Boolean).join(" • ") || "Sem resumo disponível.",
    movements,
    attachments: [],
    related_processes: [],
    origin_tribunal: tribunal,
    comarca: null,
    city: null,
    state: null,
    justice_segment: null,
    phase: null,
    judge_relator: null,
    ai_disclaimer:
      "Metadados públicos do DataJud/CNJ. Não incluem partes, advogados, anexos ou valor da causa.",
    last_request_id: requestRowId,
    last_response_id: String(source.id ?? ""),
    source_kind: sourceKind === "advanced" ? "history" : sourceKind,
    completeness: "full",
    raw_response: source,
    metadata: {
      numeroProcessoRaw,
      alias,
      grau,
      formato,
      sistema,
      classeCodigo: classe.codigo,
      orgaoJulgadorCodigo: orgaoJulgador.codigo,
      codigoMunicipioIBGE,
      assuntosDetalhados: assuntos,
      dataAjuizamento,
      nivelSigilo: typeof source.nivelSigilo === "number" ? source.nivelSigilo : null,
    },
  };
};

const readMetadata = (snapshot: JsonRecord): JsonRecord => asRecord(snapshot.metadata);

/** Modelo de resumo (listagem) consumido pelo frontend. */
export const snapshotToSummary = (snapshot: JsonRecord, state?: JsonRecord): JsonRecord => {
  const metadata = readMetadata(snapshot);
  return {
    id: String(snapshot.id),
    cnj: String(snapshot.cnj ?? ""),
    numeroProcessoRaw: String(metadata.numeroProcessoRaw ?? onlyDigitsCnj(String(snapshot.cnj ?? ""))),
    title: String(snapshot.title ?? ""),
    tribunal: String(snapshot.tribunal ?? ""),
    grade: String(snapshot.grade ?? "1ª instância"),
    grau: String(metadata.grau ?? ""),
    classProcessual: String(snapshot.class_processual ?? "Não informado"),
    orgaoJulgador: String(snapshot.orgao_julgador ?? "Não informado"),
    assuntos: safeArray<string>(snapshot.assuntos),
    distributedAt: String(snapshot.distributed_at_label ?? "Não informado"),
    status: String(snapshot.status ?? "Em andamento"),
    lastMovement: String(snapshot.last_movement ?? "Sem movimentações"),
    favorite: Boolean(state?.is_favorite),
  };
};

/** Modelo de detalhe completo consumido pelo frontend. */
export const snapshotToDetail = (snapshot: JsonRecord, state?: JsonRecord): JsonRecord => {
  const metadata = readMetadata(snapshot);
  return {
    ...snapshotToSummary(snapshot, state),
    summary: String(snapshot.summary ?? "Sem resumo disponível."),
    movements: safeArray<JsonRecord>(snapshot.movements),
    assuntosDetalhados: safeArray<JsonRecord>(metadata.assuntosDetalhados),
    classeCodigo: metadata.classeCodigo ?? null,
    orgaoJulgadorCodigo: metadata.orgaoJulgadorCodigo ?? null,
    codigoMunicipioIBGE: metadata.codigoMunicipioIBGE ?? null,
    formato: metadata.formato ?? null,
    sistema: metadata.sistema ?? null,
    nivelSigilo: metadata.nivelSigilo ?? null,
    dataAjuizamento: metadata.dataAjuizamento ?? null,
    aiDisclaimer: String(snapshot.ai_disclaimer ?? ""),
    source: "datajud",
    completeness: String(snapshot.completeness ?? "full"),
  };
};
