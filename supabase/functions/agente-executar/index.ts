// =============================================================================
// agente-executar -- Interpretador/compilador do agente (AI Center E7)
// Le a spec do agente (agentes.grafo/config), monta o pipeline
// (Prompt+Contexto -> Memoria -> RAG -> Modelo -> Saida) e executa.
// Persiste mensagem, execucao (tokens, custo ~R$ e trilha).
//
// Contrato:
//   POST { agenteId, conversaId?, mensagem, arquivoTexto? }
//   -> { output, conversaId, execucaoId, custoReais, trilha, metadados }
// =============================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  corsHeaders, jsonResponse, chamarLLM, gerarEmbedding, estimarCustoReais,
  type MensagemLLM,
} from "../_shared/llm.ts";

const JANELA_MEMORIA = 15;

// Monta o system prompt a partir da config compilada ou dos campos do agente.
function montarSystemPrompt(agente: any): string {
  const cfgPrompt = agente?.config?.promptSistema;
  if (cfgPrompt && typeof cfgPrompt === "string" && cfgPrompt.trim()) return cfgPrompt;

  const partes: string[] = [];
  if (agente.persona) partes.push(`Persona: ${agente.persona}`);
  if (agente.objetivo) partes.push(`Objetivo: ${agente.objetivo}`);
  if (agente.descricao) partes.push(agente.descricao);
  partes.push("Responda sempre em portugues do Brasil (pt-BR), de forma tecnica e objetiva.");
  return partes.join("\n\n");
}

// --- Leitura do grafo declarativo ------------------------------------------
function nosDoGrafo(agente: any): any[] {
  return Array.isArray(agente?.grafo?.nodes) ? agente.grafo.nodes : [];
}
function dadosNo(nos: any[], tipo: string): Record<string, any> | null {
  const n = nos.find((x) => x.type === tipo);
  return n?.data ?? null;
}

const INSTRUCOES_SAIDA: Record<string, string> = {
  json: "Responda estritamente em JSON valido, sem texto fora do JSON.",
  html: "Responda em HTML bem formado.",
  tabela: "Responda preferencialmente em formato de tabela (markdown).",
  texto: "Responda em texto simples, sem markdown.",
  markdown: "",
};

function extrairCnpj(texto: string): string | null {
  const m = String(texto).match(/\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2}/);
  if (!m) return null;
  const cnpj = m[0].replace(/\D/g, "");
  return cnpj.length === 14 ? cnpj : null;
}

// Numero CNJ: 20 digitos (com ou sem mascara NNNNNNN-DD.AAAA.J.TR.OOOO).
function extrairCnj(texto: string): string | null {
  const mascara = String(texto).match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/);
  if (mascara) { const d = mascara[0].replace(/\D/g, ""); if (d.length === 20) return d; }
  const bruto = String(texto).match(/\b\d{20}\b/);
  return bruto ? bruto[0] : null;
}

// Ferramenta CNPJ (BrasilAPI, gratuita): dados cadastrais gerais.
async function consultarCnpj(mensagem: string): Promise<string | null> {
  const cnpj = extrairCnpj(mensagem);
  if (!cnpj) return null;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!r.ok) return null;
    const d = await r.json();
    return `Dados cadastrais do CNPJ ${cnpj}: razao social ${d.razao_social}; nome fantasia ${d.nome_fantasia ?? "-"}; situacao ${d.descricao_situacao_cadastral}; UF ${d.uf}; municipio ${d.municipio}; atividade principal ${d.cnae_fiscal_descricao}.`;
  } catch { return null; }
}

// Ferramenta Receita: foco tributario (regime/Simples Nacional/MEI) via BrasilAPI.
async function consultarReceita(mensagem: string): Promise<string | null> {
  const cnpj = extrairCnpj(mensagem);
  if (!cnpj) return null;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!r.ok) return null;
    const d = await r.json();
    const simples = d.opcao_pelo_simples ? `optante pelo Simples Nacional (desde ${d.data_opcao_pelo_simples ?? "-"})` : "nao optante pelo Simples Nacional";
    const mei = d.opcao_pelo_mei ? "; optante pelo MEI" : "";
    return `Situacao tributaria do CNPJ ${cnpj}: ${simples}${mei}; natureza juridica ${d.natureza_juridica ?? "-"}; porte ${d.porte ?? d.descricao_porte ?? "-"}; capital social ${d.capital_social ?? "-"}.`;
  } catch { return null; }
}

