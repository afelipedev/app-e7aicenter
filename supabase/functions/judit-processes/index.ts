import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JUDIT_REQUESTS_BASE_URL =
  Deno.env.get("JUDIT_REQUESTS_BASE_URL") ?? "https://requests.prod.judit.io";
const JUDIT_TRACKING_BASE_URL =
  Deno.env.get("JUDIT_TRACKING_BASE_URL") ?? "https://tracking.prod.judit.io";
const JUDIT_LAWSUITS_BASE_URL =
  Deno.env.get("JUDIT_LAWSUITS_BASE_URL") ?? "https://lawsuits.production.judit.io";
const JUDIT_API_KEY = Deno.env.get("JUDIT_API_KEY");

const MAX_WAIT_MS = 45000;
const POLL_INTERVAL_MS = 3000;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const INITIAL_REQUEST_WAIT_MS = 8000;
const BATCH_SIZE = 200;
const JUDIT_PRICING_VERSION = "2026-03-17-v1";

type JsonRecord = Record<string, unknown>;
type SearchType = "lawsuit_cnj" | "cpf" | "cnpj" | "oab";
type MonitoringKind = "process" | "document";

type AdminClient = ReturnType<typeof createClient>;

interface JuditConfig {
  apiKey: string;
  requestsBaseUrl: string;
  trackingBaseUrl: string;
  lawsuitsBaseUrl: string;
}

interface AuthContext {
  userId: string;
  admin: AdminClient;
}

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filters?: {
    tags?: string[];
    tribunals?: string[];
    partyNames?: string[];
    partySides?: string[];
    partyDocuments?: string[];
    distributedFrom?: string;
    distributedTo?: string;
    classesProcessuais?: string[];
    assuntos?: string[];
  };
}

interface ConsumptionProduct {
  code: string;
  label: string;
  priceBrl: number;
}

const CONSUMPTION_PRODUCTS = {
  processConsultation: {
    code: "process_consultation",
    label: "Consulta processual",
    priceBrl: 0.25,
  },
  historicalDatalake: {
    code: "historical_datalake",
    label: "Consulta historica (Data Lake)",
    priceBrl: 1.5,
  },
  attachments: {
    code: "attachments",
    label: "Autos processuais (Anexos)",
    priceBrl: 3.5,
  },
} satisfies Record<string, ConsumptionProduct>;

const buildJsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizeDocument = (value: string) => value.replace(/\D/g, "");

const safeArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const chunkArray = <T>(items: T[], size = BATCH_SIZE) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const toPageSize = (pageSize?: number) =>
  Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize ?? DEFAULT_PAGE_SIZE));

const formatDateLabel = (value?: string | null) => {
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

const formatCurrencyLabel = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "Não informado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const mapGrade = (instance?: string | number | null) => {
  if (instance === 1 || instance === "1" || String(instance).includes("1")) return "1ª instância";
  if (instance === 2 || instance === "2" || String(instance).includes("2")) return "2ª instância";
  return "Tribunal superior";
};

const mapStatus = (value?: string | null) => {
  const normalized = normalize(value ?? "");
  if (normalized.includes("final")) return "Concluída";
  if (normalized.includes("conclu")) return "Concluída";
  if (normalized.includes("aguard")) return "Aguardando";
  return "Em andamento";
};

const mapPartySide = (value?: string | null) => {
  const normalized = normalize(value ?? "");
  if (normalized === "active") return "Ativo";
  if (normalized === "passive") return "Passivo";
  return "Interessado";
};

const maskSearchKey = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 4) return "*".repeat(trimmed.length);
  return `${"*".repeat(Math.max(trimmed.length - 4, 2))}${trimmed.slice(-4)}`;
};

const sha256 = async (value: string) => {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((chunk) => chunk.toString(16).padStart(2, "0"))
    .join("");
};

const toDateOnly = (value: Date) => value.toISOString().slice(0, 10);

const getMonthStart = (value: Date) =>
  toDateOnly(new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1)));

const isTerminalRequestStatus = (status?: string | null) => {
  const normalized = normalize(status ?? "");
  return ["completed", "error", "failed", "cancelled", "canceled"].includes(normalized);
};

const loadJuditConfig = async (admin: AdminClient): Promise<JuditConfig> => {
  if (JUDIT_API_KEY) {
    return {
      apiKey: JUDIT_API_KEY,
      requestsBaseUrl: JUDIT_REQUESTS_BASE_URL,
      trackingBaseUrl: JUDIT_TRACKING_BASE_URL,
      lawsuitsBaseUrl: JUDIT_LAWSUITS_BASE_URL,
    };
  }

  const { data, error } = await admin
    .from("judit_provider_secrets")
    .select("api_key, base_url")
    .eq("provider_name", "Judit")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao carregar credenciais da Judit: ${error.message}`);
  }

  if (!data?.api_key) {
    throw new Error("JUDIT_API_KEY não configurada.");
  }

  return {
    apiKey: data.api_key,
    requestsBaseUrl: data.base_url || JUDIT_REQUESTS_BASE_URL,
    trackingBaseUrl: JUDIT_TRACKING_BASE_URL,
    lawsuitsBaseUrl: JUDIT_LAWSUITS_BASE_URL,
  };
};

const inferConsumptionProduct = (
  requestKind: "cnj" | "history" | "detail_refresh",
  searchType: SearchType,
  responseType: string,
) => {
  if (requestKind === "history" && responseType === "lawsuits") {
    return CONSUMPTION_PRODUCTS.historicalDatalake;
  }

  if (searchType === "lawsuit_cnj" || responseType === "lawsuit") {
    return CONSUMPTION_PRODUCTS.processConsultation;
  }

  return null;
};

const upsertConsumptionEntry = async ({
  admin,
  juditRequestId,
  requestKind,
  searchType,
  searchValue,
  responseType,
  requestedWithAttachments,
  status,
  payload,
  createdAt,
  updatedAt,
}: {
  admin: AdminClient;
  juditRequestId?: string | null;
  requestKind: "cnj" | "history" | "detail_refresh";
  searchType: SearchType;
  searchValue: string;
  responseType: string;
  requestedWithAttachments: boolean;
  status: string;
  payload: JsonRecord;
  createdAt?: string;
  updatedAt?: string;
}) => {
  if (!juditRequestId) return;

  const product = inferConsumptionProduct(requestKind, searchType, responseType);
  const attachmentAddOnBrl = requestedWithAttachments ? CONSUMPTION_PRODUCTS.attachments.priceBrl : 0;
  const createdAtIso = createdAt ?? new Date().toISOString();
  const createdAtDate = new Date(createdAtIso);
  const normalizedCreatedAt = Number.isNaN(createdAtDate.getTime())
    ? new Date()
    : createdAtDate;
  const costBrl = Number(((product?.priceBrl ?? 0) + attachmentAddOnBrl).toFixed(2));
  const costConfidence = product ? "exact" : requestedWithAttachments ? "estimated" : "unknown";

  const { error } = await admin.from("judit_requests").upsert({
    request_id: juditRequestId,
    origin: "api",
    origin_id: juditRequestId,
    status,
    created_at_judit: createdAtIso,
    updated_at_judit: updatedAt ?? new Date().toISOString(),
    billing_reference_month: getMonthStart(normalizedCreatedAt),
    search_type: searchType,
    response_type: responseType,
    search_key_masked: maskSearchKey(searchValue),
    on_demand: false,
    with_attachments: requestedWithAttachments,
    public_search: false,
    plan_config_type: null,
    filters_count: null,
    product_name: product?.label ?? "Nao classificado",
    cost_brl: costBrl,
    cost_type: "estimated",
    cost_confidence: costConfidence,
    returned_items_count: null,
    returned_batches: null,
    has_overage: false,
    pricing_version: JUDIT_PRICING_VERSION,
    raw_payload: payload,
    pricing_metadata: {
      product_code: product?.code ?? null,
      attachment_add_on_brl: attachmentAddOnBrl,
      source_module: "processes",
      request_kind: requestKind,
      classification_source: {
        search_type: searchType,
        response_type: responseType,
        on_demand: false,
      },
    },
    sync_run_id: null,
  }, {
    onConflict: "request_id",
  });

  if (error) {
    console.error("Erro ao sincronizar judit_requests em tempo real:", error);
  }
};

const juditRequest = async <T>(
  config: JuditConfig,
  baseUrl: string,
  path: string,
  init?: RequestInit,
  query?: Record<string, string | number | boolean | undefined>,
) => {
  const url = new URL(path, baseUrl);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKey,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Judit API ${response.status}: ${errorText}`);
  }

  return (await response.json()) as T;
};

