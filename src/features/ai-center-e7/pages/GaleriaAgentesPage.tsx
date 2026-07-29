import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot, Plus, Sparkles, Globe, Lock, Loader2, Pencil, MessageSquare, Boxes, Cog, Search, X,
  Star, Archive, ArchiveRestore, Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { agenteService } from "../services/agenteService";
import type { Agente } from "../types";

export default function GaleriaAgentesPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [arquivados, setArquivados] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [iaAberto, setIaAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [aba, setAba] = useState<"agentes" | "favoritos" | "arquivados">("agentes");
  const [excluindo, setExcluindo] = useState<Agente | null>(null);

  useEffect(() => {
    Promise.all([agenteService.listar(), agenteService.idsFavoritos(), agenteService.idsArquivados()])
      .then(([ags, fav, arq]) => { setAgentes(ags); setFavoritos(new Set(fav)); setArquivados(new Set(arq)); })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar agentes"))
      .finally(() => setCarregando(false));
  }, []);

  const categorias = useMemo(
    () => Array.from(new Set(agentes.map((a) => a.categoria).filter(Boolean))) as string[],
    [agentes],
  );
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return agentes.filter((a) =>
      (categoria === "todas" || a.categoria === categoria) &&
      (!q || a.nome.toLowerCase().includes(q) || (a.descricao ?? "").toLowerCase().includes(q) || (a.objetivo ?? "").toLowerCase().includes(q)),
    );
  }, [agentes, busca, categoria]);

  const listaAtiva = useMemo(() => {
    if (aba === "arquivados") return filtrados.filter((a) => arquivados.has(a.id));
    const naoArquivados = filtrados.filter((a) => !arquivados.has(a.id));
    return aba === "favoritos" ? naoArquivados.filter((a) => favoritos.has(a.id)) : naoArquivados;
  }, [filtrados, aba, favoritos, arquivados]);

  async function alternarFavorito(a: Agente) {
    const on = !favoritos.has(a.id);
    setFavoritos((s) => { const n = new Set(s); if (on) n.add(a.id); else n.delete(a.id); return n; });
    try { await agenteService.definirFavorito(a.id, on); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  }
  async function alternarArquivado(a: Agente) {
    const on = !arquivados.has(a.id);
    setArquivados((s) => { const n = new Set(s); if (on) n.add(a.id); else n.delete(a.id); return n; });
    try {
      await agenteService.definirArquivado(a.id, on);
      toast.success(on ? "Agente arquivado" : "Agente desarquivado");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  }
  async function confirmarExcluir() {
    const a = excluindo;
    if (!a) return;
    try {
      await agenteService.excluir(a.id);
      setAgentes((cs) => cs.filter((x) => x.id !== a.id));
      toast.success("Agente excluido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Voce nao tem permissao para essa acao");
    } finally {
      setExcluindo(null);
    }
  }

  const vazioLabel = aba === "favoritos" ? "Nenhum agente favorito ainda."
    : aba === "arquivados" ? "Nenhum agente arquivado." : "Nenhum agente encontrado para o filtro atual.";

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> AI Center E7
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie, publique e utilize seus proprios agentes de inteligencia artificial.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => navigate("/ai-center-e7/conhecimento")}>
            <Boxes className="w-4 h-4 mr-1" /> Bases de conhecimento
          </Button>
          {hasPermission("admin") && (
            <Button variant="ghost" size="icon" title="Configuracao dos agentes de IA" onClick={() => navigate("/ai-center-e7/config")}>
              <Cog className="w-4 h-4" />
            </Button>
          )}
          <Button variant="outline" onClick={() => setIaAberto(true)}>
            <Sparkles className="w-4 h-4 mr-1" /> Construir com IA
          </Button>
          <Button onClick={() => navigate("/ai-center-e7/agentes/novo")}>
            <Plus className="w-4 h-4 mr-1" /> Novo agente
          </Button>
        </div>
      </header>

      {!carregando && agentes.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, descricao ou objetivo…" className="pl-9" />
              {busca && (
                <button onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="sm:w-56"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Tabs value={aba} onValueChange={(v) => setAba(v as typeof aba)}>
            <TabsList>
              <TabsTrigger value="agentes">Agentes</TabsTrigger>
              <TabsTrigger value="favoritos" className="gap-1"><Star className="w-3.5 h-3.5" /> Favoritos{favoritos.size ? ` (${favoritos.size})` : ""}</TabsTrigger>
              <TabsTrigger value="arquivados" className="gap-1"><Archive className="w-3.5 h-3.5" /> Arquivados{arquivados.size ? ` (${arquivados.size})` : ""}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {carregando ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando agentes…
        </div>
      ) : agentes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <Bot className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Voce ainda nao tem agentes. Crie o primeiro!</p>
            <Button onClick={() => navigate("/ai-center-e7/agentes/novo")}>
              <Plus className="w-4 h-4 mr-1" /> Criar agente
            </Button>
          </CardContent>
        </Card>
      ) : listaAtiva.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">{vazioLabel}</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listaAtiva.map((a) => (
            <CardAgente
              key={a.id} agente={a}
              favorito={favoritos.has(a.id)} arquivado={arquivados.has(a.id)}
              onUsar={() => navigate(`/ai-center-e7/agentes/${a.id}`)}
              onEditar={() => navigate(`/ai-center-e7/agentes/${a.id}/editar`)}
              onFavoritar={() => alternarFavorito(a)}
              onArquivar={() => alternarArquivado(a)}
              onExcluir={() => setExcluindo(a)}
            />
          ))}
        </div>
      )}

      <ConstruirComIADialog aberto={iaAberto} onOpenChange={setIaAberto} />

      <AlertDialog open={!!excluindo} onOpenChange={(v) => !v && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o agente "{excluindo?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O agente deixa de aparecer na lista. O historico de custos e execucoes e preservado.
              {excluindo?.status === "publicado" && excluindo?.escopo === "escritorio" && (
                <span className="block mt-2">Este agente e do escritorio — apenas administrador, TI e advogado adm podem excluir.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExcluir} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir agente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CardAgente({ agente: a, favorito, arquivado, onUsar, onEditar, onFavoritar, onArquivar, onExcluir }: {
  agente: Agente; favorito: boolean; arquivado: boolean;
  onUsar: () => void; onEditar: () => void; onFavoritar: () => void; onArquivar: () => void; onExcluir: () => void;
}) {
  return (
    <Card className="flex flex-col hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base leading-tight line-clamp-2 break-words">{a.nome}</CardTitle>
          </div>
          <StatusBadge agente={a} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-3">
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
          {a.descricao || a.objetivo || "Sem descricao."}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="font-mono">{a.modelo_llm}</Badge>
          {a.categoria && <span>· {a.categoria}</span>}
        </div>
        <div className="flex items-center gap-1 mt-auto pt-2">
          <Button size="sm" className="flex-1" onClick={onUsar}>
            <MessageSquare className="w-4 h-4 mr-1" /> Usar
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" title={favorito ? "Remover dos favoritos" : "Favoritar"} onClick={onFavoritar}>
            <Star className={cn("w-4 h-4", favorito ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" title={arquivado ? "Desarquivar" : "Arquivar"} onClick={onArquivar}>
            {arquivado ? <ArchiveRestore className="w-4 h-4 text-primary" /> : <Archive className="w-4 h-4 text-muted-foreground" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={onEditar}>
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Excluir" onClick={onExcluir}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConstruirComIADialog({ aberto, onOpenChange }: { aberto: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [descricao, setDescricao] = useState("");
  const [gerando, setGerando] = useState(false);

  async function gerar() {
    if (!descricao.trim()) { toast.error("Descreva o agente que voce quer criar"); return; }
    setGerando(true);
    try {
      const spec = await agenteService.gerarComIA(descricao);
      const criado = await agenteService.criar(spec);
      toast.success("Agente gerado! Revise e publique.");
      onOpenChange(false);
      navigate(`/ai-center-e7/agentes/${criado.id}/editar`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar agente");
    } finally {
      setGerando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Construir agente com IA</DialogTitle>
          <DialogDescription>Descreva em linguagem natural o que o agente deve fazer. A IA gera prompt, modelo e o fluxo.</DialogDescription>
        </DialogHeader>
        <Textarea rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Quero um agente especialista em elaborar recursos tributarios, usando a base de conhecimento Tributaria, consultando CNPJ quando necessario e respondendo de forma tecnica." />
        <DialogFooter>
          <Button onClick={gerar} disabled={gerando}>
            {gerando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />} Gerar agente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ agente }: { agente: Agente }) {
  if (agente.status === "publicado") {
    return (
      <Badge className="shrink-0 gap-1">
        <Globe className="w-3 h-3" /> {agente.escopo === "escritorio" ? "Escritorio" : "Publicado"}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0 gap-1">
      <Lock className="w-3 h-3" /> Rascunho
    </Badge>
  );
}
