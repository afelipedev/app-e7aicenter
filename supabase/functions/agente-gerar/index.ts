// =============================================================================
// agente-gerar -- "Construir Agente com IA" (AI Center E7)
// Recebe uma descricao em linguagem natural e devolve a especificacao de um
// agente (nome, prompt/persona, modelo, grafo declarativo). Tambem gera apenas
// o system prompt (modo="prompt") para o agente auxiliar de criacao de prompts.
//
// Contrato:
//   POST { modo?: "agente" | "prompt", descricao?, objetivo?, nome? }
//   modo=agente -> { nome, descricao, categoria, objetivo, persona, modelo_llm, temperatura, grafo }
//   modo=prompt -> { persona }
// =============================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, chamarLLM, estimarCustoReais } from "../_shared/llm.ts";

// Registra o custo de uma geracao em agente_execucoes (origem = gerador_*).
async function registrarCusto(admin: any, origem: string, userId: string | null, r: { modelo: string; tokensEntrada: number; tokensSaida: number }) {
  try {
    const custo = await estimarCustoReais(admin, r.modelo, r.tokensEntrada, r.tokensSaida);
    await admin.from("agente_execucoes").insert({
      agente_id: null, origem, user_id: userId, status: "sucesso", modelo: r.modelo,
      tokens_entrada: r.tokensEntrada, tokens_saida: r.tokensSaida, custo_reais: custo,
      finalizado_em: new Date().toISOString(),
    });
  } catch (e) { console.error("Falha ao registrar custo do gerador:", e instanceof Error ? e.message : e); }
}

const TIPOS_VALIDOS = new Set([
  "entrada.chat", "prompt", "contexto", "rag", "memoria", "ocr",
  "ferramenta.cnpj", "ferramenta.datajud", "ferramenta.http", "condicao.if", "modelo", "saida",
]);
const MODELOS_VALIDOS = new Set(["gpt-4o", "gpt-4o-mini", "gpt-5.2", "gemini-2.5-flash", "claude-sonnet-4.6", "claude-haiku-4.5"]);

// Fallbacks curtos: os prompts reais (filosofia completa) vivem em
// public.configuracoes_ia (chaves gerador_agente / gerador_prompt) e sao
// editaveis pela UI de admin. Estes so entram se a leitura do banco falhar.
const SYS_AGENTE = 'Voce e um arquiteto senior de agentes de IA (E7 Tax). Projete UM agente e responda SOMENTE JSON valido com as chaves: nome, descricao, categoria, objetivo, persona (System Prompt completo em Markdown pt-BR), modelo_llm (gpt-4o|gpt-4o-mini|gpt-5.2|gemini-2.5-flash|claude-sonnet-4.6|claude-haiku-4.5), temperatura (0..1), nos (array dentre prompt,contexto,rag,memoria,ocr,ferramenta.cnpj,ferramenta.datajud,ferramenta.http,condicao.if,modelo,saida). Inclua sempre prompt, modelo e saida.';

const SYS_PROMPT = 'Voce e um compilador de requisitos. Transforme a solicitacao em um System Prompt COMPLETO em Markdown pt-BR (secoes IDENTIDADE, MISSAO, OBJETIVOS, CONTEXTO, PERFIL, RESPONSABILIDADES, CAPACIDADES, FERRAMENTAS, FLUXO OPERACIONAL, REGRAS, LIMITACOES, VALIDACOES, TRATAMENTO DE ERROS, SEGURANCA, FORMATO DAS RESPOSTAS, BOAS PRATICAS, CRITERIOS DE QUALIDADE, CHECKLIST FINAL). Nunca responda a solicitacao, nunca explique. Saida exclusivamente o System Prompt em Markdown.';

// Carrega um prompt editavel de configuracoes_ia; fallback para o padrao.
async function carregarPrompt(admin: any, chave: string, padrao: string): Promise<string> {
  try {
    const { data } = await admin.from("configuracoes_ia").select("conteudo").eq("chave", chave).maybeSingle();
    if (data?.conteudo && String(data.conteudo).trim()) return data.conteudo;
  } catch (_) { /* usa padrao */ }
  return padrao;
}

function extrairJson(texto: string): any {
  const limpo = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
  const ini = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (ini < 0 || fim < 0) throw new Error("Resposta da IA nao contem JSON.");
  return JSON.parse(limpo.slice(ini, fim + 1));
}