const getAuthContext = async (req: Request): Promise<AuthContext> => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Não autorizado.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    throw new Error("Sessão inválida.");
  }

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return {
    userId: user.id,
    admin,
  };
};

const createProcessQueryRequest = async ({
  admin,
  userId,
  requestKind,
  searchType,
  searchValue,
  responseType,
  requestedWithAttachments,
  juditRequestId,
  initialStatus,
  initialResponsePayload,
}: {
  admin: AdminClient;
  userId: string;
  requestKind: "cnj" | "history" | "detail_refresh";
  searchType: SearchType;
  searchValue: string;
  responseType: string;
  requestedWithAttachments: boolean;
  juditRequestId?: string | null;
  initialStatus?: string;
  initialResponsePayload?: JsonRecord;
}) => {
  const searchKeyHash = await sha256(`${searchType}:${normalize(searchValue)}`);
  const { data, error } = await admin
    .from("process_query_requests")
    .insert({
      auth_user_id: userId,
      judit_request_id: juditRequestId ?? null,
      request_kind: requestKind,
      search_type: searchType,
      search_key_hash: searchKeyHash,
      search_key_masked: maskSearchKey(searchValue),
      search_value_label: searchValue,
      response_type: responseType,
      requested_with_attachments: requestedWithAttachments,
      status: initialStatus ?? "pending",
      request_payload: {
        search_type: searchType,
        search_value: searchValue,
        response_type: responseType,
      },
      response_payload: initialResponsePayload ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Erro ao criar process_query_requests: ${error?.message ?? "desconhecido"}`);
  }

  return data;
};

const updateProcessQueryRequest = async (
  admin: AdminClient,
  requestId: string,
  payload: JsonRecord,
) => {
  const { error } = await admin
    .from("process_query_requests")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    throw new Error(`Erro ao atualizar process_query_requests: ${error.message}`);
  }
};

const createJuditSearchRequest = async ({
  config,
  searchType,
  searchKey,
  responseType,
  withAttachments,
}: {
  config: JuditConfig;
  searchType: SearchType;
  searchKey: string;
  responseType: string;
  withAttachments: boolean;
}) =>
  juditRequest<JsonRecord>(config, config.requestsBaseUrl, "/requests", {
    method: "POST",
    body: JSON.stringify({
      search: {
        search_type: searchType,
        search_key: searchKey,
        response_type: responseType,
      },
      with_attachments: withAttachments,
    }),
  });

const waitForJuditRequestCompletion = async (
  config: JuditConfig,
  juditRequestId: string,
  maxWaitMs = MAX_WAIT_MS,
) => {
  const startedAt = Date.now();
  let latestResponse: JsonRecord | null = null;

  while (Date.now() - startedAt < maxWaitMs) {
    latestResponse = await juditRequest<JsonRecord>(
      config,
      config.requestsBaseUrl,
      `/requests/${juditRequestId}`,
      { method: "GET" },
    );

    if (isTerminalRequestStatus(String(latestResponse.status ?? ""))) {
      return latestResponse;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return latestResponse;
};

const listJuditResponses = async (config: JuditConfig, requestId: string) => {
  let page = 1;
  let totalPages = 1;
  const responses: JsonRecord[] = [];

  while (page <= totalPages) {
    const payload = await juditRequest<{
      page_data?: JsonRecord[];
      all_pages_count?: number;
      page_count?: number;
    }>(config, config.requestsBaseUrl, "/responses", { method: "GET" }, {
      request_id: requestId,
      page_size: 100,
      page,
    });

    responses.push(...safeArray<JsonRecord>(payload.page_data));
    totalPages = payload.all_pages_count ?? payload.page_count ?? 1;
    page += 1;
  }

  return responses;
};

const pickNameFromItems = (items: JsonRecord[]) =>
  items
    .map((item) => String(item.name ?? "").trim())
    .filter(Boolean);

const normalizeParties = (rawParties: JsonRecord[]) =>
  rawParties.map((party) => {
    const documents = safeArray<JsonRecord>(party.documents);
    const firstDocument = documents[0] ?? {};
    const lawyers = safeArray<JsonRecord>(party.lawyers);

    return {
      name: String(party.name ?? "Parte não identificada"),
      side: mapPartySide(String(party.side ?? party.person_type ?? "")),
      document: String(
        party.main_document ??
          firstDocument.document ??
          party.document ??
          ""
      ),
      documentType: String(
        firstDocument.document_type ??
          party.document_type ??
          "OUTRO"
      ).toUpperCase(),
      role: String(party.person_type ?? "").trim() || undefined,
      counsel: lawyers
        .map((lawyer) => String(lawyer.name ?? lawyer.oab ?? "").trim())
        .filter(Boolean)
        .join(", ") || undefined,
      groupLabel:
        mapPartySide(String(party.side ?? "")) === "Ativo"
          ? "Polo ativo"
          : mapPartySide(String(party.side ?? "")) === "Passivo"
            ? "Polo passivo"
            : "Outras partes",
    };
  });

const normalizeMovements = (steps: JsonRecord[]) =>
  steps.map((step, index) => ({
    id: String(step.step_id ?? `${index}`),
    date: formatDateLabel(String(step.step_date ?? "")),
    title:
      String(step.step_type ?? "").trim() ||
      String(step.content ?? "").trim().slice(0, 80) ||
      `Movimentação ${index + 1}`,
    description: String(step.content ?? "").trim() || "Sem descrição adicional.",
  }));

const normalizeAttachments = (attachments: JsonRecord[], cnj: string, instance: string | number | undefined) =>
  attachments.map((attachment, index) => ({
    id: String(
      attachment.attachment_id ??
        attachment.id ??
        attachment.step_id ??
        `${cnj}-${index}`
    ),
    name: String(
      attachment.attachment_name ??
        attachment.name ??
        `Anexo ${index + 1}`
    ),
    type: String(attachment.extension ?? attachment.type ?? "Arquivo").toUpperCase(),
    createdAt: formatDateLabel(String(attachment.attachment_date ?? "")),
    size: String(attachment.size ?? "Não informado"),
    metadata: {
      attachmentId: attachment.attachment_id ?? attachment.id ?? null,
      lawsuitInstance: instance ?? null,
      private: attachment.private ?? false,
      status: attachment.status ?? null,
    },
  }));

const normalizeRelatedProcesses = (related: JsonRecord[]) =>
  related.map((item, index) => ({
    id: String(item.id ?? item.lawsuit_cnj ?? index),
    cnj: String(item.lawsuit_cnj ?? item.code ?? "Não informado"),
    title: String(item.name ?? item.title ?? "Processo relacionado"),
    relationship: String(item.relationship ?? "Relacionado"),
    grade: mapGrade(item.instance as string | number | undefined),
    classProcessual: String(item.classification_name ?? ""),
  }));

const buildSnapshotPayload = (
  responseItem: JsonRecord,
  requestRowId: string,
  sourceKind: "query" | "history" | "detail" | "monitoring",
  createdAtLabel: string,
) => {
  const lawsuit = (responseItem.response_data ?? responseItem) as JsonRecord;
  const cnj = String(lawsuit.code ?? lawsuit.lawsuit_cnj ?? "").trim();

  if (!cnj) {
    return null;
  }

  const parties = normalizeParties(safeArray<JsonRecord>(lawsuit.parties));
  const activeParty = parties.find((party) => party.side === "Ativo")?.name ?? "Parte ativa";
  const passiveParty = parties.find((party) => party.side === "Passivo")?.name ?? "Parte passiva";
  const movements = normalizeMovements(safeArray<JsonRecord>(lawsuit.steps));
  const attachments = normalizeAttachments(
    safeArray<JsonRecord>(lawsuit.attachments),
    cnj,
    lawsuit.instance as string | number | undefined,
  );
  const classifications = pickNameFromItems(safeArray<JsonRecord>(lawsuit.classifications));
  const subjects = pickNameFromItems(safeArray<JsonRecord>(lawsuit.subjects));
  const courts = pickNameFromItems(safeArray<JsonRecord>(lawsuit.courts));

  return {
    cnj,
    title: String(lawsuit.name ?? `${activeParty} x ${passiveParty}`),
    active_party: activeParty,
    passive_party: passiveParty,
    tribunal: String(lawsuit.tribunal_acronym ?? ""),
    grade: mapGrade(lawsuit.instance as string | number | undefined),
    created_at_label: createdAtLabel,
    distributed_at_label: formatDateLabel(String(lawsuit.distribution_date ?? "")),
    status: mapStatus(String(lawsuit.status ?? lawsuit.situation ?? "")),
    orgao_julgador: courts[0] ?? "Não informado",
    class_processual: classifications[0] ?? "Não informado",
    assuntos: subjects,
    tags: [],
    parties,
    value_label: formatCurrencyLabel(
      typeof lawsuit.amount === "number" ? (lawsuit.amount as number) : Number(lawsuit.amount ?? NaN),
    ),
    last_movement:
      movements[0]?.title ??
      String((lawsuit.last_step as JsonRecord | undefined)?.content ?? "Sem movimentações registradas"),
    summary:
      String(lawsuit.area ?? "").trim() ||
      `${activeParty} x ${passiveParty}`,
    movements,
    attachments,
    related_processes: normalizeRelatedProcesses(safeArray<JsonRecord>(lawsuit.related_lawsuits)),
    origin_tribunal: String(lawsuit.tribunal_acronym ?? ""),
    comarca: String(lawsuit.county ?? ""),
    city: String(lawsuit.city ?? ""),
    state: String(lawsuit.state ?? ""),
    justice_segment: String(lawsuit.justice_description ?? ""),
    phase: String(lawsuit.phase ?? ""),
    judge_relator: String(lawsuit.judge ?? ""),
    ai_disclaimer:
      "Os dados abaixo refletem a consolidação mais recente retornada pela Judit e podem exigir validação jurídica humana.",
    last_request_id: requestRowId,
    last_response_id: String(responseItem.response_id ?? ""),
    source_kind: sourceKind,
    completeness: movements.length > 0 || attachments.length > 0 ? "full" : "summary",
    raw_response: responseItem,
    metadata: {
      area: lawsuit.area ?? null,
      secrecy_level: lawsuit.secrecy_level ?? null,
      crawler: lawsuit.crawler ?? null,
      last_step: lawsuit.last_step ?? null,
    },
  };
};

const upsertSnapshots = async ({
  admin,
  requestRowId,
  sourceKind,
  createdAtLabel,
  responseItems,
}: {
  admin: AdminClient;
  requestRowId: string;
  sourceKind: "query" | "history" | "detail" | "monitoring";
  createdAtLabel: string;
  responseItems: JsonRecord[];
}) => {
  const expandedItems: JsonRecord[] = [];

  responseItems.forEach((item) => {
    const responseType = String(item.response_type ?? "");
    const responseData = item.response_data;

    if (responseType === "lawsuits" && Array.isArray(responseData)) {
      responseData.forEach((lawsuit, index) => {
        expandedItems.push({
          ...item,
          response_id: `${item.response_id ?? "resp"}:${index}`,
          response_data: lawsuit,
          response_type: "lawsuit",
        });
      });
      return;
    }

    expandedItems.push(item);
  });

  const payloads = expandedItems
    .map((item) => buildSnapshotPayload(item, requestRowId, sourceKind, createdAtLabel))
    .filter(Boolean);

  const snapshots: JsonRecord[] = [];

  for (const payload of payloads) {
    const { data, error } = await admin
      .from("process_snapshots")
      .upsert(payload, { onConflict: "cnj" })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Erro ao salvar process_snapshots: ${error?.message ?? "desconhecido"}`);
    }

    snapshots.push(data as unknown as JsonRecord);

    const { error: linkError } = await admin
      .from("process_request_results")
      .upsert({
        process_query_request_id: requestRowId,
        process_snapshot_id: data.id,
      }, {
        onConflict: "process_query_request_id,process_snapshot_id",
      });

    if (linkError) {
      throw new Error(`Erro ao salvar process_request_results: ${linkError.message}`);
    }
  }

  return snapshots;
};

