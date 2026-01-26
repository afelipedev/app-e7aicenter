import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Mail, Send, Copy, Save, Tags, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { LeadType } from "../types";
import TipTapEditor, { defaultTipTapDoc, type TipTapJSON } from "./TipTapEditor";
import type { Editor } from "@tiptap/react";
import {
  useMessageTemplates,
  useTemplateCategories,
  useTemplatePlaceholders,
  useUpsertMessageTemplate,
} from "../hooks/useLeadTemplates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { N8NLeadMessagingService } from "../services/n8nLeadMessagingService";

export default function LeadMessagePanel({ leadType }: { leadType: Exclude<LeadType, null> }) {
  const navigate = useNavigate();
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);

  const { data: categories = [] } = useTemplateCategories();
  const { data: placeholders = [] } = useTemplatePlaceholders();
  const { data: templates = [] } = useMessageTemplates({ categoryId });
  const { mutateAsync: upsertTemplate, isPending: savingTemplate } = useUpsertMessageTemplate();

  const [editorJson, setEditorJson] = useState<TipTapJSON>(defaultTipTapDoc());
  const [editorText, setEditorText] = useState<string>("");
  const [editor, setEditor] = useState<Editor | null>(null);

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveCategoryId, setSaveCategoryId] = useState<string | undefined>(undefined);

  const [isSending, setIsSending] = useState<null | "whatsapp" | "email">(null);

  const templateOptions = useMemo(() => templates, [templates]);

  const applyTemplate = (id: string | undefined) => {
    setTemplateId(id);
    if (!id) return;
    const t = templateOptions.find((x) => x.id === id);
    if (!t) return;
    setEditorJson((t.content_json as TipTapJSON) || defaultTipTapDoc());
    setEditorText(t.content_text || "");
    toast.success(`Template aplicado: ${t.title}`);
  };

  const insertPlaceholder = (key: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(`{${key}}`).run();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editorText || "");
      toast.success("Mensagem copiada");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleSaveAsTemplate = async () => {
    const title = saveTitle.trim();
    if (!title) return;
    try {
      await upsertTemplate({
        title,
        category_id: saveCategoryId ?? null,
        content_json: editorJson,
        content_text: editorText || null,
        is_active: true,
      });
      toast.success("Template salvo");
      setSaveOpen(false);
      setSaveTitle("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar template");
    }
  };

  const handleSend = async (channel: "whatsapp" | "email") => {
    const msg = editorText?.trim() || "";
    if (!msg) {
      toast.error("Escreva uma mensagem antes de enviar");
      return;
    }

    try {
      setIsSending(channel);
      await N8NLeadMessagingService.sendToAllActiveLeads({
        action: channel === "whatsapp" ? "send_whatsapp" : "send_email",
        leadType,
        messageJson: editorJson,
        messageText: msg,
      });
      toast.success(
        channel === "whatsapp"
          ? "Disparo WhatsApp solicitado no n8n"
          : "Disparo Email solicitado no n8n"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setIsSending(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Mensagens</h2>
        <p className="text-sm text-muted-foreground">
          Editor + templates + botões de disparo (WhatsApp/Email). Tipo atual:{" "}
          <span className="font-medium">{leadType}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Categoria</p>
          <Select
            value={categoryId ?? "__all__"}
            onValueChange={(v) => setCategoryId(v === "__all__" ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Template</p>
          <Select
            value={templateId ?? "__none__"}
            onValueChange={(v) => applyTemplate(v === "__none__" ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem template</SelectItem>
              {templateOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Tags className="w-4 h-4 mr-2" />
              Inserir Tag
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72">
            <DropdownMenuLabel>Placeholders</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {placeholders.slice(0, 24).map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => insertPlaceholder(p.key)}>
                {`{${p.key}}`} — {p.label}
              </DropdownMenuItem>
            ))}
            {placeholders.length === 0 && (
              <DropdownMenuItem disabled>Nenhum placeholder disponível</DropdownMenuItem>
            )}
            {placeholders.length > 24 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  Mostrando 24 de {placeholders.length}. Use a tela de Templates para ver todos.
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="w-4 h-4 mr-2" />
          Copiar
        </Button>

        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Salvar como template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar template</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Título</p>
                <Input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} placeholder="Ex.: Cobrança educada" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Categoria</p>
                <Select
                  value={saveCategoryId ?? "__none__"}
                  onValueChange={(v) => setSaveCategoryId(v === "__none__" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem categoria</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveAsTemplate}
                disabled={savingTemplate || !saveTitle.trim()}
              >
                {savingTemplate ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setTemplateId(undefined);
            setEditorJson(defaultTipTapDoc());
            setEditorText("");
            toast.info("Editor limpo");
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Limpar
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={() => navigate("/leads/templates")}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Gerenciar templates
        </Button>
      </div>

      <TipTapEditor
        value={editorJson}
        onChange={(json, text) => {
          setEditorJson(json);
          setEditorText(text);
        }}
        onEditorReady={(ed) => setEditor(ed)}
      />

      <Separator />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="default"
          onClick={() => handleSend("whatsapp")}
          disabled={isSending !== null}
          className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4 mr-2" />
          {isSending === "whatsapp" ? "Enviando..." : "Enviar WhatsApp"}
        </Button>
        <Button
          variant="default"
          onClick={() => handleSend("email")}
          disabled={isSending !== null}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail className="w-4 h-4 mr-2" />
          {isSending === "email" ? "Enviando..." : "Enviar Email"}
        </Button>
      </div>
    </div>
  );
}

