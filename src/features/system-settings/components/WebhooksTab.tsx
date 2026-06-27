import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plug, Trash2, Plus, Pencil } from "lucide-react";
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
} from "../services/systemSettingsService";
import type { SystemWebhook } from "../types";

function slugify(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const EMPTY = { name: "", url: "", description: "" };

export function WebhooksTab() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<SystemWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<SystemWebhook | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);

  const load = async () => {
    try {
      setWebhooks(await listWebhooks());
    } catch (e) {
      toast({ title: "Erro ao carregar webhooks", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !/^https?:\/\//i.test(form.url)) {
      toast({ title: "Dados inválidos", description: "Informe nome e URL (http/https).", variant: "destructive" });
      return;
    }
    setBusy("create");
    try {
      await createWebhook({
        name: form.name.trim(),
        slug: slugify(form.name) || `webhook-${Date.now()}`,
        url: form.url.trim(),
        description: form.description.trim() || null,
        is_active: true,
      });
      setForm(EMPTY);
      toast({ title: "Webhook cadastrado" });
      await load();
    } catch (e) {
      toast({ title: "Erro ao cadastrar", description: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (w: SystemWebhook) => {
    try {
      await updateWebhook(w.id, { is_active: !w.is_active });
      await load();
    } catch (e) {
      toast({ title: "Erro ao atualizar", description: String(e), variant: "destructive" });
    }
  };

  const handleTest = async (w: SystemWebhook) => {
    setBusy(`test-${w.id}`);
    try {
      const res = await testWebhook(w.url, w.slug);
      toast({
        title: res.ok ? "Webhook acessível" : "Falha no teste",
        description: res.ok ? `O endpoint respondeu (HTTP ${res.status}).` : (res.error ?? "Não foi possível conectar."),
        variant: res.ok ? "default" : "destructive",
      });
    } catch (e) {
      toast({ title: "Erro no teste", description: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const openEdit = (w: SystemWebhook) => {
    setEditing(w);
    setEditForm({ name: w.name, url: w.url, description: w.description ?? "" });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editForm.name.trim() || !/^https?:\/\//i.test(editForm.url)) {
      toast({ title: "Dados inválidos", description: "Informe nome e URL (http/https).", variant: "destructive" });
      return;
    }
    setBusy("edit");
    try {
      await updateWebhook(editing.id, {
        name: editForm.name.trim(),
        url: editForm.url.trim(),
        description: editForm.description.trim() || null,
      });
      setEditing(null);
      toast({ title: "Webhook atualizado" });
      await load();
    } catch (e) {
      toast({ title: "Erro ao atualizar", description: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(`del-${id}`);
    try {
      await deleteWebhook(id);
      await load();
    } catch (e) {
      toast({ title: "Erro ao remover", description: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Novo webhook</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Disparo de leads" />
            </div>
            <div className="space-y-1">
              <Label>URL</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://n8n.exemplo.com/webhook/..." />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descrição (opcional)</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Button onClick={handleCreate} disabled={busy === "create"}>
            {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cadastrar"}
          </Button>
        </CardContent>
      </Card>

      {webhooks.length === 0 && <p className="text-sm text-muted-foreground">Nenhum webhook cadastrado.</p>}
      {webhooks.map((w) => (
        <Card key={w.id}>
          <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{w.name}</span>
                <Badge variant={w.is_active ? "default" : "outline"}>{w.is_active ? "Ativo" : "Inativo"}</Badge>
              </div>
              <p className="truncate text-sm text-muted-foreground">{w.url}</p>
              {w.description && <p className="text-xs text-muted-foreground">{w.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={w.is_active} onCheckedChange={() => toggleActive(w)} />
              <Button variant="outline" size="sm" onClick={() => handleTest(w)} disabled={busy === `test-${w.id}`}>
                {busy === `test-${w.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plug className="h-4 w-4 mr-1" /> Testar</>}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(w)} aria-label="Editar webhook">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(w.id)} disabled={busy === `del-${w.id}`} aria-label="Remover webhook">
                {busy === `del-${w.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar webhook</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>URL</Label>
              <Input value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={busy === "edit"}>
              {busy === "edit" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
