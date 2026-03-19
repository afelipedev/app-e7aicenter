import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = "gpt-4o-mini";

type JsonRecord = Record<string, unknown>;
type SummarySections = {
  summary: string;
  parties: string;
  classification: string;
  subjects: string;
  movements: string;
  disclaimer: string;
};

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

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const sectionFallbacks: SummarySections = {
  summary: "Resumo indisponível.",
  parties: "Partes não identificadas.",
  classification: "Classificação indisponível.",
  subjects: "Assuntos não identificados.",
  movements: "Movimentações indisponíveis.",
  disclaimer:
    "Resumo automatizado com base nos dados retornados pela Judit. Valide os pontos críticos antes de qualquer decisão jurídica.",
};

const preferredObjectKeys = [
  "date",
  "title",
  "description",
  "name",
  "role",
  "side",
  "groupLabel",
  "documentType",
  "document",
  "counsel",
  "label",
  "value",
];

const isJsonRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const humanizeKey = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatKnownRecord = (value: JsonRecord) => {
  if ("title" in value || "date" in value || "description" in value) {
    const parts = [
      typeof value.date === "string" ? normalizeWhitespace(value.date) : "",
      typeof value.title === "string" ? normalizeWhitespace(value.title) : "",
      typeof value.description === "string" ? normalizeWhitespace(value.description) : "",
    ].filter(Boolean);
    if (parts.length) return parts.join(" - ");
  }

  if ("name" in value || "side" in value || "role" in value || "document" in value) {
    const parts = [
      typeof value.name === "string" ? normalizeWhitespace(value.name) : "",
      typeof value.role === "string" ? normalizeWhitespace(value.role) : "",
      typeof value.side === "string" ? normalizeWhitespace(value.side) : "",
      typeof value.groupLabel === "string" ? normalizeWhitespace(value.groupLabel) : "",
      typeof value.document === "string"
        ? [
            typeof value.documentType === "string" ? normalizeWhitespace(value.documentType) : "",
            normalizeWhitespace(value.document),
          ]
            .filter(Boolean)
            .join(": ")
        : "",
      typeof value.counsel === "string" ? `Advogado: ${normalizeWhitespace(value.counsel)}` : "",
    ].filter(Boolean);
    if (parts.length) return parts.join(" | ");
  }

  return "";
};

const indentLines = (value: string, prefix = "  ") =>
  value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");

const formatStructuredValue = (value: unknown, depth = 0): string => {
  if (value == null) return "";

  if (typeof value === "string") {
    const cleaned = value.trim();
    return cleaned === "[object Object]" ? "" : cleaned;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatStructuredValue(item, depth + 1))
      .filter(Boolean);

    if (!items.length) return "";

    return items
      .map((item) => {
        if (!item.includes("\n")) return `- ${item}`;
        return `- ${indentLines(item).trimStart()}`;
      })
      .join("\n");
  }

  if (isJsonRecord(value)) {
    const knownFormat = formatKnownRecord(value);
    if (knownFormat) return knownFormat;

    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue != null && String(entryValue).trim() !== "")
      .sort(([leftKey], [rightKey]) => {
        const leftIndex = preferredObjectKeys.indexOf(leftKey);
        const rightIndex = preferredObjectKeys.indexOf(rightKey);
        const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
        const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
        return normalizedLeft - normalizedRight || leftKey.localeCompare(rightKey);
      });

    const lines = entries
      .map(([key, entryValue]) => {
        const formattedEntry = formatStructuredValue(entryValue, depth + 1);
        if (!formattedEntry) return "";

        if (formattedEntry.includes("\n")) {
          return `${humanizeKey(key)}:\n${indentLines(formattedEntry)}`;
        }

        return `${humanizeKey(key)}: ${formattedEntry}`;
      })
      .filter(Boolean);

    if (!lines.length) return "";

    return depth === 0 ? lines.join("\n") : lines.join(" | ");
  }

  return "";
};

const sha256 = async (value: string) => {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((chunk) => chunk.toString(16).padStart(2, "0"))
    .join("");
};

const getContext = async (req: Request) => {
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
  const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    throw new Error("Sessão inválida.");
  }

  return { admin, userId: user.id };
};

const ensureSnapshotAccess = async (admin: ReturnType<typeof createClient>, userId: string, snapshotId: string) => {
  const [stateResult, monitoringResult, resultLinkResult] = await Promise.all([
    admin.from("process_user_state").select("id").eq("auth_user_id", userId).eq("process_snapshot_id", snapshotId).limit(1),
    admin.from("process_monitorings").select("id").eq("auth_user_id", userId).eq("process_snapshot_id", snapshotId).is("deleted_at", null).limit(1),
    admin.from("process_request_results").select("process_query_request_id").eq("process_snapshot_id", snapshotId),
  ]);

  if (stateResult.error || monitoringResult.error || resultLinkResult.error) {
    throw new Error("Erro ao validar acesso ao processo.");
  }

  const requestIds = (resultLinkResult.data ?? []).map((item) => item.process_query_request_id);
  let hasRequestAccess = false;

  if (requestIds.length) {
    const { data, error } = await admin
      .from("process_query_requests")
      .select("id")
      .eq("auth_user_id", userId)
      .in("id", requestIds)
      .limit(1);

    if (error) {
      throw new Error(`Erro ao validar requisições do processo: ${error.message}`);
    }

    hasRequestAccess = Boolean(data?.length);
  }

  if (!stateResult.data?.length && !monitoringResult.data?.length && !hasRequestAccess) {
    throw new Error("Processo não encontrado para o usuário atual.");
  }
};

