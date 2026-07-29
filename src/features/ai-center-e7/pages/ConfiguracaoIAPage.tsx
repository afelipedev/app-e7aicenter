import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { configIAService, type ConfigIA } from "../services/configIAService";

export default function ConfiguracaoIAPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [configs, setConfigs] = useState<ConfigIA[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!hasPermission("admin")) { navigate("/ai-center-e7"); return; }
    configIAService.listar()
      .then(setConfigs)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setCarregando(false));
  }, [hasPermission, navigate]);

  if (carregando) return <div className="py-20 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Carregando…</div>;

  return (
    <div className="w-full space-y-5">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ai-center-e7")}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Cog className="w-6 h-6 text-primary" /> Configuracao dos agentes de IA</h1>
          <p className="text-muted-foreground text-sm mt-1">Personalize os prompts do "Construir com IA" e do gerador de prompts.</p>
        </div>
      </header>

      {configs.map((c) => <EditorPrompt key={c.chave} config={c} />)}
    </div>
  );
}

function EditorPrompt({ config }: { config: ConfigIA }) {
  const [conteudo, setConteudo] = useState(config.conteudo);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      await configIAService.salvar(config.chave, conteudo);
      toast.success("Prompt salvo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base font-mono">{config.chave}</CardTitle>
          {config.descricao && <p className="text-xs text-muted-foreground mt-0.5">{config.descricao}</p>}
        </div>
        <Button size="sm" onClick={salvar} disabled={salvando || conteudo === config.conteudo}>
          {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Salvar
        </Button>
      </CardHeader>
      <CardContent>
        <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={16} className="font-mono text-xs" />
      </CardContent>
    </Card>
  );
}
