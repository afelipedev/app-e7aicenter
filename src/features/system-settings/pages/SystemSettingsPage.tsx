import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Webhook, Bot, KeyRound } from "lucide-react";
import { WebhooksTab } from "../components/WebhooksTab";
import { LlmModelsTab } from "../components/LlmModelsTab";
import { CredentialsTab } from "../components/CredentialsTab";

export default function SystemSettingsPage() {
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-semibold">Configurações do Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Centraliza webhooks do n8n, biblioteca de modelos LLM e credenciais das APIs de IA.
          </p>
        </div>
      </div>

      <Tabs defaultValue="webhooks">
        <TabsList>
          <TabsTrigger value="webhooks" className="gap-1"><Webhook className="h-4 w-4" /> Webhooks</TabsTrigger>
          <TabsTrigger value="models" className="gap-1"><Bot className="h-4 w-4" /> Modelos LLM</TabsTrigger>
          <TabsTrigger value="credentials" className="gap-1"><KeyRound className="h-4 w-4" /> Credenciais de IA</TabsTrigger>
        </TabsList>
        <TabsContent value="webhooks" className="mt-4"><WebhooksTab /></TabsContent>
        <TabsContent value="models" className="mt-4"><LlmModelsTab /></TabsContent>
        <TabsContent value="credentials" className="mt-4"><CredentialsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
