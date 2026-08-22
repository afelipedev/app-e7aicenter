import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Boxes, Plus, Loader2, Upload, FileText, Trash2, Pencil, Search,
  CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { UsersPagination } from "@/components/UsersPagination";
import { toast } from "sonner";
import { conhecimentoService, type DocumentoInfo } from "../services/conhecimentoService";
import type { BaseConhecimento } from "../types";

const TIPOS: Array<{ v: BaseConhecimento["tipo"]; label: string }> = [
  { v: "geral", label: "Geral" }, { v: "juridica", label: "Juridica" },
  { v: "tributaria", label: "Tributaria" }, { v: "financeira", label: "Financeira" },
  { v: "contabil", label: "Contabil" },
];

const DOCUMENTOS_POR_PAGINA = 10;

export default function ConhecimentoPage() {
  const navigate = useNavigate();
  const [bases, setBases] = useState<BaseConhecimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionada, setSelecionada] = useState<BaseConhecimento | null>(null);

  useEffect(() => { carregarBases(); }, []);

  async function carregarBases() {
    setCarregando(true);
    try {
      const b = await conhecimentoService.listarBases();
      setBases(b);
      setSelecionada((atual) => atual ? (b.find((x) => x.id === atual.id) ?? b[0] ?? null) : (b[0] ?? null));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar bases");
    } finally {
      setCarregando(false);
    }
  }

  async function excluirBase(base: BaseConhecimento) {
    try {
      await conhecimentoService.excluirBase(base.id);
      toast.success("Base excluida");
      await carregarBases();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir base");
    }
  }

  return (
    <div className="w-full space-y-6">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ai-center-e7")}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Boxes className="w-6 h-6 text-primary" /> Bases de Conhecimento</h1>
          <p className="text-muted-foreground text-sm mt-1">Envie documentos para alimentar o RAG dos seus agentes.</p>
        </div>
        <BaseFormDialog onSalva={carregarBases} />
      </header>

      {carregando ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2 lg:col-span-1">
            {bases.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma base ainda.</p>}
            {bases.map((b) => (
              <div key={b.id}
                className={`group w-full text-left p-3 rounded-lg border transition-colors ${selecionada?.id === b.id ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}>
                <button onClick={() => setSelecionada(b)} className="w-full text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{b.nome}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">{b.tipo}</Badge>
                  </div>
                  {b.descricao && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{b.descricao}</p>}
                </button>
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <BaseFormDialog base={b} onSalva={carregarBases} trigger={
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="w-3.5 h-3.5" /></Button>
                  } />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir base "{b.nome}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acao remove a base e todos os documentos e fragmentos vinculados a ela, incluindo os arquivos enviados. Nao pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => excluirBase(b)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2">
            {selecionada ? <PainelDocumentos base={selecionada} /> : (
              <Card className="border-dashed"><CardContent className="py-16 text-center text-muted-foreground">Selecione ou crie uma base.</CardContent></Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BaseFormDialog({ base, onSalva, trigger }: { base?: BaseConhecimento; onSalva: () => void; trigger?: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(base?.nome ?? "");
  const [descricao, setDescricao] = useState(base?.descricao ?? "");
  const [tipo, setTipo] = useState<BaseConhecimento["tipo"]>(base?.tipo ?? "geral");
  const [salvando, setSalvando] = useState(false);
  const editando = !!base;

  function onOpenChange(v: boolean) {
    setAberto(v);
    if (v) { setNome(base?.nome ?? ""); setDescricao(base?.descricao ?? ""); setTipo(base?.tipo ?? "geral"); }
  }

  async function salvar() {
    if (!nome.trim()) { toast.error("Informe um nome"); return; }
    setSalvando(true);
    try {
      if (editando) {
        await conhecimentoService.atualizarBase(base.id, { nome, descricao, tipo });
        toast.success("Base atualizada");
      } else {
        await conhecimentoService.criarBase({ nome, descricao, tipo });
        toast.success("Base criada");
      }
      setAberto(false);
      if (!editando) { setNome(""); setDescricao(""); setTipo("geral"); }
      onSalva();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar base");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button><Plus className="w-4 h-4 mr-1" /> Nova base</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{editando ? "Editar base de conhecimento" : "Nova base de conhecimento"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Base Tributaria" /></div>
          <div className="space-y-1.5"><Label>Descricao</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} /></div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as BaseConhecimento["tipo"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={salvar} disabled={salvando}>{salvando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} {editando ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PainelDocumentos({ base }: { base: BaseConhecimento }) {
  const [docs, setDocs] = useState<DocumentoInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function carregar(paginaAlvo = pagina, searchAlvo = buscaAplicada) {
    setCarregando(true);
    try {
      const { data, total: t } = await conhecimentoService.listarDocumentos(base.id, {
        page: paginaAlvo, pageSize: DOCUMENTOS_POR_PAGINA, search: searchAlvo || undefined,
      });
      setDocs(data);
      setTotal(t);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar documentos");
    } finally {
      setCarregando(false);
    }
  }

  // Troca de base: reseta busca/paginacao e recarrega.
  useEffect(() => {
    setBusca(""); setBuscaAplicada(""); setPagina(1);
    carregar(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.id]);

  // Debounce da busca antes de disparar a query.
  useEffect(() => {
    const t = setTimeout(() => {
      if (busca !== buscaAplicada) { setPagina(1); setBuscaAplicada(busca); carregar(1, busca); }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  // Polling leve enquanto houver documento processando (mantem a pagina atual).
  useEffect(() => {
    if (!docs.some((d) => d.status === "pendente" || d.status === "processando")) return;
    const t = setInterval(() => carregar(pagina, buscaAplicada), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, pagina, buscaAplicada]);

  function mudarPagina(p: number) {
    setPagina(p);
    carregar(p, buscaAplicada);
  }

  async function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    if (arquivos.length === 0) return;
    setEnviando(true);
    let ok = 0;
    const erros: string[] = [];
    // Envia sequencialmente para nao estourar recursos de ingestao simultanea.
    for (const arquivo of arquivos) {
      try {
        await conhecimentoService.enviarDocumento(base.id, arquivo);
        ok++;
      } catch (err) {
        erros.push(`${arquivo.name}: ${err instanceof Error ? err.message : "erro"}`);
      }
    }
    if (ok) toast.success(`${ok} documento(s) enviado(s). Processando…`);
    if (erros.length) toast.error(erros.join(" | "));
    carregar(1, buscaAplicada);
    setPagina(1);
    setEnviando(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function excluir(id: string) {
    try {
      await conhecimentoService.excluirDocumento(id);
      toast.success("Documento excluido");
      const proximaPagina = docs.length === 1 && pagina > 1 ? pagina - 1 : pagina;
      setPagina(proximaPagina);
      carregar(proximaPagina, buscaAplicada);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / DOCUMENTOS_POR_PAGINA));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base truncate">{base.nome}</CardTitle>
        <div>
          <input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={onArquivo} />
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={enviando}>
            {enviando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />} Enviar documentos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar documento por nome…" className="pl-9" />
        </div>

        {carregando ? (
          <div className="py-8 text-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Carregando…</div>
        ) : docs.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            {buscaAplicada ? "Nenhum documento encontrado para essa busca." : "Nenhum documento. Envie PDF, DOCX, TXT ou imagem (OCR)."}
          </p>
        ) : (
          <ul className="divide-y">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{d.nome_arquivo}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.paginas ? `${d.paginas} pag · ` : ""}{d.ocr_aplicado ? "OCR · " : ""}{d.erro ? d.erro : ""}
                  </p>
                </div>
                <StatusDoc status={d.status} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        "{d.nome_arquivo}" sera removido da base e do armazenamento. Esta acao nao pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => excluir(d.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}

        {!carregando && total > DOCUMENTOS_POR_PAGINA && (
          <UsersPagination
            currentPage={pagina}
            totalPages={totalPaginas}
            onPageChange={mudarPagina}
            totalItems={total}
            itemsPerPage={DOCUMENTOS_POR_PAGINA}
            itemLabel="documentos"
          />
        )}
      </CardContent>
    </Card>
  );
}

function StatusDoc({ status }: { status: DocumentoInfo["status"] }) {
  if (status === "concluido") return <Badge variant="secondary" className="gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Pronto</Badge>;
  if (status === "erro") return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Erro</Badge>;
  return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3 animate-pulse" /> Processando</Badge>;
}