// Ferramenta DataJud: detecta numero CNJ e consulta a Edge Function datajud-search.
async function consultarDataJud(url: string, authHeader: string, mensagem: string): Promise<string | null> {
  const cnj = extrairCnj(mensagem);
  if (!cnj) {
    return "Ferramenta DataJud disponivel: informe o numero CNJ (20 digitos) do processo para consulta. Busca por OAB nao e suportada pela API publica do DataJud.";
  }
  try {
    const r = await fetch(`${url}/functions/v1/datajud-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ action: "search-cnj", cnj }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.status !== "completed" || !d.process) return `Processo ${cnj} nao encontrado no DataJud.`;
    const p = d.process;
    return `Processo ${p.cnj ?? cnj} (DataJud): ${p.title ?? ""}; classe ${p.classProcessual ?? "-"}; orgao julgador ${p.orgaoJulgador ?? "-"}; tribunal ${p.tribunal ?? "-"}.`;
  } catch { return null; }
}

// Ferramenta HTTP: GET a uma URL configurada no no (retorno truncado).
async function consultarHttp(dados: Record<string, any> | null): Promise<string | null> {
  const alvo = dados?.url;
  if (!alvo || typeof alvo !== "string") return null;
  try {
    const r = await fetch(alvo, { method: "GET" });
    const txt = (await r.text()).slice(0, 4000);
    return `Resposta HTTP de ${alvo} (status ${r.status}):\n${txt}`;
  } catch (e) {
    return `Falha ao consultar ${alvo}: ${e instanceof Error ? e.message : "erro"}`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Nao autorizado" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente do usuario (respeita RLS) + admin (Vault, insert em execucoes).
    const cli = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: { user }, error: authErr } = await cli.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Nao autorizado" }, 401);

    const body = await req.json();
    const { agenteId, mensagem, arquivoTexto } = body;
    let conversaId: string | null = body.conversaId ?? null;
    if (!agenteId || !mensagem) return jsonResponse({ error: "Parametros obrigatorios: agenteId, mensagem" }, 400);

    // users.id (pt) do usuario autenticado.
    const { data: appUser } = await admin.from("users").select("id").eq("auth_user_id", user.id).maybeSingle();
    if (!appUser?.id) return jsonResponse({ error: "Usuario da aplicacao nao encontrado" }, 403);
    const userId = appUser.id;

    // Carrega o agente respeitando RLS (dono ou publicado p/ escritorio).
    const { data: agente, error: agErr } = await cli.from("agentes").select("*").eq("id", agenteId).maybeSingle();
    if (agErr || !agente) return jsonResponse({ error: "Agente indisponivel" }, 404);

    const iniciadoEm = new Date().toISOString();
    const trilha: Array<{ no: string; detalhe: string }> = [];
    const nos = nosDoGrafo(agente);

    // 1) Conversa (cria se necessario) ----------------------------------------
    if (!conversaId) {
      const titulo = String(mensagem).trim().replace(/\s+/g, " ").slice(0, 40) || "Nova conversa";
      const { data: nova, error: convErr } = await cli
        .from("agente_conversas")
        .insert({ agente_id: agenteId, user_id: userId, titulo, modelo_llm: body.modelo ?? null })
        .select("id").single();
      if (convErr) throw new Error(`Erro ao criar conversa: ${convErr.message}`);
      conversaId = nova.id;
    }
    trilha.push({ no: "entrada.chat", detalhe: "Mensagem recebida" });

    // 2) Memoria (ultimas N mensagens) ----------------------------------------
    const { data: historico } = await cli
      .from("agente_mensagens")
      .select("papel, conteudo")
      .eq("conversa_id", conversaId)
      .order("criado_em", { ascending: false })
      .limit(JANELA_MEMORIA);
    const anteriores: MensagemLLM[] = (historico || [])
      .reverse()
      .map((m: any) => ({ role: m.papel === "assistente" ? "assistant" : "user", content: m.conteudo }));
    trilha.push({ no: "memoria", detalhe: `${anteriores.length} mensagens de contexto` });

    // 3) System prompt (prompt + contexto) ------------------------------------
    let systemPrompt = montarSystemPrompt(agente);
    const noCtx = dadosNo(nos, "contexto");
    if (noCtx?.texto && String(noCtx.texto).trim()) {
      systemPrompt += `\n\nCONTEXTO FIXO (considere sempre):\n${noCtx.texto}`;
      trilha.push({ no: "contexto", detalhe: "contexto fixo aplicado" });
    }

    // 4) RAG: uniao das bases vinculadas (agente_bases) + no 'rag' do grafo ----
    const { data: vinculos } = await admin.from("agente_bases").select("base_id").eq("agente_id", agenteId);
    const noRag = dadosNo(nos, "rag");
    const baseIds = Array.from(new Set([
      ...(vinculos || []).map((v: any) => v.base_id),
      ...((noRag?.baseIds as string[]) ?? []),
    ]));
    if (baseIds.length > 0) {
      try {
        const embedding = await gerarEmbedding(admin, mensagem);
        const { data: fragmentos } = await cli.rpc("buscar_fragmentos", {
          p_embedding: embedding, p_bases: baseIds, p_limite: 6,
        });
        if (fragmentos && fragmentos.length > 0) {
          const contexto = fragmentos.map((f: any, i: number) => `[Trecho ${i + 1}]\n${f.conteudo}`).join("\n\n");
          systemPrompt += `\n\nCONTEXTO DA BASE DE CONHECIMENTO (use quando pertinente, cite os trechos):\n\n${contexto}`;
          trilha.push({ no: "rag", detalhe: `${fragmentos.length} trechos recuperados` });
        } else {
          trilha.push({ no: "rag", detalhe: "nenhum trecho relevante" });
        }
      } catch (e) {
        trilha.push({ no: "rag", detalhe: `falha na busca: ${e instanceof Error ? e.message : "erro"}` });
      }
    }

    // 4b) Ferramentas (nos ferramenta.*) --------------------------------------
    if (dadosNo(nos, "ferramenta.cnpj")) {
      const info = await consultarCnpj(mensagem);
      if (info) { systemPrompt += `\n\nDADOS DE FERRAMENTA (CNPJ):\n${info}`; trilha.push({ no: "ferramenta.cnpj", detalhe: "consulta realizada" }); }
    }
    if (dadosNo(nos, "ferramenta.receita")) {
      const info = await consultarReceita(mensagem);
      if (info) { systemPrompt += `\n\nDADOS DE FERRAMENTA (RECEITA/TRIBUTARIO):\n${info}`; trilha.push({ no: "ferramenta.receita", detalhe: "consulta realizada" }); }
    }
    if (dadosNo(nos, "ferramenta.datajud")) {
      const info = await consultarDataJud(url, authHeader, mensagem);
      if (info) { systemPrompt += `\n\nDADOS DE FERRAMENTA (DATAJUD):\n${info}`; trilha.push({ no: "ferramenta.datajud", detalhe: "consulta realizada" }); }
    }
    { // HTTP pode haver mais de um no; percorre todos.
      const httpNos = nos.filter((n) => n.type === "ferramenta.http");
      for (const hn of httpNos) {
        const info = await consultarHttp(hn.data ?? null);
        if (info) { systemPrompt += `\n\nDADOS DE FERRAMENTA (HTTP):\n${info}`; trilha.push({ no: "ferramenta.http", detalhe: "requisicao realizada" }); }
      }
    }

    // 4c) Formato de saida (no 'saida') ---------------------------------------
    const noSaida = dadosNo(nos, "saida");
    const instrSaida = INSTRUCOES_SAIDA[String(noSaida?.formato ?? "markdown")] ?? "";
    if (instrSaida) systemPrompt += `\n\nFORMATO DE SAIDA: ${instrSaida}`;

    // 5) Entrada do usuario (com texto de arquivo, se houver) ------------------
    let conteudoUsuario = String(mensagem);
    if (arquivoTexto && typeof arquivoTexto === "string" && arquivoTexto.trim()) {
      conteudoUsuario = `INSTRUCOES DO USUARIO:\n${mensagem}\n\nCONTEUDO DO DOCUMENTO:\n\n${arquivoTexto}`;
      trilha.push({ no: "entrada.arquivo", detalhe: "texto de documento anexado" });
    }
    const mensagens: MensagemLLM[] = [...anteriores, { role: "user", content: conteudoUsuario }];

    // 6) Modelo LLM: no 'modelo' do grafo sobrepoe o padrao do agente ---------
    const noModelo = dadosNo(nos, "modelo");
    // Prioridade: override da requisicao (troca de modelo no chat) > no modelo > agente.
    const modelo = (body.modelo as string) || (noModelo?.modelo as string) || agente.modelo_llm || "gpt-4o";
    const temperatura = noModelo?.temperatura != null
      ? Number(noModelo.temperatura)
      : (agente.temperatura != null ? Number(agente.temperatura) : undefined);
    trilha.push({ no: "modelo", detalhe: modelo });
    let resposta;
    try {
      const maxTokens = noModelo?.max_tokens != null ? Number(noModelo.max_tokens) : (agente.max_tokens ?? undefined);
      resposta = await chamarLLM(admin, mensagens, systemPrompt, modelo, {
        temperature: temperatura,
        maxTokens,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro no modelo";
      await admin.from("agente_execucoes").insert({
        agente_id: agenteId, conversa_id: conversaId, user_id: userId, status: "erro",
        modelo, erro: msg, trilha, iniciado_em: iniciadoEm, finalizado_em: new Date().toISOString(),
      });
      return jsonResponse({ error: msg, conversaId }, 502);
    }

    // 7) Persistencia (mensagens do usuario e do assistente) ------------------
    // metadados: {} explicito nas duas linhas -- ao inserir um array com chaves
    // diferentes, o PostgREST preenche a chave ausente com NULL (ignora o
    // DEFAULT), o que violaria o NOT NULL de metadados.
    const { error: msgErr } = await cli.from("agente_mensagens").insert([
      { conversa_id: conversaId, papel: "usuario", conteudo: String(mensagem), metadados: {} },
      { conversa_id: conversaId, papel: "assistente", conteudo: resposta.content, metadados: { modelo: resposta.modelo } },
    ]);
    if (msgErr) console.error("Erro ao salvar mensagens:", msgErr.message);

    // 8) Execucao + custo -----------------------------------------------------
    const custoReais = await estimarCustoReais(admin, modelo, resposta.tokensEntrada, resposta.tokensSaida);
    trilha.push({ no: "saida", detalhe: `${resposta.tokensSaida} tokens de saida` });
    const { data: exec } = await admin.from("agente_execucoes").insert({
      agente_id: agenteId, conversa_id: conversaId, user_id: userId, status: "sucesso",
      modelo: resposta.modelo, tokens_entrada: resposta.tokensEntrada, tokens_saida: resposta.tokensSaida,
      custo_reais: custoReais, trilha, iniciado_em: iniciadoEm, finalizado_em: new Date().toISOString(),
    }).select("id").single();

    return jsonResponse({
      output: resposta.content,
      conversaId,
      execucaoId: exec?.id ?? null,
      custoReais,
      trilha,
      metadados: { modelo: resposta.modelo, tokensEntrada: resposta.tokensEntrada, tokensSaida: resposta.tokensSaida, finishReason: resposta.finishReason },
    });
  } catch (error) {
    console.error("Erro em agente-executar:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
