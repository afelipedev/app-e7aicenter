import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, Zap, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { aiCostsService, ORIGEM_LABELS, type ExecucaoCusto, type AgenteOpcao } from "../services/aiCostsService";

const PERIODOS = [
  { v: "7", label: "Últimos 7 dias" },
  { v: "30", label: "Últimos 30 dias" },
  { v: "90", label: "Últimos 90 dias" },
  { v: "0", label: "Todo o período" },
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 6 });

// Deriva o filtro (agente_id vs origem) a partir do valor do dropdown.
function parseAlvo(alvo: string): { agenteId?: string; origem?: string } {
  if (alvo === "todos") return {};
  if (alvo.startsWith("agente:")) return { agenteId: alvo.slice(7) };
  return { origem: alvo }; // gerador_agente | gerador_prompt
}

export function CustosIaTab() {
  const { toast } = useToast();
  const [agentes, setAgentes] = useState<AgenteOpcao[]>([]);
  const [periodo, setPeriodo] = useState("30");
  const [alvo, setAlvo] = useState("todos");
  const [pagina, setPagina] = useState(0);
  const [resumo, setResumo] = useState<{ total: number; execucoes: number; tokens: number } | null>(null);
  const [execs, setExecs] = useState<ExecucaoCusto[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    aiCostsService.agentes().then(setAgentes).catch(() => { /* silencioso */ });
  }, []);

  const filtro = useMemo(() => ({
    desde: periodo === "0" ? undefined : new Date(Date.now() - Number(periodo) * 86400000).toISOString(),
    ...parseAlvo(alvo),
  }), [periodo, alvo]);

  useEffect(() => {
    setCarregando(true);
    Promise.all([aiCostsService.resumo(filtro), aiCostsService.execucoes(filtro, pagina, 20)])
      .then(([r, e]) => { setResumo(r); setExecs(e.itens); setTotal(e.total); })
      .catch((err) => toast({ title: "Erro ao carregar custos", description: String(err), variant: "destructive" }))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro, pagina]);

  const totalPaginas = Math.max(1, Math.ceil(total / 20));

  const nomeExecucao = (e: ExecucaoCusto) =>
    e.origem === "agente" ? (e.agente_nome ?? "Agente removido") : (ORIGEM_LABELS[e.origem] ?? e.origem);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Consumo de IA de todos os agentes do AI Center E7 e dos utilitários (Construir com IA e Gerador de prompts).
        Os valores em R$ são estimados a partir da tabela de preços por token.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={alvo} onValueChange={(v) => { setAlvo(v); setPagina(0); }}>
          <SelectTrigger className="sm:w-72"><SelectValue placeholder="Agente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os agentes e utilitários</SelectItem>
            <SelectItem value="gerador_agente">{ORIGEM_LABELS.gerador_agente}</SelectItem>
            <SelectItem value="gerador_prompt">{ORIGEM_LABELS.gerador_prompt}</SelectItem>
            {agentes.map((a) => <SelectItem key={a.id} value={`agente:${a.id}`}>{a.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={periodo} onValueChange={(v) => { setPeriodo(v); setPagina(0); }}>
          <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>{PERIODOS.map((p) => <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Custo total (~R$)</p><p className="text-2xl font-bold">{brl(resumo?.total ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Execuções</p><p className="text-2xl font-bold">{resumo?.execucoes ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Tokens</p><p className="text-2xl font-bold">{(resumo?.tokens ?? 0).toLocaleString("pt-BR")}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Execuções</CardTitle></CardHeader>
        <CardContent>
          {carregando ? (
            <div className="py-8 text-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Carregando…</div>
          ) : execs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma execução no período/filtro.</p>
          ) : (
            <>
              <ul className="divide-y text-sm">
                {execs.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${e.status === "sucesso" ? "bg-green-500" : "bg-destructive"}`} />
                    <span className="text-muted-foreground text-xs w-32 shrink-0">{new Date(e.iniciado_em).toLocaleString("pt-BR")}</span>
                    <span className="truncate flex-1 min-w-0" title={nomeExecucao(e)}>{nomeExecucao(e)}</span>
                    <span className="font-mono text-xs text-muted-foreground hidden md:inline">{e.modelo}</span>
                    <span className="text-xs text-muted-foreground w-20 text-right shrink-0">{(e.tokens_entrada + e.tokens_saida).toLocaleString("pt-BR")} tok</span>
                    <span className="text-xs w-24 text-right shrink-0">{brl(Number(e.custo_reais || 0))}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>{total} execução(ões) · página {pagina + 1} de {totalPaginas}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={pagina + 1 >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Próxima</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