const getRequestResultsByRequestIds = async (admin: AdminClient, requestIds: string[]) => {
  const links: JsonRecord[] = [];

  for (const batch of chunkArray(requestIds)) {
    const { data, error } = await admin
      .from("process_request_results")
      .select("*")
      .in("process_query_request_id", batch);

    if (error) {
      throw new Error(`Erro ao carregar process_request_results: ${error.message}`);
    }

    links.push(...safeArray<JsonRecord>(data));
  }

  return links;
};

const getSnapshotsByIds = async (admin: AdminClient, snapshotIds: string[]) => {
  const snapshots: JsonRecord[] = [];

  for (const batch of chunkArray(snapshotIds)) {
    const { data, error } = await admin
      .from("process_snapshots")
      .select("*")
      .in("id", batch);

    if (error) {
      throw new Error(`Erro ao carregar process_snapshots: ${error.message}`);
    }

    snapshots.push(...safeArray<JsonRecord>(data));
  }

  return snapshots;
};

const getUserStateMaps = async (admin: AdminClient, userId: string, snapshotIds: string[]) => {
  if (!snapshotIds.length) {
    return {
      stateBySnapshot: new Map<string, JsonRecord>(),
      monitoringBySnapshot: new Map<string, JsonRecord>(),
    };
  }

  const userStateRows: JsonRecord[] = [];
  const monitoringRows: JsonRecord[] = [];

  for (const batch of chunkArray(snapshotIds)) {
    const [userStateResult, monitoringResult] = await Promise.all([
      admin
        .from("process_user_state")
        .select("*")
        .eq("auth_user_id", userId)
        .in("process_snapshot_id", batch),
      admin
        .from("process_monitorings")
        .select("*")
        .eq("auth_user_id", userId)
        .in("process_snapshot_id", batch)
        .is("deleted_at", null),
    ]);

    if (userStateResult.error) {
      throw new Error(`Erro ao carregar process_user_state: ${userStateResult.error.message}`);
    }

    if (monitoringResult.error) {
      throw new Error(`Erro ao carregar process_monitorings: ${monitoringResult.error.message}`);
    }

    userStateRows.push(...safeArray<JsonRecord>(userStateResult.data));
    monitoringRows.push(...safeArray<JsonRecord>(monitoringResult.data));
  }

  const stateBySnapshot = new Map<string, JsonRecord>();
  const monitoringBySnapshot = new Map<string, JsonRecord>();

  userStateRows.forEach((row) => {
    stateBySnapshot.set(String(row.process_snapshot_id), row);
  });

  monitoringRows.forEach((row) => {
    if (
      row.process_snapshot_id &&
      !monitoringBySnapshot.has(String(row.process_snapshot_id))
    ) {
      monitoringBySnapshot.set(String(row.process_snapshot_id), row);
    }
  });

  return {
    stateBySnapshot,
    monitoringBySnapshot,
  };
};

