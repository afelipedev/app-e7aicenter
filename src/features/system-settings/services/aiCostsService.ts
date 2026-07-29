import { supabase } from "@/lib/supabase";

export interface ExecucaoCusto {
  id: string;
  agente_id: string | null;
  origem: string;
  status: "sucesso" | "erro";
  modelo: string | null;
  tokens_entrada: number;
  tokens_saida: number;
  custo_reais: number;
  iniciado_em: string;
  agente_nome: string | null;
}

export interface AgenteOpcao { id: string; nome: string; }

// Rotulos amigaveis para as origens que nao sao agentes reais.
export const ORIGEM_LABELS: Record<string, string> = {
  agente: "Agente",
  gerador_agente: "Gerador de agentes (Construir com IA)",
  gerador_prompt: "Gerador de prompts",
};

type Filtro = { desde?: string; agenteId?: string; origem?: string };

export const aiCostsService = {
  /** Agentes existentes (para o filtro por nome). Admin ve todos. */
  async agentes(): Promise<AgenteOpcao[]> {
    const { data, error } = await supabase.from("agentes").select("id, nome").order("nome");
    if (error) throw error;
    return (data ?? []) as AgenteOpcao[];
  },

  /** Agregado: custo total (R$), execucoes e tokens. */
  async resumo(f: Filtro): Promise<{ total: number; execucoes: number; tokens: number }> {
    let q = supabase.from("agente_execucoes").select("custo_reais, tokens_entrada, tokens_saida");
    if (f.desde) q = q.gte("iniciado_em", f.desde);
    if (f.agenteId) q = q.eq("agente_id", f.agenteId);
    if (f.origem) q = q.eq("origem", f.origem);
    const { data, error } = await q.limit(5000);
    if (error) throw error;
    return (data ?? []).reduce((acc: { total: number; execucoes: number; tokens: number }, e: { custo_reais?: number; tokens_entrada?: number; tokens_saida?: number }) => ({
      total: acc.total + Number(e.custo_reais || 0),
      execucoes: acc.execucoes + 1,
      tokens: acc.tokens + (e.tokens_entrada || 0) + (e.tokens_saida || 0),
    }), { total: 0, execucoes: 0, tokens: 0 });
  },

  /** Lista paginada (20/pagina) com nome do agente embutido. */
  async execucoes(f: Filtro, pagina = 0, porPagina = 20): Promise<{ itens: ExecucaoCusto[]; total: number }> {
    let q = supabase
      .from("agente_execucoes")
      .select("id, agente_id, origem, status, modelo, tokens_entrada, tokens_saida, custo_reais, iniciado_em, agentes(nome)", { count: "exact" });
    if (f.desde) q = q.gte("iniciado_em", f.desde);
    if (f.agenteId) q = q.eq("agente_id", f.agenteId);
    if (f.origem) q = q.eq("origem", f.origem);
    const { data, error, count } = await q
      .order("iniciado_em", { ascending: false })
      .range(pagina * porPagina, pagina * porPagina + porPagina - 1);
    if (error) throw error;
    const itens = (data ?? []).map((e: Record<string, unknown> & { agentes?: { nome?: string } | null }) => ({
      id: e.id as string,
      agente_id: (e.agente_id as string) ?? null,
      origem: e.origem as string,
      status: e.status as "sucesso" | "erro",
      modelo: (e.modelo as string) ?? null,
      tokens_entrada: (e.tokens_entrada as number) ?? 0,
      tokens_saida: (e.tokens_saida as number) ?? 0,
      custo_reais: (e.custo_reais as number) ?? 0,
      iniciado_em: e.iniciado_em as string,
      agente_nome: e.agentes?.nome ?? null,
    }));
    return { itens, total: count ?? 0 };
  },
};
