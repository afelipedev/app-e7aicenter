// Converte os campos do formulario simples (N1) em um grafo declarativo canonico
// e vice-versa. O grafo e a fonte de verdade lida pela Edge Function; o form e o
// construtor React Flow (N2) editam a mesma estrutura.
import type { Agente, DadosAgente, GrafoAgente } from "../types";

const POS = (x: number, y = 0) => ({ x, y });

// Gera o pipeline linear Prompt -> Contexto -> RAG -> Memoria -> Modelo -> Saida.
export function formParaGrafo(dados: DadosAgente): GrafoAgente {
  const temRag = (dados.baseIds?.length ?? 0) > 0;
  const nodes = [
    { id: "prompt", type: "prompt", position: POS(0), data: { objetivo: dados.objetivo ?? "", persona: dados.persona ?? "" } },
    { id: "contexto", type: "contexto", position: POS(220), data: { texto: dados.contexto ?? "" } },
    ...(temRag ? [{ id: "rag", type: "rag", position: POS(440), data: { baseIds: dados.baseIds } }] : []),
    { id: "memoria", type: "memoria", position: POS(660), data: { tipo: "sessao", janela: 15 } },
    { id: "modelo", type: "modelo", position: POS(880), data: { modelo: dados.modelo_llm ?? "gpt-4o", temperatura: dados.temperatura ?? 0.7, max_tokens: dados.max_tokens ?? 8192 } },
    { id: "saida", type: "saida", position: POS(1100), data: { formato: "markdown" } },
  ];
  const ordem = nodes.map((n) => n.id);
  const edges = ordem.slice(0, -1).map((source, i) => ({ id: `e-${source}-${ordem[i + 1]}`, source, target: ordem[i + 1] }));
  return { nodes, edges };
}

// Extrai o system prompt compilado a partir dos campos do agente.
// Se a persona ja for um System Prompt completo (ex.: gerado pela IA com a
// estrutura enterprise), usa-a diretamente; caso contrario, monta a partir dos
// campos do formulario.
export function compilarConfig(dados: DadosAgente): Record<string, unknown> {
  const persona = (dados.persona ?? "").trim();
  let promptSistema: string;
  if (persona.length > 120 || /#\s*SYSTEM PROMPT/i.test(persona)) {
    promptSistema = persona;
  } else {
    const partes: string[] = [];
    if (persona) partes.push(`Persona: ${persona}`);
    if (dados.objetivo) partes.push(`Objetivo: ${dados.objetivo}`);
    if (dados.descricao) partes.push(dados.descricao);
    partes.push("Responda sempre em portugues do Brasil (pt-BR), de forma tecnica e objetiva.");
    promptSistema = partes.join("\n\n");
  }
  return { promptSistema, rag: (dados.baseIds?.length ?? 0) > 0 };
}

// Deriva os campos do form a partir de um agente ja salvo (para reabrir o N1).
export function agenteParaForm(agente: Agente): DadosAgente {
  return {
    nome: agente.nome,
    descricao: agente.descricao ?? "",
    categoria: agente.categoria ?? "",
    objetivo: agente.objetivo ?? "",
    persona: agente.persona ?? "",
    icone: agente.icone ?? "",
    modelo_llm: agente.modelo_llm,
    temperatura: Number(agente.temperatura),
    max_tokens: agente.max_tokens,
    escopo: agente.escopo,
  };
}
