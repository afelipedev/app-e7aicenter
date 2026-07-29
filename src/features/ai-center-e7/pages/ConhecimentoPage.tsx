import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Boxes, Plus, Loader2, Upload, FileText, Trash2, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { conhecimentoService, type DocumentoInfo } from "../services/conhecimentoService";
import type { BaseConhecimento } from "../types";

const TIPOS: Array<{ v: BaseConhecimento["tipo"]; label: string }> = [
  { v: "geral", label: "Geral" }, { v: "juridica", label: "Juridica" },
  { v: "tributaria", label: "Tributaria" }, { v: "financeira", label: "Financeira" },
  { v: "contabil", label: "Contabil" },
];

export default function ConhecimentoPage() {
  const navigate = useNavigate();
  const [bases, setBases] = useState<BaseConhecimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionada, setSelecionada] = useState<BaseConhecimento | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregarBases(); }, []);

  async function carregarBases() {
    setCarregando(true);
    try {
      const b = await conhecimentoService.listarBases();
      setBases(b);
      if (b.length && !selecionada) setSelecionada(b[0]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar bases");
    } finally {
      setCarregando(false);
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
        <NovaBaseDialog onCriada={carregarBases} />
      </header>

      {carregando ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2 lg:col-span-1">
            {bases.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma base ainda.</p>}
            {bases.map((b) => (
              <button key={b.id} onClick={() => setSelecionada(b)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${selecionada?.id === b.id ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{b.nome}</span>
                  <Badge variant="secondary" className="text-xs shrink-0">{b.tipo}</Badge>
                </div>
                {b.descricao && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{b.descricao}</p>}
              </button>
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

function NovaBaseDialog({ onCriada }: { onCriada: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<BaseConhecimento["tipo"]>("geral");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) { toast.error("Informe um nome"); return; }
    setSalvando(true);
    try {
      await conhecimentoService.criarBase({ nome, descricao, tipo });
      toast.success("Base criada");
      setAberto(false); setNome(""); setDescricao(""); setTipo("geral");
      onCriada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar base");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Nova base</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova base de conhecimento</DialogTitle></DialogHeader>
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
          <Button onClick={salvar} disabled={salvando}>{salvando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PainelDocumentos({ base }: { base: BaseConhecimento }) {
  const [docs, setDocs] = useState<DocumentoInfo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    setCarregando(true);
    try { setDocs(await conhecimentoService.listarDocumentos(base.id)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao carregar documentos"); }
    finally { setCarregando(false); }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, [base.id]);

  // Polling leve enquanto houver documento processando.
  useEffect(() => {
    if (!docs.some((d) => d.status === "pendente" || d.status === "processando")) return;
    const t = setInterval(carregar, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [docs]);

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
    carregar();
    setEnviando(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function excluir(id: string) {
    try { await conhecimentoService.excluirDocumento(id); setDocs((d) => d.filter((x) => x.id !== id)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao excluir"); }
  }

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
      <CardContent>
        {carregando ? (
          <div className="py-8 text-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Carregando…</div>
        ) : docs.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">Nenhum documento. Envie PDF, DOCX, TXT ou imagem (OCR).</p>
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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => excluir(d.id)}><Trash2 className="w-4 h-4" /></Button>
              </li>
            ))}
          </ul>
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