const buildSnapshotHash = async (snapshot: JsonRecord) =>
  sha256(JSON.stringify({
    cnj: snapshot.cnj,
    updated_at: snapshot.updated_at,
    class_processual: snapshot.class_processual,
    assuntos: snapshot.assuntos,
    parties: snapshot.parties,
    movements: snapshot.movements,
    attachments: snapshot.attachments,
    raw_response: snapshot.raw_response,
  }));

const sanitizeSummary = (payload: JsonRecord): SummarySections => ({
  summary: formatStructuredValue(payload.summary) || sectionFallbacks.summary,
  parties: formatStructuredValue(payload.parties) || sectionFallbacks.parties,
  classification: formatStructuredValue(payload.classification) || sectionFallbacks.classification,
  subjects: formatStructuredValue(payload.subjects) || sectionFallbacks.subjects,
  movements: formatStructuredValue(payload.movements) || sectionFallbacks.movements,
  disclaimer: formatStructuredValue(payload.disclaimer) || sectionFallbacks.disclaimer,
});

const hasBrokenSummarySections = (payload: unknown) => {
  if (!isJsonRecord(payload)) return false;

  return Object.values(payload).some(
    (value) => typeof value === "string" && normalizeWhitespace(value).includes("[object Object]"),
  );
};

const callOpenAI = async (snapshot: JsonRecord) => {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  const simplifiedContext = {
    cnj: snapshot.cnj,
    titulo: snapshot.title,
    parteAtiva: snapshot.active_party,
    partePassiva: snapshot.passive_party,
    tribunal: snapshot.tribunal,
    classeProcessual: snapshot.class_processual,
    assuntos: snapshot.assuntos,
    resumoBase: snapshot.summary,
    partes: snapshot.parties,
    movimentacoes: snapshot.movements,
    valor: snapshot.value_label,
    fase: snapshot.phase,
    orgaoJulgador: snapshot.orgao_julgador,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Você é o E7 Agente Processual. Analise exclusivamente os dados enviados do processo judicial brasileiro. Não invente fatos. Retorne JSON com as chaves: summary, parties, classification, subjects, movements, disclaimer. Cada chave deve conter apenas texto em pt-BR, objetivo e útil para um advogado. Nunca retorne arrays, listas JSON, objetos ou valores estruturados dentro dessas chaves. Se precisar listar itens, use uma única string com linhas iniciadas por hífen. Se faltar dado, diga explicitamente.",
        },
        {
          role: "user",
          content: `Gere a análise estruturada deste processo:\n${JSON.stringify(simplifiedContext, null, 2)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as JsonRecord;
  const content = String(
    (((data.choices as JsonRecord[] | undefined)?.[0] ?? {}).message as JsonRecord | undefined)?.content ?? "{}",
  );

  let parsed: JsonRecord = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { summary: content };
  }

  return {
    raw: data,
    sections: sanitizeSummary(parsed),
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { admin, userId } = await getContext(req);
    const payload = (await req.json()) as JsonRecord;
    const snapshotId = String(payload.snapshotId ?? payload.caseId ?? "");

    if (!snapshotId) {
      throw new Error("snapshotId é obrigatório.");
    }

    await ensureSnapshotAccess(admin, userId, snapshotId);

    const { data: snapshot, error: snapshotError } = await admin
      .from("process_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .single();

    if (snapshotError || !snapshot) {
      throw new Error(`Erro ao carregar snapshot do processo: ${snapshotError?.message ?? "não encontrado"}`);
    }

    const snapshotHash = await buildSnapshotHash(snapshot as unknown as JsonRecord);

    if (!payload.forceRefresh) {
      const { data: cached, error: cachedError } = await admin
        .from("process_agent_summaries")
        .select("*")
        .eq("auth_user_id", userId)
        .eq("process_snapshot_id", snapshotId)
        .eq("snapshot_hash", snapshotHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedError) {
        throw new Error(`Erro ao consultar cache do agente: ${cachedError.message}`);
      }

      if (cached?.summary_sections && !hasBrokenSummarySections(cached.summary_sections)) {
        return buildJsonResponse(200, {
          cached: true,
          model: cached.model_name,
          sections: sanitizeSummary(cached.summary_sections as JsonRecord),
          generatedAt: cached.created_at,
        });
      }
    }

    const completion = await callOpenAI(snapshot as unknown as JsonRecord);

    const { error: saveError } = await admin.from("process_agent_summaries").upsert(
      {
        auth_user_id: userId,
        process_snapshot_id: snapshotId,
        snapshot_hash: snapshotHash,
        model_name: OPENAI_MODEL,
        summary_sections: completion.sections,
        raw_response: completion.raw,
      },
      {
        onConflict: "auth_user_id,process_snapshot_id,snapshot_hash",
      },
    );

    if (saveError) {
      throw new Error(`Erro ao salvar cache do agente: ${saveError.message}`);
    }

    return buildJsonResponse(200, {
      cached: false,
      model: OPENAI_MODEL,
      sections: completion.sections,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro em judit-process-agent:", error);
    return buildJsonResponse(500, {
      error: error instanceof Error ? error.message : "Erro desconhecido ao executar o agente processual.",
    });
  }
});
