import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Globe, Workflow, Boxes, Sparkles, PlayCircle, History, DollarSign, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LLM_MODELS } from "@/config/llmModels";
import { agenteService, type ExecucaoResumo, type VersaoResumo } from "../services/agenteService";
import { conhecimentoService } from "../services/conhecimentoService";
import { FluxoEditor } from "../components/FluxoEditor";
import { NOS } from "../nodes/catalogo";
import { formParaGrafo } from "../utils/grafoCanonico";
import type { BaseConhecimento, DadosAgente, GrafoAgente } from "../types";

const VAZIO: DadosAgente = {
  nome: "", descricao: "", categoria: "", objetivo: "", persona: "", contexto: "",
  modelo_llm: "gpt-4o", temperatura: 0.7, max_tokens: 8192, escopo: "privado",
};

export default function ConstrutorAgentePage() {
  const { agenteId } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(agenteId);

  const [dados, setDados] = useState<DadosAgente>(VAZIO);
  const [carregando, setCarregando] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [bases, setBases] = useState<BaseConhecimento[]>([]);
  const [baseIds, setBaseIds] = useState<string[]>([]);
  const [grafo, setGrafo] = useState<GrafoAgente>(() => formParaGrafo(VAZIO));
  // Enquanto false, o grafo e regenerado automaticamente a partir do formulario
  // (N1). Ao editar manualmente no React Flow (N2), passa a preservar o grafo.
  const [grafoManual, setGrafoManual] = useState(false);

  useEffect(() => {
    conhecimentoService.listarBases().then(setBases).catch(() => { /* silencioso */ });
  }, []);

  // Alimenta os nos do Fluxo com os dados do formulario, ate haver edicao manual.
  useEffect(() => {
    if (!grafoManual) setGrafo(formParaGrafo({ ...dados, baseIds }));
  }, [dados, baseIds, grafoManual]);

  useEffect(() => {
    if (!agenteId) return;
    Promise.all([agenteService.obter(agenteId), agenteService.basesDoAgente(agenteId)])
      .then(([a, ids]) => {
        if (!a) { toast.error("Agente nao encontrado"); navigate("/ai-center-e7"); return; }
        const noCtx = a.grafo?.nodes?.find((n) => n.type === "contexto");
        setDados({
          nome: a.nome, descricao: a.descricao ?? "", categoria: a.categoria ?? "",
          objetivo: a.objetivo ?? "", persona: a.persona ?? "", modelo_llm: a.modelo_llm,
          contexto: String((noCtx?.data as Record<string, unknown>)?.texto ?? ""),
          temperatura: Number(a.temperatura), max_tokens: a.max_tokens, escopo: a.escopo,
        });
        setBaseIds(ids);
        // Preserva grafos editados manualmente / gerados por IA (que tem nos
        // alem do canonico); grafos canonicos continuam dirigidos pelo formulario.
        if (a.grafo?.nodes?.length) {
          const formDados = { nome: a.nome, descricao: a.descricao ?? "", objetivo: a.objetivo ?? "", persona: a.persona ?? "", modelo_llm: a.modelo_llm, temperatura: Number(a.temperatura), baseIds: ids };
          const canonicoTipos = new Set(formParaGrafo(formDados).nodes.map((n) => n.type));
          const tipos = a.grafo.nodes.map((n) => n.type);
          const ehManual = tipos.length !== canonicoTipos.size || tipos.some((t) => !canonicoTipos.has(t));
          setGrafo(a.grafo);
          setGrafoManual(ehManual);
        }
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setCarregando(false));
  }, [agenteId, navigate]);

  function alternarBase(id: string) {
    setBaseIds((atual) => atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]);
  }

  // Adiciona/remove um no de ferramenta no grafo (entra em modo manual).
  function alternarFerramenta(tipo: string) {
    setGrafoManual(true);
    setGrafo((g) => {
      const existe = g.nodes.some((n) => n.type === tipo);
      if (existe) {
        return { nodes: g.nodes.filter((n) => n.type !== tipo), edges: g.edges.filter((e) => !e.source.startsWith(tipo) && !e.target.startsWith(tipo)) };
      }
      const id = `${tipo}-${Date.now().toString(36)}`;
      const x = 60 + g.nodes.length * 40;
      return { nodes: [...g.nodes, { id, type: tipo, position: { x, y: 340 }, data: tipo === "ferramenta.http" ? { url: "", metodo: "GET" } : {} }], edges: g.edges };
    });
  }

  function definirUrlHttp(url: string) {
    setGrafoManual(true);
    setGrafo((g) => ({ ...g, nodes: g.nodes.map((n) => (n.type === "ferramenta.http" ? { ...n, data: { ...n.data, url } } : n)) }));
  }

  const [gerandoPrompt, setGerandoPrompt] = useState(false);
  async function gerarPromptIA() {
    const objetivo = (dados.objetivo || dados.descricao || "").trim();
    if (!objetivo) { toast.error("Preencha o objetivo (ou a descricao) para a IA gerar o prompt"); return; }
    setGerandoPrompt(true);
    try {
      const persona = await agenteService.gerarPrompt(objetivo, dados.nome);
      set("persona", persona);
      toast.success("Prompt gerado! Revise e ajuste se necessario.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar prompt");
    } finally {
      setGerandoPrompt(false);
    }
  }

  const set = <K extends keyof DadosAgente>(k: K, v: DadosAgente[K]) => setDados((d) => ({ ...d, [k]: v }));

  async function salvar(publicar = false) {
    if (!dados.nome.trim()) { toast.error("Informe um nome para o agente"); return; }
    setSalvando(true);
    try {
      const payload: DadosAgente = { ...dados, baseIds, grafo };
      const salvo = editando
        ? await agenteService.atualizar(agenteId!, payload)
        : await agenteService.criar(payload);
      if (publicar) {
        await agenteService.publicar(salvo.id, "escritorio");
        toast.success("Agente publicado para o escritorio!");
      } else {
        toast.success(editando ? "Agente atualizado" : "Agente criado");
      }
      navigate("/ai-center-e7");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…</div>;
  }

  return (
    <div className="w-full space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ai-center-e7")}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="text-xl font-bold truncate">{editando ? "Editar agente" : "Novo agente"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => salvar(false)} disabled={salvando}>
            {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Salvar rascunho
          </Button>
          <Button onClick={() => salvar(true)} disabled={salvando}>
            <Globe className="w-4 h-4 mr-1" /> Publicar
          </Button>
        </div>
      </header>

      <Tabs defaultValue="config">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="config"><Sparkles className="w-4 h-4 mr-1" /> Configuracoes</TabsTrigger>
          <TabsTrigger value="conhecimento"><Boxes className="w-4 h-4 mr-1" /> Conhecimento</TabsTrigger>
          <TabsTrigger value="conexoes"><Plug className="w-4 h-4 mr-1" /> Conexoes</TabsTrigger>
          <TabsTrigger value="fluxo"><Workflow className="w-4 h-4 mr-1" /> Fluxo</TabsTrigger>
          <TabsTrigger value="simulacao"><PlayCircle className="w-4 h-4 mr-1" /> Simulacao</TabsTrigger>
          <TabsTrigger value="versoes"><History className="w-4 h-4 mr-1" /> Versoes</TabsTrigger>
          <TabsTrigger value="custos"><DollarSign className="w-4 h-4 mr-1" /> Custos</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input value={dados.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: Especialista em Recursos Tributarios" />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Input value={dados.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder="Ex.: Tributario" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Descricao</Label>
                <Textarea value={dados.descricao} onChange={(e) => set("descricao", e.target.value)} rows={2} placeholder="Breve descricao do que o agente faz." />
              </div>

              <div className="space-y-1.5">
                <Label>Objetivo</Label>
                <Textarea value={dados.objetivo} onChange={(e) => set("objetivo", e.target.value)} rows={2} placeholder="Qual problema o agente resolve?" />
              </div>

              <div className="space-y-1.5">
                <Label>Contexto fixo</Label>
                <Textarea value={dados.contexto} onChange={(e) => set("contexto", e.target.value)} rows={3}
                  placeholder="Informacoes que o agente sempre deve considerar: dados do escritorio, cliente, regras internas, glossario, restricoes…" />
                <p className="text-xs text-muted-foreground">Injetado no prompt em toda conversa. Tambem editavel no no "Contexto" da aba Fluxo.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Persona / System prompt</Label>
                  <Button type="button" variant="ghost" size="sm" disabled={gerandoPrompt} onClick={gerarPromptIA}>
                    {gerandoPrompt ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />} Gerar com IA
                  </Button>
                </div>
                <Textarea value={dados.persona} onChange={(e) => set("persona", e.target.value)} rows={5}
                  placeholder="Como o agente deve se comportar, tom, limites e formato de resposta." />
                <p className="text-xs text-muted-foreground">O agente criador de prompts usa o objetivo acima para escrever isto.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Modelo</Label>
                  <Select value={dados.modelo_llm} onValueChange={(v) => set("modelo_llm", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LLM_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Temperatura: {dados.temperatura?.toFixed(2)}</Label>
                  <Slider value={[dados.temperatura ?? 0.7]} min={0} max={1} step={0.05}
                    onValueChange={([v]) => set("temperatura", v)} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Maximo de tokens por resposta</Label>
                  <Input type="number" min={256} max={32000} step={256} value={dados.max_tokens ?? 8192}
                    onChange={(e) => set("max_tokens", Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">Limita o tamanho da resposta (nao o total). Valores baixos truncam respostas longas — 8192+ recomendado para relatorios.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conhecimento" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label>Bases de conhecimento (RAG)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Selecione as bases que este agente pode consultar.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/ai-center-e7/conhecimento")}>
                  <Boxes className="w-4 h-4 mr-1" /> Gerenciar bases
                </Button>
              </div>
              {bases.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhuma base disponivel. Crie uma em "Gerenciar bases".</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {bases.map((b) => {
                    const marcada = baseIds.includes(b.id);
                    return (
                      <button key={b.id} type="button" onClick={() => alternarBase(b.id)}
                        className={`text-left p-3 rounded-lg border transition-colors ${marcada ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">{b.nome}</span>
                          <span className={`text-xs shrink-0 ${marcada ? "text-primary" : "text-muted-foreground"}`}>{marcada ? "Selecionada" : "Selecionar"}</span>
                        </div>
                        {b.descricao && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{b.descricao}</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="conexoes" className="mt-4">
          <AbaConexoes grafo={grafo} onToggle={alternarFerramenta} onUrl={definirUrlHttp} />
        </TabsContent>
        <TabsContent value="fluxo" className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Modo avancado: arraste nos da paleta, conecte e configure. O grafo e a fonte de verdade do agente.</p>
            <Button variant="outline" size="sm" onClick={() => { setGrafoManual(false); setGrafo(formParaGrafo({ ...dados, baseIds })); }}>
              <Workflow className="w-4 h-4 mr-1" /> Gerar do formulario
            </Button>
          </div>
          {grafoManual && <p className="text-[11px] text-amber-600">Fluxo em modo manual: alteracoes no formulario nao sobrescrevem o grafo. Use "Gerar do formulario" para voltar.</p>}
          <FluxoEditor grafo={grafo} bases={bases} onChange={setGrafo} onManual={() => setGrafoManual(true)} />
        </TabsContent>
        <TabsContent value="simulacao" className="mt-4">
          {agenteId ? <AbaSimulacao agenteId={agenteId} /> : <PlaceholderAba texto="Salve o agente para simular." />}
        </TabsContent>
        <TabsContent value="versoes" className="mt-4">
          {agenteId ? <AbaVersoes agenteId={agenteId} /> : <PlaceholderAba texto="Salve o agente para versionar." />}
        </TabsContent>
        <TabsContent value="custos" className="mt-4">
          {agenteId ? <AbaCustos agenteId={agenteId} /> : <PlaceholderAba texto="Salve o agente para ver custos e execucoes." />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AbaConexoes({ grafo, onToggle, onUrl }: { grafo: GrafoAgente; onToggle: (tipo: string) => void; onUrl: (url: string) => void }) {
  const ferramentas = NOS.filter((n) => n.categoria === "ferramenta" && n.ativo);
  const noHttp = grafo.nodes.find((n) => n.type === "ferramenta.http");
  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <p className="text-sm text-muted-foreground">Ative as ferramentas que este agente pode acionar. Elas sao executadas automaticamente quando a mensagem contiver os dados necessarios (ex.: CNPJ, numero CNJ).</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {ferramentas.map((f) => {
            const ativa = grafo.nodes.some((n) => n.type === f.tipo);
            return (
              <button key={f.tipo} type="button" onClick={() => onToggle(f.tipo)}
                className={`text-left p-3 rounded-lg border transition-colors ${ativa ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{f.rotulo}</span>
                  <span className={`text-xs shrink-0 ${ativa ? "text-primary" : "text-muted-foreground"}`}>{ativa ? "Ativa" : "Ativar"}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{f.descricao}</p>
              </button>
            );
          })}
        </div>
        {noHttp && (
          <div className="space-y-1.5 pt-2">
            <Label>URL da ferramenta HTTP (GET)</Label>
            <Input value={String((noHttp.data as Record<string, unknown>)?.url ?? "")} onChange={(e) => onUrl(e.target.value)} placeholder="https://…" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlaceholderAba({ texto }: { texto: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center text-sm text-muted-foreground">{texto}</CardContent>
    </Card>
  );
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 6 });

const PERIODOS = [
  { v: "7", label: "Ultimos 7 dias" },
  { v: "30", label: "Ultimos 30 dias" },
  { v: "90", label: "Ultimos 90 dias" },
  { v: "0", label: "Todo o periodo" },
];

function AbaCustos({ agenteId }: { agenteId: string }) {
  const [resumo, setResumo] = useState<{ total: number; execucoes: number; tokens: number } | null>(null);
  const [execs, setExecs] = useState<ExecucaoResumo[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [periodo, setPeriodo] = useState("30");
  const [carregando, setCarregando] = useState(true);

  const desde = periodo === "0" ? undefined : new Date(Date.now() - Number(periodo) * 86400000).toISOString();

  useEffect(() => {
    setCarregando(true);
    Promise.all([
      agenteService.resumoCustos(agenteId, desde),
      agenteService.execucoesPaginadas(agenteId, { desde, pagina, porPagina: 20 }),
    ])
      .then(([r, e]) => { setResumo(r); setExecs(e.itens); setTotal(e.total); })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Erro ao carregar custos"))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agenteId, periodo, pagina]);

  const totalPaginas = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="grid grid-cols-3 gap-3 flex-1">
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Custo total (~R$)</p><p className="text-2xl font-bold">{brl(resumo?.total ?? 0)}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Execucoes</p><p className="text-2xl font-bold">{resumo?.execucoes ?? 0}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Tokens</p><p className="text-2xl font-bold">{(resumo?.tokens ?? 0).toLocaleString("pt-BR")}</p></CardContent></Card>
        </div>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">Execucoes</CardTitle>
          <Select value={periodo} onValueChange={(v) => { setPeriodo(v); setPagina(0); }}>
            <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODOS.map((p) => <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="py-8 text-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Carregando…</div>
          ) : execs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma execucao no periodo.</p>
          ) : (
            <>
              <ul className="divide-y text-sm">
                {execs.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${e.status === "sucesso" ? "bg-green-500" : "bg-destructive"}`} />
                    <span className="text-muted-foreground text-xs w-36 shrink-0">{new Date(e.iniciado_em).toLocaleString("pt-BR")}</span>
                    <span className="font-mono text-xs">{e.modelo}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{e.tokens_entrada + e.tokens_saida} tok</span>
                    <span className="text-xs w-20 text-right">{brl(Number(e.custo_reais || 0))}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>{total} execucao(oes) · pagina {pagina + 1} de {totalPaginas}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={pagina + 1 >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Proxima</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AbaVersoes({ agenteId }: { agenteId: string }) {
  const [versoes, setVersoes] = useState<VersaoResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    agenteService.versoes(agenteId).then(setVersoes).catch((e) => toast.error(e instanceof Error ? e.message : "Erro")).finally(() => setCarregando(false));
  }, [agenteId]);
  if (carregando) return <div className="py-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Carregando…</div>;
  return (
    <Card>
      <CardContent className="pt-6">
        {versoes.length === 0 ? <p className="text-sm text-muted-foreground py-4">Nenhuma versao publicada ainda. Publique para criar a v1.</p> : (
          <ul className="divide-y text-sm">
            {versoes.map((v) => (
              <li key={v.id} className="flex items-center gap-3 py-2">
                <span className="font-semibold">v{v.versao}</span>
                <span className="text-xs text-muted-foreground">{v.notas || "—"}</span>
                <span className="text-xs text-muted-foreground ml-auto">{new Date(v.publicado_em || v.criado_em).toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AbaSimulacao({ agenteId }: { agenteId: string }) {
  const [entrada, setEntrada] = useState("");
  const [saida, setSaida] = useState<string | null>(null);
  const [trilha, setTrilha] = useState<Array<{ no: string; detalhe: string }>>([]);
  const [rodando, setRodando] = useState(false);

  async function rodar() {
    if (!entrada.trim()) return;
    setRodando(true); setSaida(null); setTrilha([]);
    try {
      const r = await agenteService.executar(agenteId, entrada);
      setSaida(r.output); setTrilha(r.trilha ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na simulacao");
    } finally {
      setRodando(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <Textarea rows={3} value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="Mensagem de teste para o agente…" />
        <Button onClick={rodar} disabled={rodando || !entrada.trim()}>
          {rodando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <PlayCircle className="w-4 h-4 mr-1" />} Executar
        </Button>
        {trilha.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {trilha.map((t, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-muted text-muted-foreground">{t.no}: {t.detalhe}</span>
            ))}
          </div>
        )}
        {saida && (
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Resposta</p>
            <div className="text-sm whitespace-pre-wrap">{saida}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
