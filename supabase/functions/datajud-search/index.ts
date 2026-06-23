import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildTribunalSearchUrl, onlyDigitsCnj, resolveTribunalAlias } from "./aliases.ts";
import {
  buildSnapshotPayload,
  formatDateLabel,
  snapshotToDetail,
  snapshotToSummary,
} from "./mappers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DATAJUD_BASE_URL = Deno.env.get("DATAJUD_BASE_URL") ?? "https://api-publica.datajud.cnj.jus.br";
const DATAJUD_API_KEY = Deno.env.get("DATAJUD_API_KEY");

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const ADVANCED_DEFAULT_SIZE = 25;
const ADVANCED_MAX_SIZE = 100;
const DATAJUD_TIMEOUT_MS = 30000;

type JsonRecord = Record<string, unknown>;
type AdminClient = ReturnType<typeof createClient>;
type RequestKind = "cnj" | "advanced" | "detail_refresh";

interface AuthContext {
  userId: string;
  admin: AdminClient;
}

interface ListFilters {
  tribunals?: string[];
  classesProcessuais?: string[];
  assuntos?: string[];
  grades?: string[];
  orgaosJulgadores?: string[];
  distributedFrom?: string;
  distributedTo?: string;
}

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filters?: ListFilters;
}

const buildJsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const safeArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

// Divide um array em lotes para evitar URLs gigantes em filtros `in.(...)`
// do PostgREST (que estouram o limite de header/URL com muitos ids).
const chunk = <T>(items: T[], size = 100): T[][] => {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
};

const toPageSize = (pageSize?: number) =>
  Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize ?? DEFAULT_PAGE_SIZE));

const sha256 = async (value: string) => {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((chunk) => chunk.toString(16).padStart(2, "0"))
    .join("");
};

const maskSearchKey = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 4) return "*".repeat(trimmed.length);
  return `${"*".repeat(Math.max(trimmed.length - 4, 2))}${trimmed.slice(-4)}`;
};

const requireApiKey = (): string => {
  if (!DATAJUD_API_KEY) {
    throw new Error("DATAJUD_API_KEY não configurada.");
  }
  return DATAJUD_API_KEY;
};

/** Executa uma busca no índice do tribunal, com 1 retry para 429/5xx. */
const datajudSearch = async (alias: string, body: JsonRecord): Promise<JsonRecord> => {
  const apiKey = requireApiKey();
  const url = buildTribunalSearchUrl(DATAJUD_BASE_URL, alias);

  const execute = async (): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DATAJUD_TIMEOUT_MS);
    try {
      return await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `APIKey ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  let response = await execute();
  if (response.status === 429 || response.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    response = await execute();
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`DataJud ${response.status}: ${errorText}`);
  }

  return (await response.json()) as JsonRecord;
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

  return { userId: user.id, admin };
};

const createProcessQueryRequest = async ({
  admin,
  userId,
  requestKind,
  searchType,
  searchValue,
  responseType,
  requestPayload,
}: {
  admin: AdminClient;
  userId: string;
  requestKind: RequestKind;
  searchType: string;
  searchValue: string;
  responseType: string;
  requestPayload: JsonRecord;
}) => {
  const searchKeyHash = await sha256(`${searchType}:${normalize(searchValue)}`);
  const { data, error } = await admin
    .from("process_query_requests")
    .insert({
      auth_user_id: userId,
      request_kind: requestKind,
      search_type: searchType,
      search_key_hash: searchKeyHash,
      search_key_masked: maskSearchKey(searchValue),
      search_value_label: searchValue,
      response_type: responseType,
      status: "completed",
      request_payload: requestPayload,
      response_payload: {},
      finished_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Erro ao criar process_query_requests: ${error?.message ?? "desconhecido"}`);
  }

  return data;
};

