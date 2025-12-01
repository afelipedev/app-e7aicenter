import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Coins } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatSidebar } from "@/components/assistants/ChatSidebar";
import { useChatHistory, Chat } from "@/hooks/useChatHistory";

const ASSISTANT_TYPE = "financial";

export default function Financial() {
  const {
    currentChat,
    currentChatId,
    createNewChat,
    addMessage,
    loadChat,
    setCurrentChatId,
  } = useChatHistory(ASSISTANT_TYPE);

  const [input, setInput] = useState("");

  useEffect(() => {
    if (!currentChatId) {
      const newChat = createNewChat();
      setCurrentChatId(newChat.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentChat && currentChat.messages.length === 0) {
      addMessage(currentChat.id, {
        role: "assistant",
        content: "Olá! Sou seu assistente financeiro especializado. Posso ajudá-lo com análises financeiras, fluxo de caixa, investimentos e planejamento financeiro.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat?.id]);

  const handleSend = () => {
    if (!input.trim() || !currentChat) return;

    addMessage(currentChat.id, { role: "user", content: input });
    setInput("");

    setTimeout(() => {
      addMessage(currentChat.id, {
        role: "assistant",
        content: "Análise financeira detalhada será fornecida aqui.",
      });
    }, 1000);
  };

  const handleNewChat = () => {
    const newChat = createNewChat();
    setCurrentChatId(newChat.id);
    setInput("");
  };

  const handleChatSelect = (chat: Chat) => {
    loadChat(chat.id);
    setInput("");
  };

  const messages = currentChat?.messages || [];

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      <ChatSidebar
        assistantType={ASSISTANT_TYPE}
        currentChatId={currentChatId}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-orange flex items-center justify-center">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Assistente Financeiro</h1>
                <p className="text-sm text-muted-foreground">
                  Especialista em Análises e Planejamento Financeiro
                </p>
              </div>
            </div>
          </div>

          <Card className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Faça sua pergunta sobre finanças..."
                  className="flex-1"
                />
                <Button onClick={handleSend} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
