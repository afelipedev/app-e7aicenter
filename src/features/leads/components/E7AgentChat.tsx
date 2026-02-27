import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { ChatMessage } from "@/components/assistants/ChatMessage";
import { N8NAgentService } from "@/services/n8nAgentService";
import { toast } from "sonner";
import { Send, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

/**
 * Chat simples embutido no módulo de Leads.
 * O envio será conectado ao webhook do n8n no todo "n8n-chat-send".
 */
export default function E7AgentChat() {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>([]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const userMsg: LocalMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      // agentId dedicado: será adicionado em src/config/aiAgents.ts no todo de integração n8n
      const response = await N8NAgentService.callAgent("agente-e7-leads", text);
      const assistantMsg: LocalMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.output,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao chamar Agente E7");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Desculpe, ocorreu um erro ao processar sua solicitação. Verifique o webhook do n8n e tente novamente.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold">Agente E7</h2>
          <Bot className="w-5 h-5 text-blue-600" />
          <Badge variant="outline" className="text-amber-600 border-amber-500">
            Em Manutenção
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Use o chat para gerar prompts, mensagens e variações para WhatsApp/Email.
        </p>
      </div>

      <div className="border rounded-md">
        <ScrollArea className="h-64">
          <div className="p-2 space-y-1">
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                // ChatMessage espera o tipo do hook, mas só usa role/content no render.
                // Mantemos compatível com a forma mais simples.
                message={{ id: m.id, role: m.role, content: m.content } as any}
              />
            ))}
            {messages.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">
                Comece descrevendo o objetivo da mensagem (ex.: “criar template de cobrança educada com {"{nome_lead}"}”).
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escreva sua solicitação para o Agente E7..."
          className="min-h-[44px]"
        />
        <Button onClick={handleSend} disabled={isSending || !input.trim()} className="shrink-0">
          <Send className="w-4 h-4 mr-2" />
          {isSending ? "Enviando..." : "Enviar"}
        </Button>
      </div>
    </div>
  );
}