const upsertSnapshots = async ({
  admin,
  requestRowId,
  sources,
  sourceKind,
  alias,
}: {
  admin: AdminClient;
  requestRowId: string;
  sources: JsonRecord[];
  sourceKind: "query" | "advanced" | "detail";
  alias: string;
}) => {
  const snapshots: JsonRecord[] = [];

  for (const source of sources) {
    const payload = buildSnapshotPayload(source, requestRowId, sourceKind, alias);
    if (!payload) continue;

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
      .upsert(
        { process_query_request_id: requestRowId, process_snapshot_id: data.id },
        { onConflict: "process_query_request_id,process_snapshot_id" },
      );

    if (linkError) {
      throw new Error(`Erro ao salvar process_request_results: ${linkError.message}`);
    }
  }

  return snapshots;
};

const paginate = <T>(items: T[], page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
};

const toComparableDate = (label: string) => {
  const [day, month, year] = label.split("/");
  return year && month && day ? `${year}-${month}-${day}` : "";
};

const matchesFilters = (summary: ReturnType<typeof snapshotToSummary>, filters: ListFilters = {}) => {
  const tribunal = String(summary.tribunal ?? "");
  const classProcessual = String(summary.classProcessual ?? "");
  const orgaoJulgador = String(summary.orgaoJulgador ?? "");
  const grade = String(summary.grade ?? "");
  const assuntos = safeArray<string>(summary.assuntos);

  if (filters.tribunals?.length && !filters.tribunals.some((item) => normalize(item) === normalize(tribunal))) {
    return false;
  }
  if (
    filters.classesProcessuais?.length &&
    !filters.classesProcessuais.some((item) => normalize(classProcessual).includes(normalize(item)))
  ) {
    return false;
  }
  if (
    filters.orgaosJulgadores?.length &&
    !filters.orgaosJulgadores.some((item) => normalize(orgaoJulgador).includes(normalize(item)))
  ) {
    return false;
  }
  if (filters.grades?.length && !filters.grades.some((item) => normalize(item) === normalize(grade))) {
    return false;
  }
  if (
    filters.assuntos?.length &&
    !filters.assuntos.some((item) => assuntos.some((assunto) => normalize(assunto).includes(normalize(item))))
  ) {
    return false;
  }

  const comparableDate = toComparableDate(String(summary.distributedAt ?? ""));
  if (filters.distributedFrom && comparableDate && comparableDate < filters.distributedFrom) {
    return false;
  }
  if (filters.distributedTo && comparableDate && comparableDate > filters.distributedTo) {
    return false;
  }

  return true;
};

