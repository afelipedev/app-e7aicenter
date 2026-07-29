import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bot, Loader2, Send, Paperclip, X, PanelLeft, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { LLM_MODELS } from "@/config/llmModels";
import { ChatMessage } from "@/components/assistants/ChatMessage";
import type { ChatMessage as ChatMessageType } from "@/hooks/useChatHistory";
import { agenteService } from "../services/agenteService";
import { ChatSidebarAgente } from "../components/ChatSidebarAgente";
import { PensandoIndicador } from "../components/PensandoIndicador";
import type { Agente, ConversaAgente, ProjetoAgente } from "../types";

interface MsgUI { id: string; role: "user" | "assistant"; content: string; metadata?: Record<string, unknown>; }
interface Anexo { nome: string; texto: string; }

export default function ChatAgentePage() {
  const { agenteId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [agente, setAgente] = useState<Agente | null>(null);
  const [projetos, setProjetos] = useState<ProjetoAgente[]>([]);
  const [conversas, setConversas] = useState<ConversaAgente[]>([]);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MsgUI[]>([]);
  const [entrada, setEntrada] = useState("");
  const [modelo, setModelo] = useState<string>("gpt-4o");
  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [anexando, setAnexando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sidebarMobile, setSidebarMobile] = useState(false);
  const [renomeando, setRenomeando] = useState<ConversaAgente | null>(null);
  const [projetoDialog, setProjetoDialog] = useState(false);
  const [renomeandoProjeto, setRenomeandoProjeto] = useState<ProjetoAgente | null>(null);
  const [excluindoProjeto, setExcluindoProjeto] = useState<ProjetoAgente | null>(null);

  const fimRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const conversaAtual = useMemo(() => conversas.find((c) => c.id === conversaId) ?? null, [conversas, conversaId]);

  useEffect(() => {
    if (!agenteId) return;
    Promise.all([agenteService.obter(agenteId), agenteService.projetos(), agenteService.conversas(agenteId)])
      .then(([a, projs, convs]) => {
        if (!a) { toast.error("Agente indisponível"); navigate("/ai-center-e7"); return; }
        setAgente(a); setModelo(a.modelo_llm); setProjetos(projs); setConversas(convs);
        iniciarNovaConversa(a);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agenteId]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens, enviando]);

  function iniciarNovaConversa(a: Agente | null = agente) {
    setConversaId(null);
    setAnexo(null);
    setMensagens([{ id: "welcome", role: "assistant", content: `Olá! Sou o agente **${a?.nome ?? ""}**. Como posso ajudar hoje?` }]);
    if (a) setModelo(a.modelo_llm);
    setSidebarMobile(false);
  }

  async function selecionarConversa(id: string) {
    setConversaId(id);
    setSidebarMobile(false);
    const conv = conversas.find((c) => c.id === id);
    if (conv?.modelo_llm) setModelo(conv.modelo_llm);
    try {
      const msgs = await agenteService.mensagens(id);
      setMensagens(msgs.map((m) => ({ id: m.id, role: m.papel === "assistente" ? "assistant" : "user", content: m.conteudo })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir conversa");
    }
  }

  async function anexarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!arquivo) return;
    if (arquivo.size > 15 * 1024 * 1024) { toast.error("Arquivo muito grande (máx. 15 MB)"); return; }
    setAnexando(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(arquivo);
      });
      const texto = await agenteService.extrairTexto(arquivo.name, arquivo.type, base64);
      if (!texto.trim()) { toast.error("Não foi possível extrair texto do arquivo."); return; }
      setAnexo({ nome: arquivo.name, texto });
      toast.success(`"${arquivo.name}" anexado.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao processar o arquivo");
    } finally {
      setAnexando(false);
    }
  }

  async function enviar() {
    const texto = entrada.trim();
    if ((!texto && !anexo) || !agenteId || enviando) return;
    setEntrada("");
    const anexoAtual = anexo;
    setAnexo(null);
    const conteudoExibe = anexoAtual ? `${texto}\n\n📎 ${anexoAtual.nome}` : texto;
    setMensagens((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: conteudoExibe }]);
    setEnviando(true);
    try {
      const r = await agenteService.executar(agenteId, texto || "Analise o documento anexado.", {
        conversaId: conversaId ?? undefined, arquivoTexto: anexoAtual?.texto, modelo,
      });
      setConversaId(r.conversaId);
      setMensagens((m) => [...m, {
        id: `a-${Date.now()}`, role: "assistant", content: r.output,
        metadata: { model: r.metadados.modelo, tokens_used: r.metadados.tokensEntrada + r.metadados.tokensSaida },
      }]);
      if (r.metadados?.finishReason === "length") {
        toast.warning("Resposta truncada pelo limite de tokens. Aumente o 'Máximo de tokens por resposta' na configuração do agente.");
      }
      // Atualiza a sidebar (titulo, data/hora da ultima resposta e ordenacao).
      setConversas(await agenteService.conversas(agenteId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao executar o agente");
      setMensagens((m) => [...m, { id: `e-${Date.now()}`, role: "assistant", content: "Não consegui processar sua mensagem. Tente novamente." }]);
    } finally {
      setEnviando(false);
    }
  }

  async function trocarModelo(novo: string) {
    setModelo(novo);
    if (conversaId) {
      try { await agenteService.atualizarConversa(conversaId, { modelo_llm: novo }); } catch { /* silencioso */ }
    }
  }

  // Ações da sidebar
  async function favoritar(c: ConversaAgente) {
    await agenteService.atualizarConversa(c.id, { favorito: !c.favorito });
    setConversas((cs) => cs.map((x) => (x.id === c.id ? { ...x, favorito: !x.favorito } : x)));
  }
  async function mover(c: ConversaAgente, projetoId: string | null) {
    await agenteService.atualizarConversa(c.id, { projeto_id: projetoId });
    setConversas((cs) => cs.map((x) => (x.id === c.id ? { ...x, projeto_id: projetoId } : x)));
  }
  async function excluir(c: ConversaAgente) {
    await agenteService.excluirConversa(c.id);
    setConversas((cs) => cs.filter((x) => x.id !== c.id));
    if (conversaId === c.id) iniciarNovaConversa();
  }
  async function confirmarCriarProjeto(nome: string) {
    if (!nome.trim()) { setProjetoDialog(false); return; }
    try {
      const p = await agenteService.criarProjeto(nome.trim());
      setProjetos((ps) => [p, ...ps]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar projeto");
    } finally {
      setProjetoDialog(false);
    }
  }
  async function confirmarRenomearProjeto(nome: string) {
    if (!renomeandoProjeto || !nome.trim()) { setRenomeandoProjeto(null); return; }
    await agenteService.renomearProjeto(renomeandoProjeto.id, nome.trim());
    setProjetos((ps) => ps.map((p) => (p.id === renomeandoProjeto.id ? { ...p, nome: nome.trim() } : p)));
    setRenomeandoProjeto(null);
  }
  async function confirmarExcluirProjeto() {
    const p = excluindoProjeto;
    if (!p) return;
    try {
      await agenteService.excluirProjeto(p.id);
      setProjetos((ps) => ps.filter((x) => x.id !== p.id));
      setConversas((cs) => cs.map((c) => (c.projeto_id === p.id ? { ...c, projeto_id: null } : c)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir projeto");
    } finally {
      setExcluindoProjeto(null);
    }
  }
  async function confirmarRenomear(novoTitulo: string) {
    if (!renomeando || !novoTitulo.trim()) { setRenomeando(null); return; }
    await agenteService.atualizarConversa(renomeando.id, { titulo: novoTitulo.trim() });
    setConversas((cs) => cs.map((x) => (x.id === renomeando.id ? { ...x, titulo: novoTitulo.trim() } : x)));
    setRenomeando(null);
  }

  const sidebar = (
    <ChatSidebarAgente
      conversas={conversas} projetos={projetos} currentId={conversaId}
      onNova={() => iniciarNovaConversa()} onSelecionar={selecionarConversa}
      onFavoritar={favoritar} onRenomear={setRenomeando} onExcluir={excluir}
      onMover={mover} onCriarProjeto={() => setProjetoDialog(true)}
      onRenomearProjeto={setRenomeandoProjeto} onExcluirProjeto={setExcluindoProjeto}
    />
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 md:-m-6">
      {/* Sidebar desktop */}
      {!isMobile && <aside className="w-72 border-r bg-muted/20 shrink-0">{sidebar}</aside>}
      {/* Sidebar mobile */}
      <Sheet open={sidebarMobile} onOpenChange={setSidebarMobile}>
        <SheetContent side="left" className="p-0 w-80">{sidebar}</SheetContent>
      </Sheet>

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-2 p-3 border-b shrink-0">
          {isMobile ? (
            <Button variant="ghost" size="icon" onClick={() => setSidebarMobile(true)}><PanelLeft className="w-4 h-4" /></Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => navigate("/ai-center-e7")}><ArrowLeft className="w-4 h-4" /></Button>
          )}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-primary" /></div>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold truncate leading-tight">{agente?.nome ?? "Agente"}</h1>
            <p className="text-xs text-muted-foreground truncate">{conversaAtual?.titulo ?? "Nova conversa"}</p>
          </div>
          <Select value={modelo} onValueChange={trocarModelo}>
            <SelectTrigger className="w-auto h-8 gap-1 text-xs"><Sparkles className="w-3.5 h-3.5" /><SelectValue /></SelectTrigger>
            <SelectContent align="end">
              {LLM_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.displayName}</SelectItem>)}
            </SelectContent>
          </Select>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="w-full py-4 px-3 md:px-6 lg:px-10 xl:px-16">
            {mensagens.map((m) => (
              <div key={m.id} className="animate-in fade-in slide-in-from-bottom-1 duration-200">
                <ChatMessage message={m as unknown as ChatMessageType} metadata={m.metadata} />
              </div>
            ))}
            {enviando && <PensandoIndicador nome={agente?.nome} />}
            <div ref={fimRef} />
          </div>
        </div>

        <div className="border-t p-3 shrink-0">
          <div className="w-full px-3 md:px-6 lg:px-10 xl:px-16 space-y-2">
            {anexo && (
              <div className="flex items-center gap-2 text-xs bg-muted rounded-lg px-3 py-2 w-fit max-w-full">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{anexo.nome}</span>
                <button onClick={() => setAnexo(null)} className="text-muted-foreground hover:text-foreground shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={anexarArquivo} />
              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" title="Anexar arquivo"
                onClick={() => fileRef.current?.click()} disabled={anexando || enviando}>
                {anexando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </Button>
              <Textarea
                value={entrada} onChange={(e) => setEntrada(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                placeholder="Escreva sua mensagem…  (Enter envia, Shift+Enter quebra linha)"
                rows={1} className="resize-none min-h-[44px] max-h-40"
              />
              <Button onClick={enviar} disabled={enviando || (!entrada.trim() && !anexo)} size="icon" className="h-11 w-11 shrink-0">
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <TextoDialog aberto={!!renomeando} titulo="Renomear conversa" rotulo="Título" valorInicial={renomeando?.titulo ?? ""}
        onFechar={() => setRenomeando(null)} onConfirmar={confirmarRenomear} />
      <TextoDialog aberto={projetoDialog} titulo="Novo projeto" rotulo="Nome do projeto" valorInicial="" confirmarLabel="Criar"
        onFechar={() => setProjetoDialog(false)} onConfirmar={confirmarCriarProjeto} />
      <TextoDialog aberto={!!renomeandoProjeto} titulo="Renomear projeto" rotulo="Nome do projeto" valorInicial={renomeandoProjeto?.nome ?? ""}
        onFechar={() => setRenomeandoProjeto(null)} onConfirmar={confirmarRenomearProjeto} />

      <AlertDialog open={!!excluindoProjeto} onOpenChange={(v) => !v && setExcluindoProjeto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto "{excluindoProjeto?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto será removido. As conversas dentro dele não são apagadas — voltam para "Recentes".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExcluirProjeto} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir projeto</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TextoDialog({ aberto, titulo, rotulo, valorInicial, confirmarLabel = "Salvar", onFechar, onConfirmar }:
  { aberto: boolean; titulo: string; rotulo: string; valorInicial: string; confirmarLabel?: string; onFechar: () => void; onConfirmar: (t: string) => void }) {
  const [valor, setValor] = useState(valorInicial);
  useEffect(() => { if (aberto) setValor(valorInicial); }, [aberto, valorInicial]);
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{titulo}</DialogTitle></DialogHeader>
        <div className="space-y-1.5">
          <Label>{rotulo}</Label>
          <Input value={valor} onChange={(e) => setValor(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onConfirmar(valor)} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={() => onConfirmar(valor)}>{confirmarLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