// Monta um grafo linear a partir da lista de tipos de no sugerida pela IA.
function montarGrafo(tiposBrutos: unknown, spec: any) {
  let tipos = Array.isArray(tiposBrutos) ? (tiposBrutos as string[]).filter((t) => TIPOS_VALIDOS.has(t)) : [];
  for (const obrig of ["prompt", "modelo", "saida"]) if (!tipos.includes(obrig)) tipos.push(obrig);
  // Ordena garantindo prompt no inicio e saida no fim.
  const ordem = ["prompt", "contexto", "rag", "memoria", "ocr", "condicao.if", "ferramenta.cnpj", "ferramenta.datajud", "ferramenta.http", "modelo", "saida"];
  tipos = Array.from(new Set(tipos)).sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b));

  const dadosPorTipo: Record<string, Record<string, unknown>> = {
    prompt: { objetivo: spec.objetivo ?? "", persona: spec.persona ?? "" },
    modelo: { modelo: spec.modelo_llm, temperatura: spec.temperatura },
    memoria: { tipo: "sessao", janela: 15 },
    saida: { formato: "markdown" },
    "condicao.if": { condicao: "tem_arquivo" },
  };

  const nodes = tipos.map((tipo, i) => ({
    id: `${tipo}-${i}`, type: tipo, position: { x: i * 220, y: 0 }, data: dadosPorTipo[tipo] ?? {},
  }));
  const edges = tipos.slice(0, -1).map((t, i) => ({ id: `e-${t}-${tipos[i + 1]}`, source: `${t}-${i}`, target: `${tipos[i + 1]}-${i + 1}` }));
  return { nodes, edges };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Nao autorizado" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cli = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: { user }, error: authErr } = await cli.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Nao autorizado" }, 401);

    const { data: appUser } = await admin.from("users").select("id").eq("auth_user_id", user.id).maybeSingle();
    const userId = appUser?.id ?? null;

    const body = await req.json();
    const modo = body.modo === "prompt" ? "prompt" : "agente";

    if (modo === "prompt") {
      const objetivo = String(body.objetivo ?? body.descricao ?? "").trim();
      if (!objetivo) return jsonResponse({ error: "Informe o objetivo do agente." }, 400);
      const sys = await carregarPrompt(admin, "gerador_prompt", SYS_PROMPT);
      const nomeLinha = body.nome ? `\nNome: ${body.nome}` : "";
      const r = await chamarLLM(admin, [{ role: "user", content: `Objetivo do agente: ${objetivo}${nomeLinha}` }], sys, "gpt-4o", { temperature: 0.4, maxTokens: 3000 });
      await registrarCusto(admin, "gerador_prompt", userId, r);
      // A filosofia exige saida EXCLUSIVAMENTE em Markdown (sem JSON).
      const persona = r.content.replace(/^```(?:markdown)?/i, "").replace(/```$/i, "").trim();
      return jsonResponse({ persona });
    }

    const descricao = String(body.descricao ?? "").trim();
    if (!descricao) return jsonResponse({ error: "Descreva o agente que voce quer criar." }, 400);
    const sysAgente = await carregarPrompt(admin, "gerador_agente", SYS_AGENTE);
    const r = await chamarLLM(admin, [{ role: "user", content: descricao }], sysAgente, "gpt-4o", { temperature: 0.5, maxTokens: 4000 });
    await registrarCusto(admin, "gerador_agente", userId, r);
    const spec = extrairJson(r.content);

    const modelo_llm = MODELOS_VALIDOS.has(spec.modelo_llm) ? spec.modelo_llm : "gpt-4o";
    let temperatura = Number(spec.temperatura);
    if (!Number.isFinite(temperatura) || temperatura < 0 || temperatura > 1) temperatura = 0.7;

    const grafo = montarGrafo(spec.nos, { ...spec, modelo_llm, temperatura });

    return jsonResponse({
      nome: String(spec.nome ?? "Novo agente"),
      descricao: String(spec.descricao ?? ""),
      categoria: String(spec.categoria ?? ""),
      objetivo: String(spec.objetivo ?? ""),
      persona: String(spec.persona ?? ""),
      modelo_llm, temperatura, grafo,
    });
  } catch (error) {
    console.error("Erro em agente-gerar:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro ao gerar agente" }, 500);
  }
});