const listProcessSummaries = async ({
  admin,
  userId,
  params,
}: {
  admin: AdminClient;
  userId: string;
  params: ListParams;
}) => {
  const { data: requests, error: requestsError } = await admin
    .from("process_query_requests")
    .select("id, created_at")
    .eq("auth_user_id", userId)
    .order("created_at", { ascending: false });

  if (requestsError) {
    throw new Error(`Erro ao carregar process_query_requests: ${requestsError.message}`);
  }

  const requestRows = safeArray<JsonRecord>(requests);
  const requestIds = requestRows.map((row) => String(row.id));
  if (!requestIds.length) {
    return paginate([], params.page ?? 1, toPageSize(params.pageSize));
  }

  const createdAtByRequest = new Map(requestRows.map((row) => [String(row.id), String(row.created_at ?? "")]));

  const links: JsonRecord[] = [];
  for (const part of chunk(requestIds)) {
    const { data, error } = await admin
      .from("process_request_results")
      .select("process_query_request_id, process_snapshot_id")
      .in("process_query_request_id", part);
    if (error) {
      throw new Error(`Erro ao carregar process_request_results: ${error.message}`);
    }
    links.push(...safeArray<JsonRecord>(data));
  }

  const latestCreatedAtBySnapshot = new Map<string, string>();
  links.forEach((link) => {
    const snapshotId = String(link.process_snapshot_id);
    const createdAt = createdAtByRequest.get(String(link.process_query_request_id)) ?? "";
    const current = latestCreatedAtBySnapshot.get(snapshotId);
    if (!current || createdAt > current) {
      latestCreatedAtBySnapshot.set(snapshotId, createdAt);
    }
  });

  const snapshotIds = Array.from(latestCreatedAtBySnapshot.keys());
  if (!snapshotIds.length) {
    return paginate([], params.page ?? 1, toPageSize(params.pageSize));
  }

  const snapshots: JsonRecord[] = [];
  const states: JsonRecord[] = [];
  for (const part of chunk(snapshotIds)) {
    const [snapshotsResult, statesResult] = await Promise.all([
      admin.from("process_snapshots").select("*").in("id", part),
      admin.from("process_user_state").select("*").eq("auth_user_id", userId).in("process_snapshot_id", part),
    ]);
    if (snapshotsResult.error) {
      throw new Error(`Erro ao carregar process_snapshots: ${snapshotsResult.error.message}`);
    }
    if (statesResult.error) {
      throw new Error(`Erro ao carregar process_user_state: ${statesResult.error.message}`);
    }
    snapshots.push(...safeArray<JsonRecord>(snapshotsResult.data));
    states.push(...safeArray<JsonRecord>(statesResult.data));
  }

  const stateBySnapshot = new Map<string, JsonRecord>();
  states.forEach((row) => {
    stateBySnapshot.set(String(row.process_snapshot_id), row);
  });

  const items = snapshots
    .map((snapshot) => {
      const snapshotId = String(snapshot.id);
      const state = stateBySnapshot.get(snapshotId);
      if (state?.is_deleted) return null;
      return {
        summary: snapshotToSummary(snapshot, state),
        createdAt: latestCreatedAtBySnapshot.get(snapshotId) ?? "",
      };
    })
    .filter(Boolean) as Array<{ summary: ReturnType<typeof snapshotToSummary>; createdAt: string }>;

  const filtered = items
    .filter(({ summary }) => {
      if (!params.search) return true;
      const haystack = [summary.cnj, summary.title, summary.classProcessual, summary.orgaoJulgador]
        .map((value) => normalize(String(value)))
        .join(" ");
      return haystack.includes(normalize(params.search));
    })
    .filter(({ summary }) => matchesFilters(summary, params.filters))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(({ summary }) => summary);

  return paginate(filtered, params.page ?? 1, toPageSize(params.pageSize));
};

const ensureSnapshotAccess = async (admin: AdminClient, userId: string, snapshotId: string) => {
  const [stateResult, resultLinkResult] = await Promise.all([
    admin
      .from("process_user_state")
      .select("id")
      .eq("auth_user_id", userId)
      .eq("process_snapshot_id", snapshotId)
      .limit(1),
    admin.from("process_request_results").select("process_query_request_id").eq("process_snapshot_id", snapshotId),
  ]);

  if (stateResult.error || resultLinkResult.error) {
    throw new Error("Erro ao validar acesso ao processo.");
  }

  if (safeArray<JsonRecord>(stateResult.data).length) {
    return;
  }

  const requestIds = safeArray<JsonRecord>(resultLinkResult.data).map((row) =>
    String(row.process_query_request_id),
  );
  if (requestIds.length) {
    const { data, error } = await admin
      .from("process_query_requests")
      .select("id")
      .eq("auth_user_id", userId)
      .in("id", requestIds)
      .limit(1);
    if (error) throw new Error(`Erro ao validar process_query_requests: ${error.message}`);
    if (safeArray<JsonRecord>(data).length) return;
  }

  throw new Error("Processo não encontrado para o usuário atual.");
};

const getSnapshotById = async (admin: AdminClient, snapshotId: string) => {
  const { data, error } = await admin.from("process_snapshots").select("*").eq("id", snapshotId).single();
  if (error || !data) {
    throw new Error(`Erro ao carregar processo: ${error?.message ?? "não encontrado"}`);
  }
  return data as unknown as JsonRecord;
};

