// Biblioteca de nos do construtor visual (React Flow). Conjunto FECHADO de tipos
// que o interpretador (Edge Function agente-executar) sabe compilar. Cada no
// representa uma capacidade do agente. Front usa isto para a paleta; o grafo
// salvo é a fonte de verdade lida pelo backend.

export type CategoriaNo =
  | "entrada" | "prompt" | "contexto" | "conhecimento" | "memoria"
  | "processamento" | "ferramenta" | "controle" | "modelo" | "saida";

export interface DefinicaoNo {
  tipo: string;                 // ex.: 'rag', 'ferramenta.datajud'
  rotulo: string;               // exibido na paleta e no no
  categoria: CategoriaNo;
  descricao: string;
  dadosPadrao?: Record<string, unknown>;
  // MVP interpretado pelo backend hoje? (apenas informativo na UI)
  ativo?: boolean;
}

export interface InfoCategoria {
  id: CategoriaNo;
  rotulo: string;
  cor: string;   // classe tailwind de destaque (borda/badge)
}

export const CATEGORIAS: Record<CategoriaNo, InfoCategoria> = {
  entrada:       { id: "entrada",       rotulo: "Entrada",       cor: "border-sky-500 text-sky-600" },
  prompt:        { id: "prompt",        rotulo: "Prompt",        cor: "border-violet-500 text-violet-600" },
  contexto:      { id: "contexto",      rotulo: "Contexto",      cor: "border-indigo-500 text-indigo-600" },
  conhecimento:  { id: "conhecimento",  rotulo: "Conhecimento",  cor: "border-emerald-500 text-emerald-600" },
  memoria:       { id: "memoria",       rotulo: "Memoria",       cor: "border-amber-500 text-amber-600" },
  processamento: { id: "processamento", rotulo: "Processamento", cor: "border-orange-500 text-orange-600" },
  ferramenta:    { id: "ferramenta",    rotulo: "Ferramentas",   cor: "border-rose-500 text-rose-600" },
  controle:      { id: "controle",      rotulo: "Controle",      cor: "border-slate-500 text-slate-600" },
  modelo:        { id: "modelo",        rotulo: "Modelo",        cor: "border-primary text-primary" },
  saida:         { id: "saida",         rotulo: "Saida",         cor: "border-teal-500 text-teal-600" },
};

export const NOS: DefinicaoNo[] = [
  // Entrada
  { tipo: "entrada.chat", rotulo: "Chat", categoria: "entrada", descricao: "Mensagem de texto do usuario.", ativo: true },
  { tipo: "entrada.arquivo", rotulo: "Arquivo", categoria: "entrada", descricao: "Documento anexado (texto extraido).", ativo: true },
  { tipo: "entrada.imagem", rotulo: "Imagem", categoria: "entrada", descricao: "Imagem para OCR/analise." },
  { tipo: "entrada.audio", rotulo: "Audio", categoria: "entrada", descricao: "Audio para transcricao." },

  // Prompt
  { tipo: "prompt", rotulo: "Prompt", categoria: "prompt", descricao: "System prompt, objetivo e persona.", ativo: true, dadosPadrao: { objetivo: "", persona: "" } },

  // Contexto
  { tipo: "contexto", rotulo: "Contexto", categoria: "contexto", descricao: "Empresa, cliente, processo ou usuario.", ativo: true, dadosPadrao: { fontes: [] } },

  // Conhecimento
  { tipo: "rag", rotulo: "RAG (Base)", categoria: "conhecimento", descricao: "Recupera trechos de bases de conhecimento.", ativo: true, dadosPadrao: { baseIds: [] } },

  // Memoria
  { tipo: "memoria", rotulo: "Memoria", categoria: "memoria", descricao: "Sessao, longa duracao ou resumo.", ativo: true, dadosPadrao: { tipo: "sessao", janela: 15 } },

  // Processamento
  { tipo: "ocr", rotulo: "OCR", categoria: "processamento", descricao: "Extrai texto de imagens/PDF escaneado.", ativo: true },
  { tipo: "parser", rotulo: "Parser", categoria: "processamento", descricao: "Estrutura dados extraidos." },
  { tipo: "classificador", rotulo: "Classificador", categoria: "processamento", descricao: "Classifica o conteudo." },

  // Ferramentas
  { tipo: "ferramenta.cnpj", rotulo: "Consultar CNPJ", categoria: "ferramenta", descricao: "Dados cadastrais de empresa por CNPJ (BrasilAPI). Detecta o CNPJ na mensagem.", ativo: true },
  { tipo: "ferramenta.receita", rotulo: "Receita (Tributario)", categoria: "ferramenta", descricao: "Situacao tributaria: Simples Nacional, MEI, regime e porte (por CNPJ).", ativo: true },
  { tipo: "ferramenta.datajud", rotulo: "DataJud", categoria: "ferramenta", descricao: "Consulta processual por numero CNJ (20 digitos) via API publica do CNJ.", ativo: true },
  { tipo: "ferramenta.http", rotulo: "HTTP (GET)", categoria: "ferramenta", descricao: "Requisicao GET a uma URL configurada; o retorno vira contexto.", ativo: true, dadosPadrao: { url: "", metodo: "GET" } },
  { tipo: "ferramenta.supabase_sql", rotulo: "Supabase SQL", categoria: "ferramenta", descricao: "Consulta a uma view/RPC." },
  { tipo: "ferramenta.webhook", rotulo: "Webhook", categoria: "ferramenta", descricao: "Dispara um webhook." },

  // Controle
  { tipo: "condicao.if", rotulo: "Se (IF)", categoria: "controle", descricao: "Ramo condicional (ex.: tem arquivo?).", ativo: true, dadosPadrao: { condicao: "tem_arquivo" } },
  { tipo: "switch", rotulo: "Switch", categoria: "controle", descricao: "Multiplos ramos." },
  { tipo: "merge", rotulo: "Merge", categoria: "controle", descricao: "Une ramos." },

  // Modelo
  { tipo: "modelo", rotulo: "Modelo IA", categoria: "modelo", descricao: "Modelo LLM e parametros.", ativo: true, dadosPadrao: { modelo: "gpt-4o", temperatura: 0.7 } },

  // Saida
  { tipo: "saida", rotulo: "Saida", categoria: "saida", descricao: "Formato da resposta.", ativo: true, dadosPadrao: { formato: "markdown" } },
];

export const NOS_POR_TIPO: Record<string, DefinicaoNo> = Object.fromEntries(NOS.map((n) => [n.tipo, n]));

export function defNo(tipo: string): DefinicaoNo | undefined {
  return NOS_POR_TIPO[tipo];
}

export function categoriaDoTipo(tipo: string): InfoCategoria {
  const def = NOS_POR_TIPO[tipo];
  return CATEGORIAS[def?.categoria ?? "controle"];
}
