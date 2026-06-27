import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { LLM_MODELS, type LLMProvider } from "@/config/llmModels";
import { listLlmSettings, upsertLlmSetting } from "../services/systemSettingsService";
import { PROVIDER_LABELS, type AIProvider, type SystemLlmSetting } from "../types";

const PROVIDERS: AIProvider[] = ["openai", "google", "anthropic"];

type Draft = {
  default_model: string;
  temperature: string;
  max_tokens: string;
  timeout_ms: string;
  context_window: string;
};

const emptyDraft = (): Draft => ({ default_model: "", temperature: "0.7", max_tokens: "2000", timeout_ms: "30000", context_window: "" });

export function LlmModelsTab() {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<AIProvider, Draft>>({ openai: emptyDraft(), google: emptyDraft(), anthropic: emptyDraft() });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const rows = await listLlmSettings();
      const map = { ...drafts };
      for (const r of rows as SystemLlmSetting[]) {
        map[r.provider] = {
          default_model: r.default_model ?? "",
          temperature: String(r.temperature ?? "0.7"),
          max_tokens: String(r.max_tokens ?? "2000"),
          timeout_ms: String(r.timeout_ms ?? "30000"),
          context_window: r.context_window != null ? String(r.context_window) : "",
        };
      }
      setDrafts(map);
    } catch (e) {
      toast({ title: "Erro ao carregar configurações", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const modelsFor = (provider: AIProvider) =>
    LLM_MODELS.filter((m) => m.provider === (provider as LLMProvider));

  const save = async (provider: AIProvider) => {
    const d = drafts[provider];
    setBusy(provider);
    try {
      await upsertLlmSetting({
        provider,
        default_model: d.default_model || null,
        temperature: d.temperature === "" ? null : Number(d.temperature),
        max_tokens: d.max_tokens === "" ? null : Number(d.max_tokens),
        timeout_ms: d.timeout_ms === "" ? null : Number(d.timeout_ms),
        context_window: d.context_window === "" ? null : Number(d.context_window),
      });
      toast({ title: "Configuração salva", description: PROVIDER_LABELS[provider] });
    } catch (e) {
      toast({ title: "Erro ao salvar", description: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const set = (provider: AIProvider, field: keyof Draft, value: string) =>
    setDrafts((prev) => ({ ...prev, [provider]: { ...prev[provider], [field]: value } }));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Parâmetros padrão por provedor. Os modelos disponíveis vêm da biblioteca central
        (<code>src/config/llmModels.ts</code>).
      </p>
      {PROVIDERS.map((provider) => {
        const d = drafts[provider];
        return (
          <Card key={provider}>
            <CardHeader className="pb-2"><CardTitle className="text-base">{PROVIDER_LABELS[provider]}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Modelo padrão</Label>
                  <Select value={d.default_model} onValueChange={(v) => set(provider, "default_model", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um modelo" /></SelectTrigger>
                    <SelectContent>
                      {modelsFor(provider).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Temperatura</Label>
                  <Input type="number" step="0.1" min="0" max="2" value={d.temperature} onChange={(e) => set(provider, "temperature", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Max tokens</Label>
                  <Input type="number" min="1" value={d.max_tokens} onChange={(e) => set(provider, "max_tokens", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Timeout (ms)</Label>
                  <Input type="number" min="1000" value={d.timeout_ms} onChange={(e) => set(provider, "timeout_ms", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Janela de contexto (opcional)</Label>
                  <Input type="number" min="0" value={d.context_window} onChange={(e) => set(provider, "context_window", e.target.value)} />
                </div>
              </div>
              <Button onClick={() => save(provider)} disabled={busy === provider}>
                {busy === provider ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