const toProcessSummary = (
  snapshot: JsonRecord,
  state?: JsonRecord,
  monitoring?: JsonRecord,
  historyContext?: { type: string; value: string },
) => ({
  id: String(snapshot.id),
  cnj: String(snapshot.cnj ?? ""),
  title: String(snapshot.title ?? ""),
  activeParty: String(snapshot.active_party ?? ""),
  passiveParty: String(snapshot.passive_party ?? ""),
  tribunal: String(snapshot.tribunal ?? ""),
  grade: String(snapshot.grade ?? "1ª instância"),
  createdAt: String(snapshot.created_at_label ?? "Não informado"),
  distributedAt: String(snapshot.distributed_at_label ?? "Não informado"),
  status:
    monitoring && normalize(String(monitoring.status ?? "")) !== "paused"
      ? "Monitorado"
      : String(snapshot.status ?? "Em andamento"),
  orgaoJulgador: String(snapshot.orgao_julgador ?? "Não informado"),
  classProcessual: String(snapshot.class_processual ?? "Não informado"),
  assuntos: safeArray<string>(snapshot.assuntos),
  tags: safeArray<string>(snapshot.tags),
  parties: safeArray<JsonRecord>(snapshot.parties),
  value: String(snapshot.value_label ?? "Não informado"),
  lastMovement: String(snapshot.last_movement ?? "Sem movimentações"),
  favorite: Boolean(state?.is_favorite),
  monitored:
    Boolean(monitoring) &&
    normalize(String(monitoring?.status ?? "")) !== "paused",
  historyContext,
});

const toProcessDetail = (
  snapshot: JsonRecord,
  state?: JsonRecord,
  monitoring?: JsonRecord,
) => ({
  ...toProcessSummary(snapshot, state, monitoring),
  summary: String(snapshot.summary ?? "Resumo indisponível."),
  movements: safeArray<JsonRecord>(snapshot.movements),
  attachments: safeArray<JsonRecord>(snapshot.attachments),
  relatedProcesses: safeArray<JsonRecord>(snapshot.related_processes),
  agentInsights: [],
  originTribunal: String(snapshot.origin_tribunal ?? ""),
  comarca: String(snapshot.comarca ?? ""),
  city: String(snapshot.city ?? ""),
  state: String(snapshot.state ?? ""),
  justiceSegment: String(snapshot.justice_segment ?? ""),
  phase: String(snapshot.phase ?? ""),
  judgeRelator: String(snapshot.judge_relator ?? ""),
  aiDisclaimer: String(snapshot.ai_disclaimer ?? ""),
});

const matchesFilters = (snapshot: JsonRecord, filters: ListParams["filters"] = {}) => {
  const snapshotTags = safeArray<string>(snapshot.tags);
  const snapshotAssuntos = safeArray<string>(snapshot.assuntos);
  const snapshotParties = safeArray<JsonRecord>(snapshot.parties);

  if (filters.tags?.length && !filters.tags.every((tag) => snapshotTags.includes(tag))) {
    return false;
  }

  if (
    filters.tribunals?.length &&
    !filters.tribunals.some((tribunal) => normalize(String(snapshot.tribunal ?? "")) === normalize(tribunal))
  ) {
    return false;
  }

  if (
    filters.partyNames?.length &&
    !filters.partyNames.some((name) =>
      snapshotParties.some((party) => normalize(String(party.name ?? "")).includes(normalize(name))),
    )
  ) {
    return false;
  }

  if (
    filters.partySides?.length &&
    !filters.partySides.some((side) =>
      snapshotParties.some((party) => normalize(String(party.side ?? "")) === normalize(side)),
    )
  ) {
    return false;
  }

  if (
    filters.partyDocuments?.length &&
    !filters.partyDocuments.some((document) =>
      snapshotParties.some((party) =>
        normalizeDocument(String(party.document ?? "")).includes(normalizeDocument(document)),
      ),
    )
  ) {
    return false;
  }

  if (
    filters.classesProcessuais?.length &&
    !filters.classesProcessuais.some((item) =>
      normalize(String(snapshot.class_processual ?? "")).includes(normalize(item)),
    )
  ) {
    return false;
  }

  if (
    filters.assuntos?.length &&
    !filters.assuntos.some((item) =>
      snapshotAssuntos.some((subject) => normalize(subject).includes(normalize(item))),
    )
  ) {
    return false;
  }

  const distributedAt = String(snapshot.distributed_at_label ?? "");
  const [day, month, year] = distributedAt.split("/");
  const comparableDate = year && month && day ? `${year}-${month}-${day}` : "";

  if (filters.distributedFrom && comparableDate && comparableDate < filters.distributedFrom) {
    return false;
  }

  if (filters.distributedTo && comparableDate && comparableDate > filters.distributedTo) {
    return false;
  }

  return true;
};

const paginate = <T>(items: T[], page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
};

const listProcessSummaries = async ({
  admin,
  userId,
  kinds,
  params,
  searchType,
  searchValue,
}: {
  admin: AdminClient;
  userId: string;
  kinds: Array<"cnj" | "history" | "detail_refresh">;
  params: ListParams;
  searchType?: SearchType;
  searchValue?: string;
}) => {
  let query = admin
    .from("process_query_requests")
    .select("*")
    .eq("auth_user_id", userId)
    .in("request_kind", kinds)
    .order("created_at", { ascending: false });

  if (searchType) {
    query = query.eq("search_type", searchType);
  }

  if (searchValue) {
    query = query.eq("search_key_hash", await sha256(`${searchType}:${normalize(searchValue)}`));
  }

  const { data: requests, error: requestsError } = await query;
  if (requestsError) {
    throw new Error(`Erro ao carregar process_query_requests: ${requestsError.message}`);
  }

  const requestIds = safeArray<JsonRecord>(requests).map((row) => String(row.id));
  if (!requestIds.length) {
    return paginate([], params.page ?? 1, toPageSize(params.pageSize));
  }

  const links = await getRequestResultsByRequestIds(admin, requestIds);

  const requestById = new Map(requestIds.map((id) => [id, safeArray<JsonRecord>(requests).find((row) => String(row.id) === id)!]));
  const latestLinkBySnapshot = new Map<string, JsonRecord>();

  links.forEach((link) => {
    const snapshotId = String(link.process_snapshot_id);
    const request = requestById.get(String(link.process_query_request_id));
    if (!request) return;

    const current = latestLinkBySnapshot.get(snapshotId);
    if (!current) {
      latestLinkBySnapshot.set(snapshotId, { ...link, __request: request });
      return;
    }

    const currentCreatedAt = String((current.__request as JsonRecord).created_at ?? "");
    const nextCreatedAt = String(request.created_at ?? "");
    if (nextCreatedAt > currentCreatedAt) {
      latestLinkBySnapshot.set(snapshotId, { ...link, __request: request });
    }
  });

  const snapshotIds = Array.from(latestLinkBySnapshot.keys());
  const snapshots = await getSnapshotsByIds(admin, snapshotIds);

  const snapshotById = new Map(
    snapshots.map((snapshot) => [String(snapshot.id), snapshot]),
  );

  const { stateBySnapshot, monitoringBySnapshot } = await getUserStateMaps(admin, userId, snapshotIds);

  const items = Array.from(latestLinkBySnapshot.entries())
    .map(([snapshotId, link]) => {
      const snapshot = snapshotById.get(snapshotId);
      if (!snapshot) return null;

      const state = stateBySnapshot.get(snapshotId);
      if (state?.is_deleted) return null;

      const request = link.__request as JsonRecord;
      const historyContext =
        String(request.request_kind) === "history"
          ? {
              type: String(request.search_type ?? "").toUpperCase(),
              value: String(request.search_value_label ?? ""),
            }
          : undefined;

      return {
        summary: toProcessSummary(
          snapshot,
          state,
          monitoringBySnapshot.get(snapshotId),
          historyContext,
        ),
        requestCreatedAt: String(request.created_at ?? ""),
      };
    })
    .filter(Boolean) as Array<{ summary: ReturnType<typeof toProcessSummary>; requestCreatedAt: string }>;

  const filtered = items
    .filter(({ summary }) => {
      if (!params.search) return true;
      const haystack = [summary.cnj, summary.title, summary.activeParty, summary.passiveParty]
        .map(normalize)
        .join(" ");
      return haystack.includes(normalize(params.search));
    })
    .filter(({ summary }) =>
      matchesFilters({
        tribunal: summary.tribunal,
        class_processual: summary.classProcessual,
        assuntos: summary.assuntos,
        parties: summary.parties,
        tags: summary.tags,
        distributed_at_label: summary.distributedAt,
      }, params.filters),
    )
    .sort((left, right) => right.requestCreatedAt.localeCompare(left.requestCreatedAt))
    .map(({ summary }) => summary);

  return paginate(filtered, params.page ?? 1, toPageSize(params.pageSize));
};

