import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Coins, Loader2, Menu } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChatSidebar } from "@/components/assistants/ChatSidebar";
import { ChatMessage } from "@/components/assistants/ChatMessage";
import { ModelSelector } from "@/components/assistants/ModelSelector";
import { useChatHistory, Chat } from "@/hooks/useChatHistory";
import { getAssistantTitle, getAssistantDescription } from "@/config/assistantPrompts";
import { handleSendMessage } from "@/utils/chatHelpers";
import type { LLMModel } from "@/services/chatService";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const ASSISTANT_TYPE = "financial";

export default function Financial() {
  const {
    currentChat,
    currentChatId,
    createNewChat,
    addMessage,
    loadChat,
    setCurrentChatId,
    loading: chatsLoading,
  } = useChatHistory(ASSISTANT_TYPE);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentModel, setCurrentModel] = useState<LLMModel>("gpt-4");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentChat?.llmModel) {
      setCurrentModel(currentChat.llmModel);
    }
  }, [currentChat?.llmModel]);

  const handleSend = async () => {
    if (!input.trim() || !currentChat || isSending) return;

    const userMessage = input.trim();
    setInput("");
    setIsSending(true);

    try {
      await handleSendMessage(
        currentChat.id,
        userMessage,
        ASSISTANT_TYPE,
        currentModel,
        addMessage,
        loadChat
      );
    } catch (error) {
      // Erro já tratado no helper
    } finally {
      setIsSending(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const newChat = await createNewChat(currentModel);
      setCurrentChatId(newChat.id);
      setInput("");
      
      // Adicionar mensagem de boas-vindas ao criar novo chat
      await addMessage(newChat.id, {
        role: "assistant",
        content: "Olá! Sou seu assistente financeiro especializado. Posso ajudá-lo com análises financeiras, fluxo de caixa, investimentos e planejamento financeiro.",
      });
    } catch (error) {
      toast.error("Erro ao criar novo chat");
    }
  };

  const handleChatSelect = async (chat: Chat) => {
    try {
      await loadChat(chat.id);
      setInput("");
      if (isMobile) {
        setSidebarOpen(false);
      }
    } catch (error) {
      toast.error("Erro ao carregar chat");
    }
  };

  const handleModelChange = async (model: LLMModel) => {
    setCurrentModel(model);
    if (currentChat) {
      try {
        await createNewChat(model);
      } catch (error) {
        toast.error("Erro ao alterar modelo");
      }
    }
  };

  const messages = currentChat?.messages || [];

  // Scroll automático para o final quando novas mensagens chegarem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isSending]);

  const sidebarContent = (
    <ChatSidebar
      assistantType={ASSISTANT_TYPE}
      currentChatId={currentChatId}
      onChatSelect={handleChatSelect}
      onNewChat={handleNewChat}
    />
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="hidden md:block">
          {sidebarContent}
        </div>
      )}

      {/* Mobile Sidebar Sheet */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            "border-b border-border bg-background",
            isMobile ? "p-3" : "p-6 pb-4"
          )}>
            <div className={cn(
              "flex items-center gap-3 mb-4",
              isMobile ? "flex-col items-start" : "justify-between"
            )}>
              <div className="flex items-center gap-3 flex-1 w-full">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(true)}
                    className="shrink-0"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                )}
                <div className={cn(
                  "rounded-lg bg-gradient-orange flex items-center justify-center shrink-0",
                  isMobile ? "w-8 h-8" : "w-10 h-10"
                )}>
                  <Coins className={cn(
                    "text-white",
                    isMobile ? "w-4 h-4" : "w-6 h-6"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className={cn(
                    "font-bold text-foreground truncate",
                    isMobile ? "text-lg" : "text-2xl"
                  )}>
                    {getAssistantTitle(ASSISTANT_TYPE)}
                  </h1>
                  <p className={cn(
                    "text-muted-foreground truncate",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {getAssistantDescription(ASSISTANT_TYPE)}
                  </p>
                </div>
              </div>
              <div className={cn(
                "shrink-0",
                isMobile ? "w-full mt-2" : "w-64"
              )}>
                <ModelSelector
                  currentModel={currentModel}
                  onModelChange={handleModelChange}
                  disabled={isSending}
                />
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <Card className={cn(
            "flex-1 flex flex-col min-h-0",
            isMobile ? "mx-3 mb-3 mt-3" : "mx-6 mb-6"
          )}>
            <ScrollArea className="flex-1 min-h-0">
              <div className={cn(
                "space-y-4",
                isMobile ? "p-4" : "p-6"
              )}>
                {!currentChat && !chatsLoading && (
                  <div className="text-center text-muted-foreground py-8">
                    <p className={isMobile ? "text-sm" : ""}>
                      Selecione uma conversa existente ou crie uma nova para começar.
                    </p>
                  </div>
                )}
                {currentChat && messages.length === 0 && !chatsLoading && (
                  <div className="text-center text-muted-foreground py-8">
                    <p className={isMobile ? "text-sm" : ""}>
                      Nenhuma mensagem ainda. Comece uma conversa!
                    </p>
                  </div>
                )}
                {messages.map((message, index) => {
                  const messageKey = message.id || `${message.role}-${index}-${message.content.slice(0, 30)}-${message.createdAt || index}`;
                  return (
                    <ChatMessage key={messageKey} message={message} />
                  );
                })}
                {isSending && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className={isMobile ? "text-sm" : ""}>Processando...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className={cn(
              "border-t border-border flex-shrink-0",
              isMobile ? "p-3" : "p-4"
            )}>
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !isSending && handleSend()}
                  placeholder="Faça sua pergunta sobre finanças..."
                  className="flex-1"
                  disabled={isSending || !currentChat}
                />
                <Button 
                  onClick={handleSend} 
                  size="icon" 
                  disabled={isSending || !currentChat}
                  className="shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