// ---------------------------------------------------------------------------
// Handlers de ação
// ---------------------------------------------------------------------------

const handleSearchCnj = async (admin: AdminClient, userId: string, payload: JsonRecord) => {
  const cnjInput = String(payload.cnj ?? "").trim();
  const cnjDigits = onlyDigitsCnj(cnjInput);
  if (cnjDigits.length !== 20) {
    throw new Error("Informe um número CNJ válido (20 dígitos).");
  }

  const alias = resolveTribunalAlias(cnjDigits);
  if (!alias) {
    throw new Error("Não foi possível identificar o tribunal a partir do número CNJ informado.");
  }

  const response = await datajudSearch(alias, {
    query: { match: { numeroProcesso: cnjDigits } },
    size: 1,
  });

  const hits = safeArray<JsonRecord>((response.hits as JsonRecord | undefined)?.hits);
  const sources = hits.map((hit) => (hit._source ?? {}) as JsonRecord).filter((source) => source.numeroProcesso);

  if (!sources.length) {
    return { status: "not_found", process: null };
  }

  const requestRow = await createProcessQueryRequest({
    admin,
    userId,
    requestKind: "cnj",
    searchType: "numeroProcesso",
    searchValue: cnjDigits,
    responseType: "lawsuit",
    requestPayload: { cnj: cnjDigits, alias },
  });

  const snapshots = await upsertSnapshots({
    admin,
    requestRowId: String(requestRow.id),
    sources,
    sourceKind: "query",
    alias,
  });

  return {
    status: "completed",
    requestId: String(requestRow.id),
    process: snapshots[0] ? snapshotToSummary(snapshots[0]) : null,
  };
};

const buildAdvancedQuery = (payload: JsonRecord) => {
  const must: JsonRecord[] = [];

  const classeCodigo = Number(payload.classeCodigo ?? NaN);
  if (!Number.isNaN(classeCodigo)) must.push({ match: { "classe.codigo": classeCodigo } });

  const orgaoCodigo = Number(payload.orgaoJulgadorCodigo ?? NaN);
  if (!Number.isNaN(orgaoCodigo)) must.push({ match: { "orgaoJulgador.codigo": orgaoCodigo } });

  const assuntoCodigo = Number(payload.assuntoCodigo ?? NaN);
  if (!Number.isNaN(assuntoCodigo)) must.push({ match: { "assuntos.codigo": assuntoCodigo } });

  const grau = String(payload.grau ?? "").trim();
  if (grau) must.push({ match: { grau } });

  const from = String(payload.dataAjuizamentoFrom ?? "").trim();
  const to = String(payload.dataAjuizamentoTo ?? "").trim();
  if (from || to) {
    const range: JsonRecord = {};
    if (from) range.gte = from;
    if (to) range.lte = to;
    must.push({ range: { dataAjuizamento: range } });
  }

  const query = must.length ? { bool: { must } } : { match_all: {} };
  const size = Math.min(ADVANCED_MAX_SIZE, Math.max(1, Number(payload.size ?? ADVANCED_DEFAULT_SIZE)));

  const body: JsonRecord = {
    size,
    query,
    sort: [{ "@timestamp": { order: "asc" } }],
  };

  const searchAfter = safeArray<unknown>(payload.searchAfter);
  if (searchAfter.length) {
    body.search_after = searchAfter;
  }

  return { body, hasCriteria: must.length > 0 };
};