const handleDashboard = async (admin: AdminClient, userId: string) => {
  const [queries, history, favoritesResult, monitoringsResult] = await Promise.all([
    listProcessSummaries({ admin, userId, kinds: ["cnj"], params: { page: 1, pageSize: 999 } }),
    listProcessSummaries({ admin, userId, kinds: ["history"], params: { page: 1, pageSize: 999 } }),
    admin
      .from("process_user_state")
      .select("process_snapshot_id")
      .eq("auth_user_id", userId)
      .eq("is_favorite", true)
      .eq("is_deleted", false),
    admin
      .from("process_monitorings")
      .select("id")
      .eq("auth_user_id", userId)
      .is("deleted_at", null),
  ]);

  if (favoritesResult.error) {
    throw new Error(`Erro ao carregar favoritos: ${favoritesResult.error.message}`);
  }

  if (monitoringsResult.error) {
    throw new Error(`Erro ao carregar monitoramentos: ${monitoringsResult.error.message}`);
  }

  const favoriteSnapshotIds = safeArray<JsonRecord>(favoritesResult.data).map((row) => String(row.process_snapshot_id));
  const favoriteSet = new Set(favoriteSnapshotIds);
  const favorites = [...queries.items, ...history.items]
    .filter((item) => favoriteSet.has(item.id))
    .slice(0, 4);

  return {
    stats: {
      queriedProcesses: queries.total,
      historicalQueries: history.total,
      monitorings: safeArray<JsonRecord>(monitoringsResult.data).length,
    },
    favorites,
  };
};

const ensureSnapshotAccess = async (admin: AdminClient, userId: string, snapshotId: string) => {
  const [stateResult, monitoringResult, resultLinkResult] = await Promise.all([
    admin.from("process_user_state").select("id").eq("auth_user_id", userId).eq("process_snapshot_id", snapshotId).limit(1),
    admin.from("process_monitorings").select("id").eq("auth_user_id", userId).eq("process_snapshot_id", snapshotId).is("deleted_at", null).limit(1),
    admin
      .from("process_request_results")
      .select("id, process_query_request_id")
      .eq("process_snapshot_id", snapshotId),
  ]);

  if (stateResult.error || monitoringResult.error || resultLinkResult.error) {
    throw new Error("Erro ao validar acesso ao processo.");
  }

  const hasRequestAccess = safeArray<JsonRecord>(resultLinkResult.data).length
    ? await (async () => {
        const requestIds = safeArray<JsonRecord>(resultLinkResult.data).map((row) => String(row.process_query_request_id));
        const { data, error } = await admin
          .from("process_query_requests")
          .select("id")
          .eq("auth_user_id", userId)
          .in("id", requestIds)
          .limit(1);

        if (error) throw new Error(`Erro ao validar process_query_requests: ${error.message}`);
        return safeArray<JsonRecord>(data).length > 0;
      })()
    : false;

  if (
    !safeArray<JsonRecord>(stateResult.data).length &&
    !safeArray<JsonRecord>(monitoringResult.data).length &&
    !hasRequestAccess
  ) {
    throw new Error("Processo não encontrado para o usuário atual.");
  }
};

