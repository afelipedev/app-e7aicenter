import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_INCLUDED_PLAN_BRL = 1000;
const DEFAULT_MAX_MONTHLY_AMOUNT_BRL = 5000;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SYNC_PAGE_SIZE = 100;
const SYNC_CACHE_WINDOW_MS = 15 * 60 * 1000;
const PRICING_VERSION = "2026-03-17-v1";
const JUDIT_BASE_URL = Deno.env.get("JUDIT_BASE_URL") ?? "https://requests.prod.judit.io";
const JUDIT_API_KEY = Deno.env.get("JUDIT_API_KEY");

type RequestOrigin = "api" | "tracking";
type BillingStatus = "within_plan" | "additional_billing" | "threshold_reached";
type CostConfidence = "exact" | "estimated" | "pending_enrichment" | "unknown";
type CostType = "included" | "overage" | "mixed" | "estimated";

type JsonRecord = Record<string, unknown>;

interface JuditSearchPayload {
  on_demand?: boolean;
  search_type?: string;
  search_key?: string;
  response_type?: string;
  search_params?: {
    public_search?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface JuditRequestPayload {
  _id?: string;
  request_id: string;
  search?: JuditSearchPayload;
  origin?: RequestOrigin | string;
  origin_id?: string;
  user_id?: string;
  company_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  with_attachments?: boolean;
  plan_config_type?: string;
  judit_ia?: unknown[];
  filters_count?: number;
  [key: string]: unknown;
}

interface JuditRequestsApiResponse {
  page?: number;
  page_data?: JuditRequestPayload[];
  page_count?: number;
  all_count?: number;
  all_pages_count?: number;
}

interface JuditResponsesApiResponse {
  page_data?: unknown[];
  all_count?: number;
}

interface BillingProduct {
  code: string;
  label: string;
  priceBrl: number;
  billingUnit: "request" | "per_1000_returned_processes" | "captured_process";
}

interface BillingSettingsRow {
  included_amount_brl: number | string | null;
  max_monthly_amount_brl: number | string | null;
  pricing_version: string | null;
}

interface JuditRuntimeConfig {
  apiKey: string;
  baseUrl: string;
  source: "env" | "database";
}

interface SyncRunRow {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  request_start_date: string;
  request_end_date: string;
  requests_imported: number;
  pages_fetched: number;
  force_sync: boolean;
  error_message: string | null;
}

interface StoredJuditRequestRow {
  request_id: string;
  origin: string;
  status: string;
  created_at_judit: string;
  updated_at_judit: string | null;
  billing_reference_month: string;
  search_type: string | null;
  response_type: string | null;
  search_key_masked: string | null;
  on_demand: boolean;
  with_attachments: boolean;
  public_search: boolean;
  product_name: string | null;
  cost_brl: number;
  cost_type: string;
  cost_confidence: CostConfidence;
  has_overage: boolean;
  returned_items_count: number | null;
  plan_config_type: string | null;
  pricing_metadata: JsonRecord | null;
  pricing_version: string;
}

interface FunctionPayload {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  forceSync?: boolean;
  enrichResponses?: boolean;
  filters?: {
    origin?: string[];
    status?: string[];
    searchType?: string[];
    productName?: string[];
    withAttachments?: boolean | null;
    onDemand?: boolean | null;
  };
}

const BILLING_PRODUCTS: Record<string, BillingProduct> = {
  process_consultation: {
    code: "process_consultation",
    label: "Consulta processual",
    priceBrl: 0.25,
    billingUnit: "request",
  },
  historical_datalake: {
    code: "historical_datalake",
    label: "Consulta historica (Data Lake)",
    priceBrl: 1.5,
    billingUnit: "request",
  },
  historical_on_demand: {
    code: "historical_on_demand",
    label: "Consulta historica (On Demand)",
    priceBrl: 6,
    billingUnit: "per_1000_returned_processes",
  },
  attachments: {
    code: "attachments",
    label: "Autos processuais (Anexos)",
    priceBrl: 3.5,
    billingUnit: "request",
  },
  lawsuit_monitoring: {
    code: "lawsuit_monitoring",
    label: "Monitoramento processual",
    priceBrl: 1.5,
    billingUnit: "request",
  },
  new_lawsuit_monitoring: {
    code: "new_lawsuit_monitoring",
    label: "Monitoramento de novas acoes",
    priceBrl: 15,
    billingUnit: "request",
  },
  custom_monitoring_base: {
    code: "custom_monitoring_base",
    label: "Monitoramento customizado",
    priceBrl: 100,
    billingUnit: "request",
  },
  arrest_warrant: {
    code: "arrest_warrant",
    label: "Mandado de prisao",
    priceBrl: 1,
    billingUnit: "request",
  },
  criminal_execution: {
    code: "criminal_execution",
    label: "Execucao criminal",
    priceBrl: 0.5,
    billingUnit: "request",
  },
  registry_datalake: {
    code: "registry_datalake",
    label: "Dados cadastrais (Data Lake)",
    priceBrl: 0.12,
    billingUnit: "request",
  },
  registry_on_demand: {
    code: "registry_on_demand",
    label: "Dados cadastrais (On Demand)",
    priceBrl: 0.15,
    billingUnit: "request",
  },
  historical_synthetic: {
    code: "historical_synthetic",
    label: "Consulta historica sintetica",
    priceBrl: 0.75,
    billingUnit: "request",
  },
  historical_simple_counter: {
    code: "historical_simple_counter",
    label: "Consulta historica simples (Contador)",
    priceBrl: 0.5,
    billingUnit: "request",
  },
  process_summary_ai: {
    code: "process_summary_ai",
    label: "Resumo de processo (IA)",
    priceBrl: 0.1,
    billingUnit: "request",
  },
  entity_summary_ai: {
    code: "entity_summary_ai",
    label: "Resumo de entidade (IA)",
    priceBrl: 0.15,
    billingUnit: "request",
  },
};

const toNumeric = (value: number | string | null | undefined, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const parseDateInput = (value: string | undefined, fallback: Date) => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed;
};

const toDateOnly = (value: Date) => value.toISOString().slice(0, 10);

const getMonthStart = (value: Date) => {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  return toDateOnly(date);
};

const maskSearchKey = (value: string | undefined) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length <= 4) {
    return "*".repeat(trimmed.length);
  }