const handleAdvancedSearch = async (admin: AdminClient, userId: string, payload: JsonRecord) => {
  const alias = String(payload.tribunalAlias ?? "").trim().toLowerCase();
  if (!alias) {
    throw new Error("Selecione o tribunal para a busca avançada.");
  }

  const { body, hasCriteria } = buildAdvancedQuery(payload);
  if (!hasCriteria) {
    throw new Error("Informe ao menos um filtro (classe, assunto, órgão julgador, grau ou período).");
  }

  const response = await datajudSearch(alias, body);
  const hits = safeArray<JsonRecord>((response.hits as JsonRecord | undefined)?.hits);
  const sources = hits.map((hit) => (hit._source ?? {}) as JsonRecord).filter((source) => source.numeroProcesso);
  const lastHit = hits[hits.length - 1];
  const nextSearchAfter = lastHit ? safeArray<unknown>(lastHit.sort) : [];

  if (!sources.length) {
    return { status: "completed", count: 0, nextSearchAfter: [], process: null };
  }

  const requestRow = await createProcessQueryRequest({
    admin,
    userId,
    requestKind: "advanced",
    searchType: "advanced",
    searchValue: alias,
    responseType: "lawsuits",
    requestPayload: { alias, query: body },
  });

  const snapshots = await upsertSnapshots({
    admin,
    requestRowId: String(requestRow.id),
    sources,
    sourceKind: "advanced",
    alias,
  });

  return {
    status: "completed",
    requestId: String(requestRow.id),
    count: snapshots.length,
    nextSearchAfter,
  };
};

const handleGetProcessDetails = async (admin: AdminClient, userId: string, payload: JsonRecord) => {
  const snapshotId = String(payload.snapshotId ?? payload.caseId ?? "");
  if (!snapshotId) {
    throw new Error("Processo não informado.");
  }

  await ensureSnapshotAccess(admin, userId, snapshotId);
  let snapshot = await getSnapshotById(admin, snapshotId);

  if (payload.forceRefresh) {
    const metadata = (snapshot.metadata ?? {}) as JsonRecord;
    const cnjDigits = onlyDigitsCnj(String(metadata.numeroProcessoRaw ?? snapshot.cnj ?? ""));
    const alias = resolveTribunalAlias(cnjDigits);
    if (alias && cnjDigits.length === 20) {
      const response = await datajudSearch(alias, {
        query: { match: { numeroProcesso: cnjDigits } },
        size: 1,
      });
      const hits = safeArray<JsonRecord>((response.hits as JsonRecord | undefined)?.hits);
      const sources = hits.map((hit) => (hit._source ?? {}) as JsonRecord).filter((s) => s.numeroProcesso);
      if (sources.length) {
        const requestRow = await createProcessQueryRequest({
          admin,
          userId,
          requestKind: "detail_refresh",
          searchType: "numeroProcesso",
          searchValue: cnjDigits,
          responseType: "lawsuit",
          requestPayload: { cnj: cnjDigits, alias },
        });
        const refreshed = await upsertSnapshots({
          admin,
          requestRowId: String(requestRow.id),
          sources,
          sourceKind: "detail",
          alias,
        });
        if (refreshed[0]) snapshot = refreshed[0];
      }
    }
  }

  const { data: state } = await admin
    .from("process_user_state")
    .select("*")
    .eq("auth_user_id", userId)
    .eq("process_snapshot_id", String(snapshot.id))
    .maybeSingle();

  return snapshotToDetail(snapshot, state ?? undefined);
};

const handleDashboard = async (admin: AdminClient, userId: string) => {
  const [queries, favoritesResult] = await Promise.all([
    listProcessSummaries({ admin, userId, params: { page: 1, pageSize: 999 } }),
    admin
      .from("process_user_state")
      .select("process_snapshot_id")
      .eq("auth_user_id", userId)
      .eq("is_favorite", true)
      .eq("is_deleted", false),
  ]);

  if (favoritesResult.error) {
    throw new Error(`Erro ao carregar favoritos: ${favoritesResult.error.message}`);
  }

  const favoriteSet = new Set(
    safeArray<JsonRecord>(favoritesResult.data).map((row) => String(row.process_snapshot_id)),
  );
  const favorites = queries.items.filter((item) => favoriteSet.has(item.id)).slice(0, 4);

  return {
    stats: { queriedProcesses: queries.total },
    favorites,
  };
};

