import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tags, Plus, Save, Trash2, ArrowLeft } from "lucide-react";
import {
  useDeleteMessageTemplate,
  useMessageTemplates,
  useTemplateCategories,
  useTemplatePlaceholders,
  useUpsertMessageTemplate,
  useUpsertTemplateCategory,
} from "../hooks/useLeadTemplates";
import TipTapEditor, { defaultTipTapDoc, type TipTapJSON } from "../components/TipTapEditor";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function LeadTemplatesPage() {
  const navigate = useNavigate();
  const { data: categories = [], isLoading: loadingCategories } = useTemplateCategories();
  const { data: placeholders = [] } = useTemplatePlaceholders();
  const { mutateAsync: upsertCategory, isPending: savingCategory } = useUpsertTemplateCategory();
  const { mutateAsync: upsertTemplate, isPending: savingTemplate } = useUpsertMessageTemplate();
  const { mutateAsync: deleteTemplate, isPending: deletingTemplate } = useDeleteMessageTemplate();

  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [search, setSearch] = useState("");

  const { data: templates = [], isLoading: loadingTemplates } = useMessageTemplates({
    categoryId,
  });

  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string | undefined>(undefined);
  const [contentJson, setContentJson] = useState<TipTapJSON>(defaultTipTapDoc());
  const [contentText, setContentText] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);

  const categoryOptions = useMemo(() => {
    return categories.map((c) => ({ id: c.id, name: c.name, isSystem: c.is_system }));
  }, [categories]);

  const filteredTemplates = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return templates;
    return templates.filter((t) => t.title.toLowerCase().includes(s));
  }, [templates, search]);

  useEffect(() => {
    // se o template ativo não existe mais no filtro, mantém o editor; não auto-limpa.
  }, [filteredTemplates]);

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      await upsertCategory({ name, is_system: false });
      setNewCategoryName("");
      toast.success("Categoria criada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar categoria");
    }
  };

  const loadTemplateIntoEditor = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setActiveTemplateId(t.id);
    setTitle(t.title);
    setEditCategoryId(t.category_id ?? undefined);
    setContentJson((t.content_json as TipTapJSON) || defaultTipTapDoc());
    setContentText(t.content_text || "");
  };

  const newTemplate = () => {
    setActiveTemplateId(undefined);
    setTitle("");
    setEditCategoryId(undefined);
    setContentJson(defaultTipTapDoc());
    setContentText("");
    toast.info("Novo template");
  };

  const insertPlaceholder = (key: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(`{${key}}`).run();
  };

  const handleSave = async () => {
    const t = title.trim();
    if (!t) return;
    try {
      const saved = await upsertTemplate({
        id: activeTemplateId,
        title: t,
        category_id: editCategoryId ?? null,
        content_json: contentJson,
        content_text: contentText || null,
        is_active: true,
      });
      setActiveTemplateId(saved.id);
      toast.success("Template salvo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar template");
    }
  };

  const handleDelete = async () => {
    if (!activeTemplateId) return;
    try {
      await deleteTemplate(activeTemplateId);
      toast.success("Template excluído");
      newTemplate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir template");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Templates de Mensagens</h1>
          <p className="text-sm text-muted-foreground">
            Crie e edite templates em massa por categoria, com placeholders como {`{nome_lead}`} e {`{cnpj_lead}`}.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/leads")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Leads
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 space-y-4 lg:col-span-1">
          <div className="space-y-2">
            <p className="text-sm font-medium">Categoria (filtro)</p>
            <Select
              value={categoryId ?? "__all__"}
              onValueChange={(v) => setCategoryId(v === "__all__" ? undefined : v)}
              disabled={loadingCategories}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.isSystem ? "•" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Buscar</p>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título..." />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Templates</p>
              <Button variant="outline" size="sm" onClick={newTemplate}>
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {loadingTemplates ? "Carregando..." : `${filteredTemplates.length} template(s)`}
            </div>
            <div className="border rounded-md overflow-hidden">
              <ScrollArea className="h-[360px]">
                <div className="divide-y">
                  {filteredTemplates.map((t) => (
                    <button
                      key={t.id}
                      className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                      onClick={() => loadTemplateIntoEditor(t.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{t.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {t.message_template_categories?.name || "Sem categoria"}
                          </div>
                        </div>
                        {activeTemplateId === t.id && <Badge>Em edição</Badge>}
                      </div>
                    </button>
                  ))}
                  {!loadingTemplates && filteredTemplates.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">Nenhum template encontrado.</div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">Criar categoria</p>
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex.: Pós-venda"
              />
              <Button
                onClick={handleCreateCategory}
                disabled={savingCategory || !newCategoryName.trim()}
              >
                Criar
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-4 lg:col-span-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 space-y-2 flex-1">
              <div className="space-y-2">
                <p className="text-sm font-medium">Título</p>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Cobrança educada" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Categoria</p>
                <Select
                  value={editCategoryId ?? "__none__"}
                  onValueChange={(v) => setEditCategoryId(v === "__none__" ? undefined : v)}
                  disabled={loadingCategories}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem categoria</SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Tags className="w-4 h-4 mr-2" />
                    Inserir Tag
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80">
                  <DropdownMenuLabel>Placeholders</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {placeholders.slice(0, 30).map((p) => (
                    <DropdownMenuItem key={p.id} onClick={() => insertPlaceholder(p.key)}>
                      {`{${p.key}}`} — {p.label}
                    </DropdownMenuItem>
                  ))}
                  {placeholders.length === 0 && (
                    <DropdownMenuItem disabled>Nenhum placeholder disponível</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={handleSave} disabled={savingTemplate || !title.trim()}>
                <Save className="w-4 h-4 mr-2" />
                {savingTemplate ? "Salvando..." : "Salvar"}
              </Button>

              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deletingTemplate || !activeTemplateId}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>

          <TipTapEditor
            value={contentJson}
            onChange={(json, text) => {
              setContentJson(json);
              setContentText(text);
            }}
            onEditorReady={(ed) => setEditor(ed)}
          />
        </Card>
      </div>
    </div>
  );
}