  return `${"*".repeat(Math.max(trimmed.length - 4, 2))}${trimmed.slice(-4)}`;
};

const normalizeKeyword = (value: string | undefined | null) => (value ?? "").trim().toLowerCase();

const classifyProduct = (item: JuditRequestPayload) => {
  const planConfigType = normalizeKeyword(item.plan_config_type);
  const responseType = normalizeKeyword(item.search?.response_type);
  const searchType = normalizeKeyword(item.search?.search_type);
  const origin = normalizeKeyword(item.origin);
  const onDemand = Boolean(item.search?.on_demand);
  const hasIA = Array.isArray(item.judit_ia) && item.judit_ia.length > 0;

  if (planConfigType.includes("summary") && planConfigType.includes("entity")) {
    return BILLING_PRODUCTS.entity_summary_ai;
  }

  if (planConfigType.includes("summary") || (hasIA && responseType === "lawsuit")) {
    return BILLING_PRODUCTS.process_summary_ai;
  }

  if (planConfigType.includes("synthetic")) {
    return BILLING_PRODUCTS.historical_synthetic;
  }

  if (planConfigType.includes("counter") || planConfigType.includes("contator") || planConfigType.includes("simple")) {
    return BILLING_PRODUCTS.historical_simple_counter;
  }

  if (planConfigType.includes("criminal")) {
    return BILLING_PRODUCTS.criminal_execution;
  }

  if (planConfigType.includes("warrant") || responseType === "warrant") {
    return BILLING_PRODUCTS.arrest_warrant;
  }

  if (responseType === "entity") {
    return onDemand ? BILLING_PRODUCTS.registry_on_demand : BILLING_PRODUCTS.registry_datalake;
  }

  if (origin === "tracking") {
    if (searchType === "lawsuit_cnj") {
      return BILLING_PRODUCTS.lawsuit_monitoring;
    }

    if (["cpf", "cnpj", "oab", "name"].includes(searchType)) {
      return BILLING_PRODUCTS.new_lawsuit_monitoring;
    }
  }

  if (responseType === "lawsuits") {
    return onDemand ? BILLING_PRODUCTS.historical_on_demand : BILLING_PRODUCTS.historical_datalake;
  }

  if (searchType === "lawsuit_cnj" || responseType === "lawsuit") {
    return BILLING_PRODUCTS.process_consultation;
  }

  return null;
};

const buildJsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const getRequestPayload = async (req: Request): Promise<FunctionPayload> => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const withAttachments = url.searchParams.get("withAttachments");
    const onDemand = url.searchParams.get("onDemand");

    return {
      startDate: url.searchParams.get("startDate") ?? undefined,
      endDate: url.searchParams.get("endDate") ?? undefined,
      page: Number(url.searchParams.get("page") ?? "1"),
      pageSize: Number(url.searchParams.get("pageSize") ?? `${DEFAULT_PAGE_SIZE}`),
      forceSync: url.searchParams.get("forceSync") === "true",
      enrichResponses: url.searchParams.get("enrichResponses") === "true",
      filters: {
        origin: url.searchParams.getAll("origin"),
        status: url.searchParams.getAll("status"),
        searchType: url.searchParams.getAll("searchType"),
        productName: url.searchParams.getAll("productName"),
        withAttachments: withAttachments === null ? null : withAttachments === "true",
        onDemand: onDemand === null ? null : onDemand === "true",
      },
    };
  }

  if (req.method === "POST") {
    return (await req.json()) as FunctionPayload;
  }

  return {};
};

const loadJuditRuntimeConfig = async (admin: ReturnType<typeof createClient>): Promise<JuditRuntimeConfig> => {
  if (JUDIT_API_KEY) {
    return {
      apiKey: JUDIT_API_KEY,
      baseUrl: JUDIT_BASE_URL,
      source: "env",
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
    throw new Error(`Erro ao carregar credenciais da Judit no Supabase: ${error.message}`);
  }

  if (!data?.api_key) {
    throw new Error("JUDIT_API_KEY não configurada na Edge Function.");
  }

  return {
    apiKey: data.api_key,
    baseUrl: data.base_url || JUDIT_BASE_URL,
    source: "database",
  };
};

const fetchJuditJson = async <T>(
  config: JuditRuntimeConfig,
  path: string,
  params: Record<string, string | number | boolean | undefined>,
) => {
  const url = new URL(path, config.baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "api-key": config.apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Judit API error ${response.status}: ${text || response.statusText}`);
  }

  return (await response.json()) as T;
};

const fetchJuditRequestsPage = async (
  config: JuditRuntimeConfig,
  startDate: string,
  endDate: string,
  page: number,
) =>
  fetchJuditJson<JuditRequestsApiResponse>(config, "/requests", {
    page_size: DEFAULT_SYNC_PAGE_SIZE,
    page,
    created_at_gte: startDate,
    created_at_lte: endDate,
  });

const fetchJuditResponsesCount = async (config: JuditRuntimeConfig, requestId: string) => {
  const data = await fetchJuditJson<JuditResponsesApiResponse>(config, "/responses", {
    page_size: 1,
    request_id: requestId,
  });

  if (typeof data.all_count === "number") {
    return data.all_count;
  }

  return Array.isArray(data.page_data) ? data.page_data.length : null;
};

const calculateRequestCost = async (
  config: JuditRuntimeConfig,
  item: JuditRequestPayload,
  enrichResponses: boolean,
) => {
  const product = classifyProduct(item);
  let costBrl = 0;
  let costConfidence: CostConfidence = "estimated";
  let returnedItemsCount: number | null = null;
  let returnedBatches: number | null = null;

  if (product) {
    if (product.billingUnit === "per_1000_returned_processes") {
      if (enrichResponses) {
        try {
          returnedItemsCount = await fetchJuditResponsesCount(config, item.request_id);
        } catch (_) {
          returnedItemsCount = null;
        }
      }

      if (typeof returnedItemsCount === "number" && returnedItemsCount >= 0) {
        returnedBatches = Math.max(1, Math.ceil(returnedItemsCount / 1000));
        costBrl += product.priceBrl * returnedBatches;
        costConfidence = "exact";
      } else {
        returnedBatches = 1;
        costBrl += product.priceBrl;
        costConfidence = "pending_enrichment";
      }
    } else {
      costBrl += product.priceBrl;
      costConfidence = "exact";
    }
  } else {
    costConfidence = "unknown";
  }

  let attachmentAddOnBrl = 0;
  if (item.with_attachments) {
    attachmentAddOnBrl = BILLING_PRODUCTS.attachments.priceBrl;
    costBrl += attachmentAddOnBrl;
    if (costConfidence === "unknown") {
      costConfidence = "estimated";
    }
  }

  return {
    product,
    costBrl: roundMoney(costBrl),
    costConfidence,
    returnedItemsCount,
    returnedBatches,
    attachmentAddOnBrl,
  };
};

const applyCostWindow = (rows: JsonRecord[], includedAmountBrl: number) => {
  const grouped = new Map<string, JsonRecord[]>();

  rows.forEach((row) => {
    const month = String(row.billing_reference_month ?? "");
    if (!grouped.has(month)) {
      grouped.set(month, []);
    }
    grouped.get(month)?.push(row);
  });

  grouped.forEach((monthRows) => {
    monthRows.sort((left, right) =>
      String(left.created_at_judit ?? "").localeCompare(String(right.created_at_judit ?? "")),
    );

    let monthRunningTotal = 0;

    monthRows.forEach((row) => {
      const requestCost = toNumeric(row.cost_brl as number | string | null | undefined, 0);
      const nextTotal = monthRunningTotal + requestCost;

      let costType: CostType = "estimated";
      if (nextTotal <= includedAmountBrl) {
        costType = "included";
      } else if (monthRunningTotal >= includedAmountBrl) {
        costType = "overage";
      } else {
        costType = "mixed";
      }

      row.cost_type = costType;
      row.has_overage = nextTotal > includedAmountBrl;
      monthRunningTotal = nextTotal;
    });
  });

  return rows;
};

const normalizeRequestRow = async (
  config: JuditRuntimeConfig,
  item: JuditRequestPayload,
  syncRunId: string,
  enrichResponses: boolean,
) => {
  const createdAt = item.created_at ?? new Date().toISOString();
  const createdAtDate = new Date(createdAt);
  const costResult = await calculateRequestCost(config, item, enrichResponses);
  const productName = costResult.product?.label ?? "Nao classificado";
  const searchKey = typeof item.search?.search_key === "string" ? item.search.search_key : undefined;
  const externalUserId = typeof item.user_id === "string" ? item.user_id : null;
  const externalCompanyId = typeof item.company_id === "string" ? item.company_id : null;

  return {
    request_id: item.request_id,
    origin: item.origin ?? "api",
    origin_id: item.origin_id ?? item.request_id,
    external_user_id: externalUserId,
    external_company_id: externalCompanyId,
    status: item.status ?? "unknown",
    created_at_judit: createdAt,
    updated_at_judit: item.updated_at ?? createdAt,
    billing_reference_month: getMonthStart(createdAtDate),
    search_type: item.search?.search_type ?? null,
    response_type: item.search?.response_type ?? null,
    search_key_masked: maskSearchKey(searchKey),
    on_demand: Boolean(item.search?.on_demand),
    with_attachments: Boolean(item.with_attachments),
    public_search: Boolean(item.search?.search_params?.public_search),
    plan_config_type: item.plan_config_type ?? null,
    filters_count: typeof item.filters_count === "number" ? item.filters_count : null,
    product_name: productName,
    cost_brl: costResult.costBrl,
    cost_type: "estimated" as CostType,
    cost_confidence: costResult.costConfidence,
    returned_items_count: costResult.returnedItemsCount,
    returned_batches: costResult.returnedBatches,
    has_overage: false,
    pricing_version: PRICING_VERSION,
    raw_payload: item,
    pricing_metadata: {
      product_code: costResult.product?.code ?? null,
      attachment_add_on_brl: costResult.attachmentAddOnBrl,
      classification_source: {
        plan_config_type: item.plan_config_type ?? null,
        origin: item.origin ?? null,
        response_type: item.search?.response_type ?? null,
        search_type: item.search?.search_type ?? null,
        on_demand: Boolean(item.search?.on_demand),
      },
    },
    sync_run_id: syncRunId,
  };
};

const syncJuditRequests = async ({
  admin,
  juditConfig,
  userId,
  startDate,
  endDate,
  forceSync,
  enrichResponses,
  includedAmountBrl,
}: {
  admin: ReturnType<typeof createClient>;
  juditConfig: JuditRuntimeConfig;
  userId: string;
  startDate: string;
  endDate: string;
  forceSync: boolean;
  enrichResponses: boolean;
  includedAmountBrl: number;
}) => {
  const { data: syncRun, error: syncRunError } = await admin
    .from("judit_sync_runs")
    .insert({
      request_start_date: startDate,
      request_end_date: endDate,
      status: "running",
      force_sync: forceSync,
      triggered_by: userId,
      metadata: {
        enrich_responses: enrichResponses,
      },
    })
    .select("*")
    .single();

  if (syncRunError || !syncRun) {
    throw new Error(`Erro ao criar judit_sync_runs: ${syncRunError?.message ?? "desconhecido"}`);
  }

  try {
    let currentPage = 1;
    let totalPages = 1;
    const normalizedRows: JsonRecord[] = [];

    while (currentPage <= totalPages) {
      const pageResult = await fetchJuditRequestsPage(juditConfig, startDate, endDate, currentPage);
      const items = Array.isArray(pageResult.page_data) ? pageResult.page_data : [];

      totalPages = pageResult.all_pages_count ?? pageResult.page_count ?? 1;

      for (const item of items) {
        normalizedRows.push(await normalizeRequestRow(juditConfig, item, syncRun.id, enrichResponses));
      }

      currentPage += 1;
    }

    const rowsWithCostWindow = applyCostWindow(normalizedRows, includedAmountBrl);

    for (const batch of chunkArray(rowsWithCostWindow, 200)) {
      const { error } = await admin.from("judit_requests").upsert(batch, {
        onConflict: "request_id",
      });

      if (error) {
        throw new Error(`Erro ao salvar judit_requests: ${error.message}`);
      }
    }

    const { data: persistedRows } = await admin
      .from("judit_requests")
      .select("request_id, cost_brl, billing_reference_month, created_at_judit")
      .gte("created_at_judit", `${startDate}T00:00:00.000Z`)
      .lte("created_at_judit", `${endDate}T23:59:59.999Z`);

    if (persistedRows) {
      const monthMap = new Map<string, typeof persistedRows>();
      persistedRows.forEach((row) => {
        const month = String(row.billing_reference_month);
        if (!monthMap.has(month)) {
          monthMap.set(month, []);
        }
        monthMap.get(month)?.push(row);
      });

      for (const [month, rows] of monthMap.entries()) {
        const sortedRows = [...rows].sort((left, right) => left.created_at_judit.localeCompare(right.created_at_judit));
        let runningTotal = 0;

        for (const row of sortedRows) {
          const requestCost = toNumeric(row.cost_brl, 0);
          const nextTotal = runningTotal + requestCost;
          const costType: CostType =
            nextTotal <= includedAmountBrl
              ? "included"
              : runningTotal >= includedAmountBrl
                ? "overage"
                : "mixed";

          await admin
            .from("judit_requests")
            .update({
              cost_type: costType,
              has_overage: nextTotal > includedAmountBrl,
            })
            .eq("request_id", row.request_id);

          runningTotal = nextTotal;
        }
      }
    }

    const { error: finalizeError } = await admin
      .from("judit_sync_runs")
      .update({
        status: "completed",
        pages_fetched: Math.max(totalPages, 1),
        requests_imported: normalizedRows.length,
        requests_processed: normalizedRows.length,
        finished_at: new Date().toISOString(),
      })
      .eq("id", syncRun.id);

    if (finalizeError) {
      throw new Error(`Erro ao finalizar judit_sync_runs: ${finalizeError.message}`);
    }

    const { data: completedSync } = await admin
      .from("judit_sync_runs")
      .select("*")
      .eq("id", syncRun.id)
      .single();

    return completedSync as SyncRunRow | null;
  } catch (error) {
    await admin
      .from("judit_sync_runs")
      .update({
        status: "error",
        error_message: error instanceof Error ? error.message : "Erro desconhecido",
        finished_at: new Date().toISOString(),
      })
      .eq("id", syncRun.id);

    throw error;
  }
};

const matchesArrayFilter = (value: string | null, filter: string[] | undefined) => {
  if (!filter || filter.length === 0) {
    return true;
  }

  return filter.includes(value ?? "");
};

const buildSummary = (
  rows: StoredJuditRequestRow[],
  includedAmountBrl: number,
  maxMonthlyAmountBrl: number,
) => {
  const totalRequests = rows.length;
  const consumedAmountBrl = roundMoney(rows.reduce((sum, row) => sum + toNumeric(row.cost_brl, 0), 0));
  const completedRequests = rows.filter((row) => row.status === "completed").length;
  const pendingRequests = totalRequests - completedRequests;
  const attachmentRequests = rows.filter((row) => row.with_attachments).length;
  const apiRequests = rows.filter((row) => row.origin === "api").length;
  const trackingRequests = rows.filter((row) => row.origin === "tracking").length;
  const remainingIncludedAmountBrl = roundMoney(Math.max(0, includedAmountBrl - consumedAmountBrl));
  const overageAmountBrl = roundMoney(Math.max(0, consumedAmountBrl - includedAmountBrl));
  const remainingUntilBlockAmountBrl = roundMoney(Math.max(0, maxMonthlyAmountBrl - consumedAmountBrl));

  const billingStatus: BillingStatus =
    consumedAmountBrl >= maxMonthlyAmountBrl
      ? "threshold_reached"
      : consumedAmountBrl > includedAmountBrl
        ? "additional_billing"
        : "within_plan";

  return {
    totalRequests,
    completedRequests,
    pendingRequests,
    attachmentRequests,
    apiRequests,
    trackingRequests,
    consumedAmountBrl,
    includedPlanBrl: includedAmountBrl,
    remainingIncludedAmountBrl,
    overageAmountBrl,
    remainingUntilBlockAmountBrl,
    maxMonthlyAmountBrl,
    billingStatus,
  };
};

const buildBreakdownByProduct = (rows: StoredJuditRequestRow[]) => {
  const breakdown = new Map<string, { label: string; totalCostBrl: number; totalRequests: number }>();

  rows.forEach((row) => {
    const key = row.product_name ?? "Nao classificado";
    const current = breakdown.get(key) ?? {
      label: key,
      totalCostBrl: 0,
      totalRequests: 0,
    };

    current.totalCostBrl += toNumeric(row.cost_brl, 0);
    current.totalRequests += 1;
    breakdown.set(key, current);
  });

  return Array.from(breakdown.values())
    .map((item) => ({
      ...item,
      totalCostBrl: roundMoney(item.totalCostBrl),
      averageCostBrl: item.totalRequests > 0 ? roundMoney(item.totalCostBrl / item.totalRequests) : 0,
    }))
    .sort((left, right) => right.totalCostBrl - left.totalCostBrl);
};

const buildBreakdownByOrigin = (rows: StoredJuditRequestRow[]) => {
  const labels: Record<string, string> = {
    api: "API",
    tracking: "Monitoramento",
  };

  const breakdown = new Map<string, { key: string; label: string; totalCostBrl: number; totalRequests: number }>();

  rows.forEach((row) => {
    const key = row.origin ?? "unknown";
    const current = breakdown.get(key) ?? {
      key,
      label: labels[key] ?? key,
      totalCostBrl: 0,
      totalRequests: 0,
    };

    current.totalCostBrl += toNumeric(row.cost_brl, 0);
    current.totalRequests += 1;
    breakdown.set(key, current);
  });

  return Array.from(breakdown.values()).map((item) => ({
    ...item,
    totalCostBrl: roundMoney(item.totalCostBrl),
  }));
};

const buildDailySeries = (rows: StoredJuditRequestRow[]) => {
  const dailyMap = new Map<string, { date: string; totalRequests: number; totalCostBrl: number }>();

  rows.forEach((row) => {
    const date = row.created_at_judit.slice(0, 10);
    const current = dailyMap.get(date) ?? {
      date,
      totalRequests: 0,
      totalCostBrl: 0,
    };

    current.totalRequests += 1;
    current.totalCostBrl += toNumeric(row.cost_brl, 0);
    dailyMap.set(date, current);
  });

  return Array.from(dailyMap.values())
    .map((item) => ({ ...item, totalCostBrl: roundMoney(item.totalCostBrl) }))
    .sort((left, right) => left.date.localeCompare(right.date));
};

const buildEntries = (rows: StoredJuditRequestRow[]) =>
  rows.map((row) => ({
    id: row.request_id,
    requestId: row.request_id,
    createdAt: row.created_at_judit,
    updatedAt: row.updated_at_judit,
    origin: row.origin,
    status: row.status,
    searchType: row.search_type,
    responseType: row.response_type,
    searchKeyMasked: row.search_key_masked,
    withAttachments: row.with_attachments,
    onDemand: row.on_demand,
    publicSearch: row.public_search,
    planConfigType: row.plan_config_type,
    productName: row.product_name ?? "Nao classificado",
    costBrl: roundMoney(toNumeric(row.cost_brl, 0)),
    costType: row.cost_type,
    costConfidence: row.cost_confidence,
    hasOverage: row.has_overage,
    returnedItemsCount: row.returned_items_count,
    pricingMetadata: row.pricing_metadata ?? {},
  }));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return buildJsonResponse(401, { error: "Não autorizado." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error("Configuração do Supabase incompleta na Edge Function.");
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return buildJsonResponse(401, { error: "Sessão inválida." });
    }

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const payload = await getRequestPayload(req);
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startDate = toDateOnly(parseDateInput(payload.startDate, startOfMonth));
    const endDate = toDateOnly(parseDateInput(payload.endDate, now));
    const page = Math.max(1, payload.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, payload.pageSize ?? DEFAULT_PAGE_SIZE));
    const forceSync = Boolean(payload.forceSync);
    const enrichResponses = Boolean(payload.enrichResponses);
    const juditConfig = await loadJuditRuntimeConfig(admin);

    const { data: billingSettings } = await admin
      .from("judit_billing_settings")
      .select("included_amount_brl, max_monthly_amount_brl, pricing_version")
      .eq("is_active", true)
      .order("active_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    const settings = billingSettings as BillingSettingsRow | null;
    const includedAmountBrl = toNumeric(settings?.included_amount_brl, DEFAULT_INCLUDED_PLAN_BRL);
    const maxMonthlyAmountBrl = toNumeric(settings?.max_monthly_amount_brl, DEFAULT_MAX_MONTHLY_AMOUNT_BRL);

    const { data: latestSync } = await admin
      .from("judit_sync_runs")
      .select("*")
      .eq("request_start_date", startDate)
      .eq("request_end_date", endDate)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestSyncRun = latestSync as SyncRunRow | null;
    const latestSyncAgeMs = latestSyncRun?.finished_at
      ? now.getTime() - new Date(latestSyncRun.finished_at).getTime()
      : Number.POSITIVE_INFINITY;

    const shouldSync =
      forceSync ||
      !latestSyncRun ||
      latestSyncRun.status !== "completed" ||
      latestSyncAgeMs > SYNC_CACHE_WINDOW_MS;

    const syncInfo = shouldSync
      ? await syncJuditRequests({
          admin,
          juditConfig,
          userId: user.id,
          startDate,
          endDate,
          forceSync,
          enrichResponses,
          includedAmountBrl,
        })
      : latestSyncRun;

    const { data: reportRows, error: reportError } = await admin
      .from("judit_requests")
      .select(
        "request_id, origin, status, created_at_judit, updated_at_judit, billing_reference_month, search_type, response_type, search_key_masked, on_demand, with_attachments, public_search, product_name, cost_brl, cost_type, cost_confidence, has_overage, returned_items_count, plan_config_type, pricing_metadata, pricing_version",
      )
      .gte("created_at_judit", `${startDate}T00:00:00.000Z`)
      .lte("created_at_judit", `${endDate}T23:59:59.999Z`)
      .order("created_at_judit", { ascending: false });

    if (reportError) {
      throw new Error(`Erro ao carregar judit_requests: ${reportError.message}`);
    }

    const typedRows = (reportRows ?? []) as StoredJuditRequestRow[];
    const filteredRows = typedRows.filter((row) => {
      if (!matchesArrayFilter(row.origin, payload.filters?.origin)) {
        return false;
      }

      if (!matchesArrayFilter(row.status, payload.filters?.status)) {
        return false;
      }

      if (!matchesArrayFilter(row.search_type, payload.filters?.searchType)) {
        return false;
      }

      if (!matchesArrayFilter(row.product_name, payload.filters?.productName)) {
        return false;
      }

      if (payload.filters?.withAttachments !== null && payload.filters?.withAttachments !== undefined) {
        if (row.with_attachments !== payload.filters.withAttachments) {
          return false;
        }
      }

      if (payload.filters?.onDemand !== null && payload.filters?.onDemand !== undefined) {
        if (row.on_demand !== payload.filters.onDemand) {
          return false;
        }
      }

      return true;
    });

    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const pagedRows = filteredRows.slice(startIndex, startIndex + pageSize);

    const { data: monthlyRows } = await admin
      .from("judit_consumption_monthly_view")
      .select("*")
      .gte("billing_reference_month", getMonthStart(parseDateInput(startDate, startOfMonth)))
      .lte("billing_reference_month", getMonthStart(parseDateInput(endDate, now)))
      .order("billing_reference_month", { ascending: true });

    return buildJsonResponse(200, {
      summary: buildSummary(filteredRows, includedAmountBrl, maxMonthlyAmountBrl),
      breakdownByProduct: buildBreakdownByProduct(filteredRows),
      breakdownByOrigin: buildBreakdownByOrigin(filteredRows),
      dailySeries: buildDailySeries(filteredRows),
      monthlySeries: monthlyRows ?? [],
      entries: buildEntries(pagedRows),
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
      },
      filtersApplied: payload.filters ?? {},
      sync: syncInfo,
      period: {
        startDate,
        endDate,
      },
      credentialSource: juditConfig.source,
      pricingVersion: settings?.pricing_version ?? PRICING_VERSION,
    });
  } catch (error) {
    console.error("Erro em judit-consumption-report:", error);
    return buildJsonResponse(500, {
      error: error instanceof Error ? error.message : "Erro desconhecido ao montar relatório da Judit.",
    });
  }
});
