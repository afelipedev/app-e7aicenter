import { supabase } from "@/lib/supabase";
import type {
  Agente, DadosAgente, ConversaAgente, MensagemAgente, RespostaExecucao, ProjetoAgente,
} from "../types";
import { formParaGrafo, compilarConfig } from "../utils/grafoCanonico";

export interface ExecucaoResumo {
  id: string; status: "sucesso" | "erro"; modelo: string | null;
  tokens_entrada: number; tokens_saida: number; custo_reais: number;
  erro: string | null; iniciado_em: string;
}
export interface VersaoResumo {
  id: string; versao: number; notas: string | null; publicado_em: string | null; criado_em: string;
}

const DEFAULT_TIMEOUT = 20000;

const withTimeout = <T>(promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUT): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Operacao expirou. Verifique sua conexao e tente novamente.")), timeoutMs)),
  ]);

async function usuarioAtualId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuario nao autenticado");
  const { data, error } = await supabase
    .from("users").select("id").eq("auth_user_id", session.user.id).single();
  if (error || !data) throw new Error("Usuario da aplicacao nao encontrado");
  return data.id;
}

/** Servico de CRUD e execucao dos agentes do AI Center E7. */
export const agenteService = {
  async listar(): Promise<Agente[]> {
    const { data, error } = await withTimeout(
      supabase.from("agentes").select("*").order("atualizado_em", { ascending: false }),
    );
    if (error) throw error;
    return (data ?? []) as Agente[];
  },

  async obter(id: string): Promise<Agente | null> {
    const { data, error } = await withTimeout(
      supabase.from("agentes").select("*").eq("id", id).maybeSingle(),
    );
    if (error) throw error;
    return (data as Agente) ?? null;
  },

  async criar(dados: DadosAgente): Promise<Agente> {
    const criado_por = await usuarioAtualId();
    const grafo = dados.grafo ?? formParaGrafo(dados);
    const config = dados.config ?? compilarConfig(dados);
    const { data, error } = await withTimeout(
      supabase.from("agentes").insert({
        criado_por,
        nome: dados.nome,
        descricao: dados.descricao ?? null,
        categoria: dados.categoria ?? null,
        objetivo: dados.objetivo ?? null,
        persona: dados.persona ?? null,
        icone: dados.icone ?? null,
        modelo_llm: dados.modelo_llm ?? "gpt-4o",
        temperatura: dados.temperatura ?? 0.7,
        max_tokens: dados.max_tokens ?? 2000,
        escopo: dados.escopo ?? "privado",
        grafo, config,
      }).select("*").single(),
    );
    if (error) throw error;
    if (dados.baseIds?.length) await this.definirBases(data.id, dados.baseIds);
    return data as Agente;
  },

  async atualizar(id: string, dados: DadosAgente): Promise<Agente> {
    const grafo = dados.grafo ?? formParaGrafo(dados);
    const config = dados.config ?? compilarConfig(dados);
    const { data, error } = await withTimeout(
      supabase.from("agentes").update({
        nome: dados.nome,
        descricao: dados.descricao ?? null,
        categoria: dados.categoria ?? null,
        objetivo: dados.objetivo ?? null,
        persona: dados.persona ?? null,
        icone: dados.icone ?? null,
        modelo_llm: dados.modelo_llm ?? "gpt-4o",
        temperatura: dados.temperatura ?? 0.7,
        max_tokens: dados.max_tokens ?? 2000,
        escopo: dados.escopo ?? "privado",
        grafo, config,
      }).eq("id", id).select("*").single(),
    );
    if (error) throw error;
    if (dados.baseIds) await this.definirBases(id, dados.baseIds);
    return data as Agente;
  },

  /** Soft delete (preserva historico de custos). Valida permissao no servidor. */
  async excluir(id: string): Promise<void> {
    const { error } = await withTimeout(supabase.rpc("excluir_agente", { p_agente_id: id }));
    if (error) throw new Error(error.message || "Falha ao excluir o agente");
  },

  // --- Favoritos / arquivados (por usuario) --------------------------------
  async idsFavoritos(): Promise<string[]> {
    const { data, error } = await withTimeout(supabase.from("agente_favoritos").select("agente_id"));
    if (error) throw error;
    return (data ?? []).map((r: { agente_id: string }) => r.agente_id);
  },
  async idsArquivados(): Promise<string[]> {
    const { data, error } = await withTimeout(supabase.from("agente_arquivados").select("agente_id"));
    if (error) throw error;
    return (data ?? []).map((r: { agente_id: string }) => r.agente_id);
  },
  async definirFavorito(agenteId: string, favorito: boolean): Promise<void> {
    const user_id = await usuarioAtualId();
    if (favorito) {
      const { error } = await withTimeout(supabase.from("agente_favoritos").upsert({ user_id, agente_id: agenteId }));
      if (error) throw error;
    } else {
      const { error } = await withTimeout(supabase.from("agente_favoritos").delete().eq("agente_id", agenteId).eq("user_id", user_id));
      if (error) throw error;
    }
  },
  async definirArquivado(agenteId: string, arquivado: boolean): Promise<void> {
    const user_id = await usuarioAtualId();
    if (arquivado) {
      const { error } = await withTimeout(supabase.from("agente_arquivados").upsert({ user_id, agente_id: agenteId }));
      if (error) throw error;
    } else {
      const { error } = await withTimeout(supabase.from("agente_arquivados").delete().eq("agente_id", agenteId).eq("user_id", user_id));
      if (error) throw error;
    }
  },

  /** Publica (rascunho -> publicado) e cria snapshot de versao. */
  async publicar(id: string, escopo: "privado" | "escritorio" = "escritorio"): Promise<Agente> {
    const agente = await this.obter(id);
    if (!agente) throw new Error("Agente nao encontrado");
    await withTimeout(supabase.from("agente_versoes").insert({
      agente_id: id, versao: agente.versao_atual, grafo: agente.grafo, config: agente.config,
      prompt_sistema: agente.config?.promptSistema ?? null, publicado_em: new Date().toISOString(),
    }));
    const { data, error } = await withTimeout(
      supabase.from("agentes").update({
        status: "publicado", escopo, publicado_em: new Date().toISOString(),
        versao_atual: agente.versao_atual + 1,
      }).eq("id", id).select("*").single(),
    );
    if (error) throw error;
    return data as Agente;
  },

  async definirBases(agenteId: string, baseIds: string[]): Promise<void> {
    await withTimeout(supabase.from("agente_bases").delete().eq("agente_id", agenteId));
    if (baseIds.length === 0) return;
    const { error } = await withTimeout(
      supabase.from("agente_bases").insert(baseIds.map((base_id) => ({ agente_id: agenteId, base_id }))),
    );
    if (error) throw error;
  },

  async basesDoAgente(agenteId: string): Promise<string[]> {
    const { data, error } = await withTimeout(
      supabase.from("agente_bases").select("base_id").eq("agente_id", agenteId),
    );
    if (error) throw error;
    return (data ?? []).map((r: { base_id: string }) => r.base_id);
  },

  // --- Projetos / pastas ----------------------------------------------------
  async projetos(): Promise<ProjetoAgente[]> {
    const { data, error } = await withTimeout(
      supabase.from("agente_projetos").select("*").order("atualizado_em", { ascending: false }),
    );
    if (error) throw error;
    return (data ?? []) as ProjetoAgente[];
  },

  async criarProjeto(nome: string): Promise<ProjetoAgente> {
    const user_id = await usuarioAtualId();
    const { data, error } = await withTimeout(
      supabase.from("agente_projetos").insert({ user_id, nome }).select("*").single(),
    );
    if (error) throw error;
    return data as ProjetoAgente;
  },

  async renomearProjeto(id: string, nome: string): Promise<void> {
    const { error } = await withTimeout(supabase.from("agente_projetos").update({ nome }).eq("id", id));
    if (error) throw error;
  },

  async excluirProjeto(id: string): Promise<void> {
    const { error } = await withTimeout(supabase.from("agente_projetos").delete().eq("id", id));
    if (error) throw error;
  },

  // --- Conversa / mensagens -------------------------------------------------
  async conversas(agenteId: string): Promise<ConversaAgente[]> {
    const { data, error } = await withTimeout(
      supabase.from("agente_conversas").select("*").eq("agente_id", agenteId)
        .order("atualizado_em", { ascending: false }),
    );
    if (error) throw error;
    return (data ?? []) as ConversaAgente[];
  },

  async atualizarConversa(id: string, dados: Partial<Pick<ConversaAgente, "titulo" | "projeto_id" | "favorito" | "modelo_llm">>): Promise<void> {
    const { error } = await withTimeout(supabase.from("agente_conversas").update(dados).eq("id", id));
    if (error) throw error;
  },

  async excluirConversa(id: string): Promise<void> {
    const { error } = await withTimeout(supabase.from("agente_conversas").delete().eq("id", id));
    if (error) throw error;
  },

  /** Extrai texto de um arquivo anexado no chat (PDF/DOCX/TXT/imagem via OCR). */
  async extrairTexto(nome: string, mime: string, base64: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("extrair-texto", { body: { nome, mime, base64 } });
    if (error) throw new Error(error.message || "Falha ao extrair texto do arquivo");
    if (data?.error) throw new Error(data.error);
    return String(data?.texto ?? "");
  },

  /** Historico de execucoes do agente (para abas Execucoes/Custos). */
  async execucoes(agenteId: string, limite = 50): Promise<ExecucaoResumo[]> {
    const { data, error } = await withTimeout(
      supabase.from("agente_execucoes")
        .select("id, status, modelo, tokens_entrada, tokens_saida, custo_reais, erro, iniciado_em")
        .eq("agente_id", agenteId).order("iniciado_em", { ascending: false }).limit(limite),
    );
    if (error) throw error;
    return (data ?? []) as ExecucaoResumo[];
  },

  /** Agrega custo total e tokens do agente (opcionalmente a partir de uma data). */
  async resumoCustos(agenteId: string, desde?: string): Promise<{ total: number; execucoes: number; tokens: number }> {
    let q = supabase.from("agente_execucoes")
      .select("custo_reais, tokens_entrada, tokens_saida").eq("agente_id", agenteId);
    if (desde) q = q.gte("iniciado_em", desde);
    const { data, error } = await withTimeout(q.limit(2000));
    if (error) throw error;
    return (data ?? []).reduce((acc, e: { custo_reais?: number; tokens_entrada?: number; tokens_saida?: number }) => ({
      total: acc.total + Number(e.custo_reais || 0),
      execucoes: acc.execucoes + 1,
      tokens: acc.tokens + (e.tokens_entrada || 0) + (e.tokens_saida || 0),
    }), { total: 0, execucoes: 0, tokens: 0 });
  },

  /** Execucoes paginadas (20/pagina) com filtro por data. */
  async execucoesPaginadas(agenteId: string, opts: { desde?: string; pagina?: number; porPagina?: number } = {}): Promise<{ itens: ExecucaoResumo[]; total: number }> {
    const porPagina = opts.porPagina ?? 20;
    const pagina = opts.pagina ?? 0;
    let q = supabase.from("agente_execucoes")
      .select("id, status, modelo, tokens_entrada, tokens_saida, custo_reais, erro, iniciado_em", { count: "exact" })
      .eq("agente_id", agenteId);
    if (opts.desde) q = q.gte("iniciado_em", opts.desde);
    const { data, error, count } = await withTimeout(
      q.order("iniciado_em", { ascending: false }).range(pagina * porPagina, pagina * porPagina + porPagina - 1),
    );
    if (error) throw error;
    return { itens: (data ?? []) as ExecucaoResumo[], total: count ?? 0 };
  },

  /** Versoes publicadas do agente. */
  async versoes(agenteId: string): Promise<VersaoResumo[]> {
    const { data, error } = await withTimeout(
      supabase.from("agente_versoes").select("id, versao, notas, publicado_em, criado_em")
        .eq("agente_id", agenteId).order("versao", { ascending: false }),
    );
    if (error) throw error;
    return (data ?? []) as VersaoResumo[];
  },

  async mensagens(conversaId: string): Promise<MensagemAgente[]> {
    const { data, error } = await withTimeout(
      supabase.from("agente_mensagens").select("*").eq("conversa_id", conversaId)
        .order("criado_em", { ascending: true }),
    );
    if (error) throw error;
    return (data ?? []) as MensagemAgente[];
  },

  /** "Construir com IA": descricao em linguagem natural -> spec de agente. */
  async gerarComIA(descricao: string): Promise<DadosAgente> {
    const { data, error } = await supabase.functions.invoke("agente-gerar", { body: { modo: "agente", descricao } });
    if (error) throw new Error(error.message || "Falha ao gerar agente");
    if (data?.error) throw new Error(data.error);
    return data as DadosAgente;
  },

  /** Agente auxiliar de prompts: gera um system prompt (persona) a partir do objetivo. */
  async gerarPrompt(objetivo: string, nome?: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("agente-gerar", { body: { modo: "prompt", objetivo, nome } });
    if (error) throw new Error(error.message || "Falha ao gerar prompt");
    if (data?.error) throw new Error(data.error);
    return String(data?.persona ?? "");
  },

  /** Chama a Edge Function agente-executar (pipeline do agente). */
  async executar(agenteId: string, mensagem: string, opts: { conversaId?: string; arquivoTexto?: string; modelo?: string } = {}): Promise<RespostaExecucao> {
    const { data, error } = await supabase.functions.invoke("agente-executar", {
      body: { agenteId, mensagem, conversaId: opts.conversaId, arquivoTexto: opts.arquivoTexto, modelo: opts.modelo },
    });
    if (error) throw new Error(error.message || "Falha ao executar o agente");
    if (data?.error) throw new Error(data.error);
    return data as RespostaExecucao;
  },
};