const getSnapshotById = async (admin: AdminClient, snapshotId: string) => {
  const { data, error } = await admin
    .from("process_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .single();

  if (error || !data) {
    throw new Error(`Erro ao carregar processo: ${error?.message ?? "não encontrado"}`);
  }

  return data as unknown as JsonRecord;
};

const runCnjRefresh = async ({
  admin,
  userId,
  config,
  cnj,
  requestKind,
  withAttachments,
  sourceKind,
}: {
  admin: AdminClient;
  userId: string;
  config: JuditConfig;
  cnj: string;
  requestKind: "cnj" | "detail_refresh";
  withAttachments: boolean;
  sourceKind: "query" | "detail";
}) => {
  const juditRequestResponse = await createJuditSearchRequest({
    config,
    searchType: "lawsuit_cnj",
    searchKey: cnj,
    responseType: "lawsuit",
    withAttachments,
  });

  const requestRow = await createProcessQueryRequest({
    admin,
    userId,
    requestKind,
    searchType: "lawsuit_cnj",
    searchValue: cnj,
    responseType: "lawsuit",
    requestedWithAttachments: withAttachments,
    juditRequestId: String(juditRequestResponse.request_id ?? ""),
    initialStatus: String(juditRequestResponse.status ?? "processing"),
    initialResponsePayload: juditRequestResponse,
  });
  await upsertConsumptionEntry({
    admin,
    juditRequestId: String(juditRequestResponse.request_id ?? ""),
    requestKind,
    searchType: "lawsuit_cnj",
    searchValue: cnj,
    responseType: "lawsuit",
    requestedWithAttachments: withAttachments,
    status: String(juditRequestResponse.status ?? "processing"),
    payload: juditRequestResponse,
    createdAt: String(requestRow.started_at ?? new Date().toISOString()),
  });
  const requestStatus = await waitForJuditRequestCompletion(
    config,
    String(juditRequestResponse.request_id),
    INITIAL_REQUEST_WAIT_MS,
  );

  await updateProcessQueryRequest(admin, String(requestRow.id), {
    status: requestStatus?.status ?? "processing",
    response_payload: requestStatus ?? {},
    finished_at: isTerminalRequestStatus(String(requestStatus?.status ?? "")) ? new Date().toISOString() : null,
  });
  await upsertConsumptionEntry({
    admin,
    juditRequestId: String(juditRequestResponse.request_id ?? ""),
    requestKind,
    searchType: "lawsuit_cnj",
    searchValue: cnj,
    responseType: "lawsuit",
    requestedWithAttachments: withAttachments,
    status: String(requestStatus?.status ?? juditRequestResponse.status ?? "processing"),
    payload: requestStatus ?? juditRequestResponse,
    createdAt: String(requestRow.started_at ?? new Date().toISOString()),
    updatedAt: new Date().toISOString(),
  });

  if (normalize(String(requestStatus?.status ?? "")) !== "completed") {
    return {
      status: requestStatus?.status ?? "processing",
      requestRowId: String(requestRow.id),
      juditRequestId: String(juditRequestResponse.request_id ?? ""),
      snapshot: null,
    };
  }

  const responses = await listJuditResponses(config, String(juditRequestResponse.request_id));
  const snapshots = await upsertSnapshots({
    admin,
    requestRowId: String(requestRow.id),
    sourceKind,
    createdAtLabel: formatDateLabel(String(requestRow.started_at)),
    responseItems: responses,
  });

  return {
    status: "completed",
    requestRowId: String(requestRow.id),
    juditRequestId: String(juditRequestResponse.request_id ?? ""),
    snapshot: snapshots[0] ?? null,
  };
};

const handleSearchCnj = async (admin: AdminClient, userId: string, config: JuditConfig, payload: JsonRecord) => {
  const cnj = String(payload.cnj ?? "").trim();
  if (!cnj) {
    throw new Error("Informe o número CNJ.");
  }

  const result = await runCnjRefresh({
    admin,
    userId,
    config,
    cnj,
    requestKind: "cnj",
    withAttachments: Boolean(payload.withAttachments),
    sourceKind: "query",
  });

  return {
    status: result.status,
    requestId: result.requestRowId,
    juditRequestId: result.juditRequestId,
    process: result.snapshot ? toProcessSummary(result.snapshot) : null,
  };
};

const handleSearchHistory = async (admin: AdminClient, userId: string, config: JuditConfig, payload: JsonRecord) => {
  const documentType = normalize(String(payload.documentType ?? "")).toUpperCase() as Uppercase<SearchType>;
  const documentValue = String(payload.documentValue ?? "").trim();

  if (!["CPF", "CNPJ", "OAB"].includes(documentType) || !documentValue) {
    throw new Error("Informe o tipo e valor do documento para a consulta histórica.");
  }

  const searchType = normalize(documentType) as SearchType;
  const juditRequestResponse = await createJuditSearchRequest({
    config,
    searchType,
    searchKey: documentValue,
    responseType: "lawsuits",
    withAttachments: false,
  });

  const requestRow = await createProcessQueryRequest({
    admin,
    userId,
    requestKind: "history",
    searchType,
    searchValue: documentValue,
    responseType: "lawsuits",
    requestedWithAttachments: false,
    juditRequestId: String(juditRequestResponse.request_id ?? ""),
    initialStatus: String(juditRequestResponse.status ?? "processing"),
    initialResponsePayload: juditRequestResponse,
  });
  await upsertConsumptionEntry({
    admin,
    juditRequestId: String(juditRequestResponse.request_id ?? ""),
    requestKind: "history",
    searchType,
    searchValue: documentValue,
    responseType: "lawsuits",
    requestedWithAttachments: false,
    status: String(juditRequestResponse.status ?? "processing"),
    payload: juditRequestResponse,
    createdAt: String(requestRow.started_at ?? new Date().toISOString()),
  });
  const requestStatus = await waitForJuditRequestCompletion(
    config,
    String(juditRequestResponse.request_id),
    INITIAL_REQUEST_WAIT_MS,
  );

  await updateProcessQueryRequest(admin, String(requestRow.id), {
    status: requestStatus?.status ?? "processing",
    response_payload: requestStatus ?? {},
    finished_at: isTerminalRequestStatus(String(requestStatus?.status ?? "")) ? new Date().toISOString() : null,
  });
  await upsertConsumptionEntry({
    admin,
    juditRequestId: String(juditRequestResponse.request_id ?? ""),
    requestKind: "history",
    searchType,
    searchValue: documentValue,
    responseType: "lawsuits",
    requestedWithAttachments: false,
    status: String(requestStatus?.status ?? juditRequestResponse.status ?? "processing"),
    payload: requestStatus ?? juditRequestResponse,
    createdAt: String(requestRow.started_at ?? new Date().toISOString()),
    updatedAt: new Date().toISOString(),
  });

  if (normalize(String(requestStatus?.status ?? "")) !== "completed") {
    return {
      status: requestStatus?.status ?? "processing",
      requestId: String(requestRow.id),
      juditRequestId: String(juditRequestResponse.request_id ?? ""),
    };
  }

  const responses = await listJuditResponses(config, String(juditRequestResponse.request_id));
  await upsertSnapshots({
    admin,
    requestRowId: String(requestRow.id),
    sourceKind: "history",
    createdAtLabel: formatDateLabel(String(requestRow.started_at)),
    responseItems: responses,
  });

  return {
    status: "completed",
    requestId: String(requestRow.id),
    juditRequestId: String(juditRequestResponse.request_id ?? ""),
  };
};

const handleGetProcessDetails = async (admin: AdminClient, userId: string, config: JuditConfig, payload: JsonRecord) => {
  const snapshotId = String(payload.snapshotId ?? payload.caseId ?? "");
  if (!snapshotId) {
    throw new Error("Processo não informado.");
  }

  await ensureSnapshotAccess(admin, userId, snapshotId);
  let snapshot = await getSnapshotById(admin, snapshotId);

  if (Boolean(payload.forceRefresh) || String(snapshot.completeness ?? "summary") !== "full") {
    const refreshed = await runCnjRefresh({
      admin,
      userId,
      config,
      cnj: String(snapshot.cnj),
      requestKind: "detail_refresh",
      withAttachments: true,
      sourceKind: "detail",
    });

    if (refreshed.snapshot) {
      snapshot = refreshed.snapshot;
    }
  }

  const { stateBySnapshot, monitoringBySnapshot } = await getUserStateMaps(admin, userId, [String(snapshot.id)]);

  return toProcessDetail(
    snapshot,
    stateBySnapshot.get(String(snapshot.id)),
    monitoringBySnapshot.get(String(snapshot.id)),
  );
};

const handleGetFilterOptions = async (admin: AdminClient, userId: string) => {
  const allQueries = await listProcessSummaries({
    admin,
    userId,
    kinds: ["cnj", "history", "detail_refresh"],
    params: { page: 1, pageSize: 999 },
  });

  const tribunals = new Set<string>();
  const partyNames = new Set<string>();
  const classesProcessuais = new Set<string>();
  const assuntos = new Set<string>();
  const partyDocuments = new Set<string>();

  allQueries.items.forEach((item) => {
    if (item.tribunal) tribunals.add(item.tribunal);
    if (item.classProcessual) classesProcessuais.add(item.classProcessual);
    item.assuntos.forEach((assunto) => assunto && assuntos.add(assunto));
    item.parties.forEach((party) => {
      if (party?.name) partyNames.add(String(party.name));
      if (party?.document) partyDocuments.add(String(party.document));
    });
  });

  return {
    tribunals: [...tribunals].sort(),
    partyNames: [...partyNames].sort(),
    classesProcessuais: [...classesProcessuais].sort(),
    assuntos: [...assuntos].sort(),
    partyDocuments: [...partyDocuments].sort(),
  };
};

const handleToggleFavorite = async (admin: AdminClient, userId: string, payload: JsonRecord) => {
  const snapshotId = String(payload.snapshotId ?? payload.processId ?? "");
  await ensureSnapshotAccess(admin, userId, snapshotId);

  const { data: existing, error: existingError } = await admin
    .from("process_user_state")
    .select("*")
    .eq("auth_user_id", userId)
    .eq("process_snapshot_id", snapshotId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Erro ao consultar favorito: ${existingError.message}`);
  }

  const nextValue = !Boolean(existing?.is_favorite);

  const { error } = await admin.from("process_user_state").upsert({
    auth_user_id: userId,
    process_snapshot_id: snapshotId,
    is_favorite: nextValue,
    is_deleted: existing?.is_deleted ?? false,
  }, {
    onConflict: "auth_user_id,process_snapshot_id",
  });

  if (error) {
    throw new Error(`Erro ao atualizar favorito: ${error.message}`);
  }

  return { favorite: nextValue };
};

const handleDeleteProcess = async (admin: AdminClient, userId: string, payload: JsonRecord) => {
  const snapshotId = String(payload.snapshotId ?? payload.processId ?? "");
  await ensureSnapshotAccess(admin, userId, snapshotId);

  const { error } = await admin.from("process_user_state").upsert({
    auth_user_id: userId,
    process_snapshot_id: snapshotId,
    is_deleted: true,
  }, {
    onConflict: "auth_user_id,process_snapshot_id",
  });

  if (error) {
    throw new Error(`Erro ao excluir processo da listagem: ${error.message}`);
  }

  return { deleted: true };
};

const createJuditMonitoring = async ({
  config,
  searchType,
  searchKey,
  responseType,
}: {
  config: JuditConfig;
  searchType: SearchType;
  searchKey: string;
  responseType: string;
}) =>
  juditRequest<JsonRecord>(config, config.trackingBaseUrl, "/tracking", {
    method: "POST",
    body: JSON.stringify({
      recurrence: 1,
      search: {
        search_type: searchType,
        search_key: searchKey,
        response_type: responseType,
      },
    }),
  });

const mutateJuditMonitoring = async (
  config: JuditConfig,
  trackingId: string,
  action: "pause" | "resume" | "delete" | "get",
) => {
  if (action === "get") {
    return juditRequest<JsonRecord>(config, config.trackingBaseUrl, `/tracking/${trackingId}`, { method: "GET" });
  }

  if (action === "delete") {
    return juditRequest<JsonRecord>(config, config.trackingBaseUrl, `/tracking/${trackingId}`, { method: "DELETE" });
  }

  return juditRequest<JsonRecord>(config, config.trackingBaseUrl, `/tracking/${trackingId}/${action}`, { method: "POST" });
};

const handleToggleProcessMonitoring = async (admin: AdminClient, userId: string, config: JuditConfig, payload: JsonRecord) => {
  const snapshotId = String(payload.snapshotId ?? payload.processId ?? "");
  await ensureSnapshotAccess(admin, userId, snapshotId);
  const snapshot = await getSnapshotById(admin, snapshotId);

  const { data: existing, error: existingError } = await admin
    .from("process_monitorings")
    .select("*")
    .eq("auth_user_id", userId)
    .eq("process_snapshot_id", snapshotId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Erro ao consultar monitoramento processual: ${existingError.message}`);
  }

  if (!existing || existing.deleted_at) {
    const remote = await createJuditMonitoring({
      config,
      searchType: "lawsuit_cnj",
      searchKey: String(snapshot.cnj),
      responseType: "lawsuit",
    });

    const { error } = await admin.from("process_monitorings").insert({
      auth_user_id: userId,
      process_snapshot_id: snapshotId,
      tracking_id: remote.tracking_id,
      monitoring_kind: "process",
      search_type: "lawsuit_cnj",
      search_key_hash: await sha256(`lawsuit_cnj:${normalize(String(snapshot.cnj))}`),
      search_key_masked: maskSearchKey(String(snapshot.cnj)),
      search_value_label: String(snapshot.cnj),
      label: String(snapshot.title),
      scope: "Movimentações do processo",
      recurrence: Number(remote.recurrence ?? 1),
      status: String(remote.status ?? "created"),
      remote_payload: remote,
      last_synced_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Erro ao criar monitoramento processual: ${error.message}`);
    }

    return { monitored: true };
  }

  const currentStatus = normalize(String(existing.status ?? ""));
  const nextAction = currentStatus === "paused" ? "resume" : "pause";
  const remote = await mutateJuditMonitoring(config, String(existing.tracking_id), nextAction);

  const { error } = await admin
    .from("process_monitorings")
    .update({
      status: String(remote.status ?? existing.status),
      paused_at: nextAction === "pause" ? new Date().toISOString() : null,
      remote_payload: remote,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) {
    throw new Error(`Erro ao atualizar monitoramento processual: ${error.message}`);
  }

  return { monitored: nextAction === "resume" };
};

const handleToggleDocumentSearchMonitoring = async (admin: AdminClient, userId: string, config: JuditConfig, payload: JsonRecord) => {
  const documentType = normalize(String(payload.documentType ?? "")).toUpperCase();
  const documentValue = String(payload.documentValue ?? "").trim();
  if (!["CPF", "CNPJ", "OAB"].includes(documentType) || !documentValue) {
    throw new Error("Informe o documento para monitoramento.");
  }

  const searchType = normalize(documentType) as SearchType;
  const searchKeyHash = await sha256(`${searchType}:${normalize(documentValue)}`);

  const { data: existing, error: existingError } = await admin
    .from("process_monitorings")
    .select("*")
    .eq("auth_user_id", userId)
    .eq("monitoring_kind", "document")
    .eq("search_key_hash", searchKeyHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Erro ao consultar monitoramento de documento: ${existingError.message}`);
  }

  if (!existing || existing.deleted_at) {
    const remote = await createJuditMonitoring({
      config,
      searchType,
      searchKey: documentValue,
      responseType: "lawsuits",
    });

    const { error } = await admin.from("process_monitorings").insert({
      auth_user_id: userId,
      tracking_id: remote.tracking_id,
      monitoring_kind: "document",
      search_type: searchType,
      search_key_hash: searchKeyHash,
      search_key_masked: maskSearchKey(documentValue),
      search_value_label: documentValue,
      label: `${documentType} ${documentValue}`,
      scope: "Novas distribuições e atualizações vinculadas ao documento",
      recurrence: Number(remote.recurrence ?? 1),
      status: String(remote.status ?? "created"),
      remote_payload: remote,
      last_synced_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Erro ao criar monitoramento de documento: ${error.message}`);
    }

    return { monitored: true };
  }

  const currentStatus = normalize(String(existing.status ?? ""));
  const nextAction = currentStatus === "paused" ? "resume" : "pause";
  const remote = await mutateJuditMonitoring(config, String(existing.tracking_id), nextAction);

  const { error } = await admin
    .from("process_monitorings")
    .update({
      status: String(remote.status ?? existing.status),
      paused_at: nextAction === "pause" ? new Date().toISOString() : null,
      remote_payload: remote,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) {
    throw new Error(`Erro ao atualizar monitoramento de documento: ${error.message}`);
  }

  return { monitored: nextAction === "resume" };
};

const handleToggleDocumentMonitoring = async (admin: AdminClient, userId: string, config: JuditConfig, payload: JsonRecord) => {
  const monitoringId = String(payload.monitoringId ?? "");
  const { data: existing, error: existingError } = await admin
    .from("process_monitorings")
    .select("*")
    .eq("id", monitoringId)
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (existingError || !existing) {
    throw new Error(`Monitoramento não encontrado: ${existingError?.message ?? "desconhecido"}`);
  }

  const currentStatus = normalize(String(existing.status ?? ""));
  const nextAction = currentStatus === "paused" ? "resume" : "pause";
  const remote = await mutateJuditMonitoring(config, String(existing.tracking_id), nextAction);

  const { error } = await admin
    .from("process_monitorings")
    .update({
      status: String(remote.status ?? existing.status),
      paused_at: nextAction === "pause" ? new Date().toISOString() : null,
      remote_payload: remote,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) {
    throw new Error(`Erro ao atualizar monitoramento: ${error.message}`);
  }

  return { monitored: nextAction === "resume" };
};

const handleGetMonitoringData = async (admin: AdminClient, userId: string) => {
  const { data, error } = await admin
    .from("process_monitorings")
    .select("*")
    .eq("auth_user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao carregar monitoramentos: ${error.message}`);
  }

  const monitorings = safeArray<JsonRecord>(data);
  const snapshotIds = monitorings
    .map((item) => String(item.process_snapshot_id ?? ""))
    .filter(Boolean);

  const snapshots = snapshotIds.length
    ? await getSnapshotsByIds(admin, snapshotIds)
    : [];

  const snapshotById = new Map(
    snapshots.map((snapshot) => [String(snapshot.id), snapshot]),
  );
  const { stateBySnapshot } = await getUserStateMaps(admin, userId, snapshotIds);

  const monitoredProcesses = monitorings
    .filter((item) => item.monitoring_kind === "process")
    .map((item) => {
      const snapshot = snapshotById.get(String(item.process_snapshot_id ?? ""));
      if (!snapshot) return null;
      return toProcessSummary(snapshot, stateBySnapshot.get(String(snapshot.id)), item);
    })
    .filter(Boolean);

  const monitoredDocuments = monitorings
    .filter((item) => item.monitoring_kind === "document")
    .map((item) => ({
      id: String(item.id),
      documentType: String(item.search_type ?? "").toUpperCase(),
      documentValue: String(item.search_value_label ?? ""),
      label: String(item.label ?? ""),
      scope: String(item.scope ?? ""),
      status: normalize(String(item.status ?? "")) === "paused" ? "Pausado" : "Ativo",
    }));

  const feed = monitorings.slice(0, 10).map((item, index) => ({
    id: String(item.id ?? index),
    title:
      item.monitoring_kind === "process"
        ? `Monitoramento do processo ${item.search_value_label}`
        : `Monitoramento do documento ${item.search_value_label}`,
    description: `Status atual: ${String(item.status ?? "created")}. Última sincronização em ${formatDateLabel(String(item.updated_at ?? item.created_at ?? ""))}.`,
    createdAt: formatDateLabel(String(item.updated_at ?? item.created_at ?? "")),
  }));

  return {
    monitoredProcesses,
    monitoredDocuments,
    feed,
  };
};

const handleGetRequestStatus = async (admin: AdminClient, userId: string, config: JuditConfig, payload: JsonRecord) => {
  const requestId = String(payload.requestId ?? "");
  const { data: requestRow, error } = await admin
    .from("process_query_requests")
    .select("*")
    .eq("id", requestId)
    .eq("auth_user_id", userId)
    .single();

  if (error || !requestRow) {
    throw new Error(`Consulta não encontrada: ${error?.message ?? "desconhecido"}`);
  }

  if (!requestRow.judit_request_id) {
    return {
      status: requestRow.status,
      requestId,
      juditRequestId: null,
    };
  }

  if (normalize(String(requestRow.status ?? "")) === "completed") {
    return {
      status: requestRow.status,
      requestId,
      juditRequestId: requestRow.judit_request_id,
    };
  }

  const latestStatus = await waitForJuditRequestCompletion(config, String(requestRow.judit_request_id), 1000);
  await updateProcessQueryRequest(admin, requestId, {
    status: latestStatus?.status ?? requestRow.status,
    response_payload: latestStatus ?? requestRow.response_payload,
    finished_at: isTerminalRequestStatus(String(latestStatus?.status ?? "")) ? new Date().toISOString() : null,
  });
  await upsertConsumptionEntry({
    admin,
    juditRequestId: String(requestRow.judit_request_id),
    requestKind: requestRow.request_kind as "cnj" | "history" | "detail_refresh",
    searchType: requestRow.search_type as SearchType,
    searchValue: String(requestRow.search_value_label ?? ""),
    responseType: String(requestRow.response_type ?? ""),
    requestedWithAttachments: Boolean(requestRow.requested_with_attachments),
    status: String(latestStatus?.status ?? requestRow.status ?? "processing"),
    payload: (latestStatus ?? requestRow.response_payload ?? {}) as JsonRecord,
    createdAt: String(requestRow.started_at ?? requestRow.created_at ?? new Date().toISOString()),
    updatedAt: new Date().toISOString(),
  });

  if (normalize(String(latestStatus?.status ?? "")) === "completed") {
    const responses = await listJuditResponses(config, String(requestRow.judit_request_id));
    await upsertSnapshots({
      admin,
      requestRowId: requestId,
      sourceKind: requestRow.request_kind === "history" ? "history" : requestRow.request_kind === "detail_refresh" ? "detail" : "query",
      createdAtLabel: formatDateLabel(String(requestRow.started_at)),
      responseItems: responses,
    });
  }

  return {
    status: latestStatus?.status ?? requestRow.status,
    requestId,
    juditRequestId: requestRow.judit_request_id,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, admin } = await getAuthContext(req);
    const config = await loadJuditConfig(admin);
    const payload = req.method === "GET"
      ? Object.fromEntries(new URL(req.url).searchParams.entries())
      : ((await req.json()) as JsonRecord);

    const action = String(payload.action ?? "");

    switch (action) {
      case "dashboard":
        return buildJsonResponse(200, await handleDashboard(admin, userId));
      case "list-queries":
        return buildJsonResponse(
          200,
          await listProcessSummaries({
            admin,
            userId,
            kinds: ["cnj"],
            params: payload as unknown as ListParams,
          }),
        );
      case "list-history":
        return buildJsonResponse(
          200,
          await listProcessSummaries({
            admin,
            userId,
            kinds: ["history"],
            params: payload as unknown as ListParams,
            searchType: payload.documentType ? normalize(String(payload.documentType)) as SearchType : undefined,
            searchValue: payload.documentValue ? String(payload.documentValue) : undefined,
          }),
        );
      case "filter-options":
        return buildJsonResponse(200, await handleGetFilterOptions(admin, userId));
      case "search-cnj":
        return buildJsonResponse(200, await handleSearchCnj(admin, userId, config, payload));
      case "search-history":
        return buildJsonResponse(200, await handleSearchHistory(admin, userId, config, payload));
      case "request-status":
        return buildJsonResponse(200, await handleGetRequestStatus(admin, userId, config, payload));
      case "process-details":
        return buildJsonResponse(200, await handleGetProcessDetails(admin, userId, config, payload));
      case "monitoring-data":
        return buildJsonResponse(200, await handleGetMonitoringData(admin, userId));
      case "toggle-favorite":
        return buildJsonResponse(200, await handleToggleFavorite(admin, userId, payload));
      case "delete-process":
        return buildJsonResponse(200, await handleDeleteProcess(admin, userId, payload));
      case "toggle-process-monitoring":
        return buildJsonResponse(200, await handleToggleProcessMonitoring(admin, userId, config, payload));
      case "toggle-document-monitoring":
        return buildJsonResponse(200, await handleToggleDocumentMonitoring(admin, userId, config, payload));
      case "toggle-document-search-monitoring":
        return buildJsonResponse(200, await handleToggleDocumentSearchMonitoring(admin, userId, config, payload));
      default:
        return buildJsonResponse(400, { error: "Ação inválida." });
    }
  } catch (error) {
    console.error("Erro em judit-processes:", error);
    return buildJsonResponse(500, {
      error: error instanceof Error ? error.message : "Erro desconhecido ao processar integração Judit.",
    });
  }
});