const handleFilterOptions = async (admin: AdminClient, userId: string) => {
  const allQueries = await listProcessSummaries({ admin, userId, params: { page: 1, pageSize: 9999 } });

  const tribunals = new Set<string>();
  const classesProcessuais = new Set<string>();
  const assuntos = new Set<string>();
  const grades = new Set<string>();
  const orgaosJulgadores = new Set<string>();

  allQueries.items.forEach((item) => {
    if (item.tribunal) tribunals.add(String(item.tribunal));
    if (item.classProcessual) classesProcessuais.add(String(item.classProcessual));
    if (item.grade) grades.add(String(item.grade));
    if (item.orgaoJulgador) orgaosJulgadores.add(String(item.orgaoJulgador));
    safeArray<string>(item.assuntos).forEach((assunto) => assunto && assuntos.add(assunto));
  });

  return {
    tribunals: [...tribunals].sort(),
    classesProcessuais: [...classesProcessuais].sort(),
    assuntos: [...assuntos].sort(),
    grades: [...grades].sort(),
    orgaosJulgadores: [...orgaosJulgadores].sort(),
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

  const nextValue = !existing?.is_favorite;
  const { error } = await admin.from("process_user_state").upsert(
    {
      auth_user_id: userId,
      process_snapshot_id: snapshotId,
      is_favorite: nextValue,
      is_deleted: existing?.is_deleted ?? false,
    },
    { onConflict: "auth_user_id,process_snapshot_id" },
  );

  if (error) {
    throw new Error(`Erro ao atualizar favorito: ${error.message}`);
  }

  return { favorite: nextValue };
};

const handleDeleteProcess = async (admin: AdminClient, userId: string, payload: JsonRecord) => {
  const snapshotId = String(payload.snapshotId ?? payload.processId ?? "");
  await ensureSnapshotAccess(admin, userId, snapshotId);

  const { error } = await admin.from("process_user_state").upsert(
    { auth_user_id: userId, process_snapshot_id: snapshotId, is_deleted: true },
    { onConflict: "auth_user_id,process_snapshot_id" },
  );

  if (error) {
    throw new Error(`Erro ao excluir processo da listagem: ${error.message}`);
  }

  return { deleted: true };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, admin } = await getAuthContext(req);
    const payload = (await req.json().catch(() => ({}))) as JsonRecord;
    const action = String(payload.action ?? "");

    switch (action) {
      case "dashboard":
        return buildJsonResponse(200, await handleDashboard(admin, userId));
      case "list-queries":
        return buildJsonResponse(
          200,
          await listProcessSummaries({ admin, userId, params: payload as ListParams }),
        );
      case "filter-options":
        return buildJsonResponse(200, await handleFilterOptions(admin, userId));
      case "search-cnj":
        return buildJsonResponse(200, await handleSearchCnj(admin, userId, payload));
      case "advanced-search":
        return buildJsonResponse(200, await handleAdvancedSearch(admin, userId, payload));
      case "process-details":
        return buildJsonResponse(200, await handleGetProcessDetails(admin, userId, payload));
      case "toggle-favorite":
        return buildJsonResponse(200, await handleToggleFavorite(admin, userId, payload));
      case "delete-process":
        return buildJsonResponse(200, await handleDeleteProcess(admin, userId, payload));
      default:
        return buildJsonResponse(400, { error: `Ação não suportada: ${action}` });
    }
  } catch (error) {
    console.error("Erro em datajud-search:", error);
    return buildJsonResponse(500, {
      error: error instanceof Error ? error.message : "Erro desconhecido na consulta DataJud.",
    });
  }
});

// Mantém o helper exportado disponível para testes locais.
export { formatDateLabel };
