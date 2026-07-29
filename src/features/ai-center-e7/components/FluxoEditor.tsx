import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState,
  type Node, type Edge, type Connection, type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LLM_MODELS } from "@/config/llmModels";
import { NoAgente } from "./NoAgente";
import { CATEGORIAS, NOS, NOS_POR_TIPO, defNo, type CategoriaNo } from "../nodes/catalogo";
import type { GrafoAgente, BaseConhecimento } from "../types";

interface Props {
  grafo: GrafoAgente;
  bases: BaseConhecimento[];
  onChange: (grafo: GrafoAgente) => void;
  onManual?: () => void; // sinaliza edicao manual do grafo (para o pai parar de regenerar)
}

export function FluxoEditor({ grafo, bases, onChange, onManual }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>((grafo.nodes ?? []) as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>((grafo.edges ?? []) as unknown as Edge[]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const ultimoEmitido = useRef<string>("");

  // Um unico renderer para todos os tipos do catalogo.
  const nodeTypes = useMemo<NodeTypes>(() => {
    const map: NodeTypes = {};
    for (const n of NOS) map[n.tipo] = NoAgente;
    return map;
  }, []);

  // Sincroniza o estado interno quando o grafo vem de fora (ex.: regenerado a
  // partir do formulario N1). Evita loop comparando com o ultimo emitido.
  useEffect(() => {
    const sig = JSON.stringify(grafo);
    if (sig !== ultimoEmitido.current) {
      ultimoEmitido.current = sig;
      setNodes((grafo.nodes ?? []) as unknown as Node[]);
      setEdges((grafo.edges ?? []) as unknown as Edge[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grafo]);

  // Propaga alteracoes para o pai (grafo canonico).
  useEffect(() => {
    const out = {
      nodes: nodes.map((n) => ({ id: n.id, type: n.type as string, position: n.position, data: n.data })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    };
    ultimoEmitido.current = JSON.stringify(out);
    onChange(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const onConnect = useCallback((c: Connection) => { onManual?.(); setEdges((eds) => addEdge(c, eds)); }, [setEdges, onManual]);

  function adicionarNo(tipo: string) {
    onManual?.();
    const def = defNo(tipo);
    const id = `${tipo}-${Date.now().toString(36)}`;
    const novo: Node = {
      id, type: tipo,
      position: { x: 120 + Math.random() * 240, y: 60 + Math.random() * 240 },
      data: { ...(def?.dadosPadrao ?? {}) },
    };
    setNodes((ns) => [...ns, novo]);
    setSelecionado(id);
  }

  function atualizarDados(id: string, patch: Record<string, unknown>) {
    onManual?.();
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  }

  function removerNo(id: string) {
    onManual?.();
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setSelecionado(null);
  }

  const noSel = nodes.find((n) => n.id === selecionado) ?? null;

  return (
    <div className="flex h-[560px] border rounded-lg overflow-hidden">
      {/* Paleta */}
      <div className="w-48 shrink-0 border-r overflow-y-auto p-2 space-y-3 bg-muted/30">
        {(Object.keys(CATEGORIAS) as CategoriaNo[]).map((cat) => {
          const nosCat = NOS.filter((n) => n.categoria === cat);
          if (nosCat.length === 0) return null;
          return (
            <div key={cat}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${CATEGORIAS[cat].cor.split(" ")[1]}`}>{CATEGORIAS[cat].rotulo}</p>
              <div className="space-y-1">
                {nosCat.map((n) => (
                  <button key={n.tipo} onClick={() => adicionarNo(n.tipo)} title={n.descricao}
                    className="w-full flex items-center gap-1 text-left text-xs px-2 py-1 rounded hover:bg-background border border-transparent hover:border-border">
                    <Plus className="w-3 h-3 shrink-0 opacity-50" />
                    <span className="truncate">{n.rotulo}</span>
                    {!n.ativo && <span className="ml-auto text-[9px] text-muted-foreground shrink-0">soon</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
          onNodeClick={(_, n) => setSelecionado(n.id)}
          onPaneClick={() => setSelecionado(null)}
          nodeTypes={nodeTypes}
          fitView proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable className="!bg-background" />
        </ReactFlow>
      </div>

      {/* Inspetor */}
      {noSel && (
        <div className="w-72 shrink-0 border-l overflow-y-auto p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{defNo(noSel.type as string)?.rotulo ?? noSel.type}</h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removerNo(noSel.id)}><Trash2 className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelecionado(null)}><X className="w-4 h-4" /></Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{NOS_POR_TIPO[noSel.type as string]?.descricao}</p>
          <InspetorNo no={noSel} bases={bases} onPatch={(p) => atualizarDados(noSel.id, p)} />
        </div>
      )}
    </div>
  );
}

function InspetorNo({ no, bases, onPatch }: { no: Node; bases: BaseConhecimento[]; onPatch: (p: Record<string, unknown>) => void }) {
  const d = (no.data ?? {}) as Record<string, unknown>;
  switch (no.type) {
    case "prompt":
      return (
        <div className="space-y-3">
          <Field label="Objetivo"><Textarea rows={2} value={String(d.objetivo ?? "")} onChange={(e) => onPatch({ objetivo: e.target.value })} /></Field>
          <Field label="Persona"><Textarea rows={4} value={String(d.persona ?? "")} onChange={(e) => onPatch({ persona: e.target.value })} /></Field>
        </div>
      );
    case "contexto":
      return (
        <div className="space-y-2">
          <Field label="Contexto fixo">
            <Textarea rows={6} value={String(d.texto ?? "")} onChange={(e) => onPatch({ texto: e.target.value })}
              placeholder="Dados do escritorio, cliente, regras internas, glossario, restricoes…" />
          </Field>
          <p className="text-xs text-muted-foreground">Este texto e injetado no prompt em toda conversa do agente.</p>
        </div>
      );
    case "modelo":
      return (
        <div className="space-y-3">
          <Field label="Modelo">
            <Select value={String(d.modelo ?? "gpt-4o")} onValueChange={(v) => onPatch({ modelo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LLM_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.displayName}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={`Temperatura: ${Number(d.temperatura ?? 0.7).toFixed(2)}`}>
            <Slider value={[Number(d.temperatura ?? 0.7)]} min={0} max={1} step={0.05} onValueChange={([v]) => onPatch({ temperatura: v })} />
          </Field>
          <Field label="Maximo de tokens">
            <Input type="number" min={256} max={32000} step={256} value={Number(d.max_tokens ?? 8192)} onChange={(e) => onPatch({ max_tokens: Number(e.target.value) })} />
          </Field>
        </div>
      );
    case "rag":
      return (
        <Field label="Bases de conhecimento">
          <div className="space-y-1">
            {bases.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma base disponivel.</p>}
            {bases.map((b) => {
              const ids = (d.baseIds as string[]) ?? [];
              const on = ids.includes(b.id);
              return (
                <button key={b.id} type="button"
                  onClick={() => onPatch({ baseIds: on ? ids.filter((x) => x !== b.id) : [...ids, b.id] })}
                  className={`w-full text-left text-xs px-2 py-1 rounded border ${on ? "border-primary bg-primary/5" : "hover:border-border"}`}>
                  {b.nome}{on ? " ✓" : ""}
                </button>
              );
            })}
          </div>
        </Field>
      );
    case "memoria":
      return (
        <div className="space-y-3">
          <Field label="Tipo">
            <Select value={String(d.tipo ?? "sessao")} onValueChange={(v) => onPatch({ tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sem">Sem memoria</SelectItem>
                <SelectItem value="sessao">Sessao</SelectItem>
                <SelectItem value="longa">Longa duracao</SelectItem>
                <SelectItem value="resumo">Resumo</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Janela (mensagens)"><Input type="number" value={Number(d.janela ?? 15)} onChange={(e) => onPatch({ janela: Number(e.target.value) })} /></Field>
        </div>
      );
    case "saida":
      return (
        <Field label="Formato">
          <Select value={String(d.formato ?? "markdown")} onValueChange={(v) => onPatch({ formato: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="markdown">Markdown</SelectItem>
              <SelectItem value="texto">Texto</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="tabela">Tabela</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      );
    case "ferramenta.http":
      return (
        <Field label="URL (GET)"><Input value={String(d.url ?? "")} onChange={(e) => onPatch({ url: e.target.value })} placeholder="https://…" /></Field>
      );
    case "condicao.if":
      return (
        <Field label="Condicao">
          <Select value={String(d.condicao ?? "tem_arquivo")} onValueChange={(v) => onPatch({ condicao: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="tem_arquivo">Tem arquivo?</SelectItem></SelectContent>
          </Select>
        </Field>
      );
    default:
      return <p className="text-xs text-muted-foreground">Sem parametros configuraveis.</p>;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
