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

const sanitizeSummary = (payload: JsonRecord) => ({
  summary: String(payload.summary ?? "Resumo indisponível."),
  parties: String(payload.parties ?? "Partes não identificadas."),
  classification: String(payload.classification ?? "Classificação indisponível."),
  subjects: String(payload.subjects ?? "Assuntos não identificados."),
  movements: String(payload.movements ?? "Movimentações indisponíveis."),
  disclaimer: String(
    payload.disclaimer ??
      "Resumo automatizado com base nos dados retornados pela Judit. Valide os pontos críticos antes de qualquer decisão jurídica.",
  ),
});

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
            "Você é o E7 Agente Processual. Analise exclusivamente os dados enviados do processo judicial brasileiro. Não invente fatos. Retorne JSON com as chaves: summary, parties, classification, subjects, movements, disclaimer. Cada chave deve conter texto em pt-BR, objetivo e útil para um advogado. Se faltar dado, diga explicitamente.",
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

      if (cached?.summary_sections) {
        return buildJsonResponse(200, {
          cached: true,
          model: cached.model_name,
          sections: sanitizeSummary(cached.summary_sections as JsonRecord),
          generatedAt: cached.created_at,
        });
      }
    }

    const completion = await callOpenAI(snapshot as unknown as JsonRecord);

    const { error: saveError } = await admin.from("process_agent_summaries").insert({
      auth_user_id: userId,
      process_snapshot_id: snapshotId,
      snapshot_hash: snapshotHash,
      model_name: OPENAI_MODEL,
      summary_sections: completion.sections,
      raw_response: completion.raw,
    });

    if (saveError && !normalize(saveError.message).includes("duplicate")) {
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
