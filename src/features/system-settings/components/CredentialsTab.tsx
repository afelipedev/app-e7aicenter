import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, ShieldAlert, KeyRound, Trash2 } from "lucide-react";
import {
  listCredentials,
  setCredential,
  validateCredential,
  deleteCredential,
} from "../services/systemSettingsService";
import { PROVIDER_LABELS, type AIProvider, type SystemAICredential, type CredentialStatus } from "../types";

const STATUS_META: Record<CredentialStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  empty: { label: "Não configurada", variant: "outline" },
  configured: { label: "Configurada", variant: "secondary" },
  valid: { label: "Válida", variant: "default" },
  invalid: { label: "Inválida", variant: "destructive" },
};

export function CredentialsTab() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<SystemAICredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      setCredentials(await listCredentials());
    } catch (e) {
      toast({ title: "Erro ao carregar credenciais", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (provider: AIProvider) => {
    const key = (drafts[provider] ?? "").trim();
    if (key.length < 8) {
      toast({ title: "Chave inválida", description: "Informe uma chave válida.", variant: "destructive" });
      return;
    }
    setBusy(`save-${provider}`);
    try {
      await setCredential(provider, key);
      setDrafts((d) => ({ ...d, [provider]: "" }));
      toast({ title: "Credencial salva", description: `${PROVIDER_LABELS[provider]} atualizada com segurança.` });
      await load();
    } catch (e) {
      toast({ title: "Erro ao salvar", description: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleValidate = async (provider: AIProvider) => {
    setBusy(`val-${provider}`);
    try {
      const { status } = await validateCredential(provider);
      toast({
        title: status === "valid" ? "Chave válida" : "Chave inválida",
        description: PROVIDER_LABELS[provider],
        variant: status === "valid" ? "default" : "destructive",
      });
      await load();
    } catch (e) {
      toast({ title: "Erro na validação", description: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (provider: AIProvider) => {
    setBusy(`del-${provider}`);
    try {
      await deleteCredential(provider);
      toast({ title: "Credencial removida", description: PROVIDER_LABELS[provider] });
      await load();
    } catch (e) {
      toast({ title: "Erro ao remover", description: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        As chaves são armazenadas de forma criptografada (Supabase Vault) e <strong>nunca</strong> são
        exibidas ao navegador — apenas os últimos dígitos. Use "Validar" para testar a conectividade.
      </p>
      {credentials.map((cred) => {
        const meta = STATUS_META[cred.status];
        return (
          <Card key={cred.provider}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> {PROVIDER_LABELS[cred.provider]}
              </CardTitle>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {cred.masked_hint ? `Chave atual: ${cred.masked_hint}` : "Nenhuma chave configurada."}
                {cred.last_validated_at && (
                  <span className="ml-2">• validada em {new Date(cred.last_validated_at).toLocaleString("pt-BR")}</span>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="password"
                  placeholder="Cole a nova chave para rotacionar…"
                  value={drafts[cred.provider] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [cred.provider]: e.target.value }))}
                  autoComplete="off"
                />
                <Button onClick={() => handleSave(cred.provider)} disabled={busy === `save-${cred.provider}`}>
                  {busy === `save-${cred.provider}` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleValidate(cred.provider)} disabled={busy === `val-${cred.provider}` || cred.status === "empty"}>
                  {busy === `val-${cred.provider}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldCheck className="h-4 w-4 mr-1" /> Validar</>}
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(cred.provider)} disabled={busy === `del-${cred.provider}` || cred.status === "empty"}>
                  {busy === `del-${cred.provider}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-1" /> Remover</>}
                </Button>
                {cred.status === "invalid" && <span className="flex items-center text-xs text-destructive"><ShieldAlert className="h-3 w-3 mr-1" /> Reveja a chave</span>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
