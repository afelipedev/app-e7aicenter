// Tipos do modulo AI Center E7. Campos espelham as tabelas pt-br do Supabase.

export type EscopoAgente = "privado" | "escritorio";
export type StatusAgente = "rascunho" | "publicado" | "arquivado";
export type PapelMensagem = "usuario" | "assistente" | "sistema";

// Grafo declarativo (React Flow). No MVP o formulario N1 gera um grafo canonico;
// o construtor avancado (Fase 3) edita estes nos/arestas diretamente.
export interface NoGrafo {
  id: string;
  type: string; // ex.: 'prompt' | 'contexto' | 'rag' | 'memoria' | 'modelo' | 'saida'
  position?: { x: number; y: number };
  data?: Record<string, unknown>;
}
export interface ArestaGrafo {
  id: string;
  source: string;
  target: string;
}
export interface GrafoAgente {
  nodes: NoGrafo[];
  edges: ArestaGrafo[];
}

export interface Agente {
  id: string;
  criado_por: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  objetivo: string | null;
  persona: string | null;
  icone: string | null;
  modelo_llm: string;
  temperatura: number;
  max_tokens: number;
  escopo: EscopoAgente;
  status: StatusAgente;
  grafo: GrafoAgente;
  config: Record<string, unknown>;
  versao_atual: number;
  publicado_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface DadosAgente {
  nome: string;
  descricao?: string;
  categoria?: string;
  objetivo?: string;
  persona?: string;
  contexto?: string;
  icone?: string;
  modelo_llm?: string;
  temperatura?: number;
  max_tokens?: number;
  escopo?: EscopoAgente;
  grafo?: GrafoAgente;
  config?: Record<string, unknown>;
  baseIds?: string[];
}

export interface ProjetoAgente {
  id: string;
  user_id: string;
  nome: string;
  cor: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface ConversaAgente {
  id: string;
  agente_id: string;
  user_id: string;
  titulo: string;
  projeto_id: string | null;
  favorito: boolean;
  modelo_llm: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface MensagemAgente {
  id: string;
  conversa_id: string;
  papel: PapelMensagem;
  conteudo: string;
  metadados: Record<string, unknown>;
  criado_em: string;
}

export interface RespostaExecucao {
  output: string;
  conversaId: string;
  execucaoId: string | null;
  custoReais: number;
  trilha: Array<{ no: string; detalhe: string }>;
  metadados: { modelo: string; tokensEntrada: number; tokensSaida: number; finishReason?: string };
}

export interface BaseConhecimento {
  id: string;
  criado_por: string;
  nome: string;
  descricao: string | null;
  tipo: "geral" | "juridica" | "tributaria" | "financeira" | "contabil";
  escopo: EscopoAgente;
  criado_em: string;
  atualizado_em: string;
}
