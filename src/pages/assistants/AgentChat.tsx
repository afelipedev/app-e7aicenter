import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, ArrowLeft, Sparkles, Paperclip, X, Menu } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChatMessage } from "@/components/assistants/ChatMessage";
import { ChatSidebar } from "@/components/assistants/ChatSidebar";
import { N8NAgentService } from "@/services/n8nAgentService";
import { getAgentById, getThemeInfo } from "@/config/aiAgents";
import { useChatHistory, Chat } from "@/hooks/useChatHistory";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function AgentChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const agent = agentId ? getAgentById(agentId) : undefined;
  const theme = agent ? getThemeInfo(agent.theme) : undefined;
  const ThemeIcon = theme?.icon;

  // Usar o agentId como assistant_type para histórico de conversas
  const {
    currentChat,
    currentChatId,
    createNewChat,
    addMessage,
    loadChat,
    setCurrentChatId,
    loading: chatsLoading,
  } = useChatHistory(agentId || "");

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!agentId || !agent) {
      toast.error("Agente não encontrado");
      navigate("/assistants/library");
      return;
    }
  }, [agentId, agent, navigate]);

  // Carregar mensagens do chat atual
  const messages = currentChat?.messages || [];

  // Scroll automático para o final quando novas mensagens chegarem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isSending]);

  // Ajustar altura do textarea automaticamente
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleFileSelect = async (file: File) => {
    try {
      // Validar tamanho do arquivo (máximo 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          `Arquivo muito grande. Tamanho máximo: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
        );
        return;
      }

      setAttachedFile(file);

      // Converter arquivo para base64 (removendo prefixo data:)
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Remover o prefixo "data:application/...;base64," do base64
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        setFileContent(base64);
        toast.success(`Arquivo "${file.name}" anexado`);
      };
      reader.onerror = () => {
        toast.error("Erro ao ler arquivo");
        setAttachedFile(null);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo");
      setAttachedFile(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Resetar input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setFileContent("");
    toast.info("Arquivo removido");
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || !agent || !currentChat || isSending) return;

    // Preparar mensagem do usuário (apenas texto, sem incluir arquivo)
    const userMessage = input.trim() || `Arquivo anexado: ${attachedFile?.name}`;
    const displayMessage = input.trim() || `Arquivo anexado: ${attachedFile?.name}`;
    
    // Preparar objeto arquivo se houver arquivo anexado
    let arquivoPayload: { nome: string; tipo: string; base64: string } | undefined;
    if (attachedFile && fileContent) {
      // Garantir que o base64 não tenha prefixo (já removido no handleFileSelect)
      let base64Clean = fileContent;
      // Se ainda tiver prefixo, remover (fallback de segurança)
      if (base64Clean.includes(',')) {
        base64Clean = base64Clean.split(',')[1];
      }
      
      arquivoPayload = {
        nome: attachedFile.name,
        tipo: attachedFile.type,
        base64: base64Clean,
      };
    }
    
    setInput("");
    setAttachedFile(null);
    setFileContent("");
    setIsSending(true);

    try {
      // Salvar mensagem do usuário no banco de dados
      await addMessage(currentChat.id, {
        role: "user",
        content: displayMessage,
      });

      // Chamar o agente n8n com arquivo e sessionId para memória da conversa
      const response = await N8NAgentService.callAgent(
        agent.id,
        userMessage,
        arquivoPayload,
        String(currentChat.id)
      );

      // Salvar resposta do assistente no banco de dados
      await addMessage(currentChat.id, {
        role: "assistant",
        content: response.output,
      });

      // Recarregar o chat para obter as mensagens atualizadas
      await loadChat(currentChat.id);
    } catch (error) {
      console.error("Erro ao chamar agente:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao processar sua solicitação. Por favor, tente novamente.";

      toast.error(errorMessage);

      // Adicionar mensagem de erro
      try {
        await addMessage(currentChat.id, {
          role: "assistant",
          content: `Desculpe, ocorreu um erro: ${errorMessage}`,
        });
        await loadChat(currentChat.id);
      } catch (err) {
        console.error("Erro ao adicionar mensagem de erro:", err);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const newChat = await createNewChat();
      setCurrentChatId(newChat.id);
      setInput("");
      setAttachedFile(null);
      setFileContent("");
      if (isMobile) {
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error("Erro ao criar novo chat:", error);
      toast.error("Erro ao criar novo chat");
    }
  };

  const handleChatSelect = async (chat: Chat) => {
    try {
      await loadChat(chat.id);
      setInput("");
      setAttachedFile(null);
      setFileContent("");
      if (isMobile) {
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error("Erro ao carregar chat:", error);
      toast.error("Erro ao carregar chat");
    }
  };

  const handleBackClick = () => {
    if (agent) {
      navigate(`/assistants/library/${agent.theme}`);
    } else {
      navigate("/assistants/library");
    }
  };

  if (!agent || !theme) {
    return null;
  }

  const sidebarContent = (
    <ChatSidebar
      assistantType={agentId || ""}
      currentChatId={currentChatId}
      onChatSelect={handleChatSelect}
      onNewChat={handleNewChat}
    />
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full max-w-full overflow-hidden">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="hidden md:block shrink-0">
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

      <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0 max-w-full">
        {/* Header */}
        <div
          className={cn(
            "border-b border-border bg-background shrink-0",
            isMobile ? "p-3" : "p-4 sm:p-6 pb-4"
          )}
        >
          <div className={cn(
            "flex items-center gap-2 mb-3 sm:mb-4",
            isMobile ? "flex-wrap" : "flex-nowrap"
          )}>
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
            <Button
              variant="ghost"
              onClick={handleBackClick}
              className={cn(
                "gap-2 shrink-0",
                isMobile && "h-9 text-sm px-2"
              )}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Voltar</span>
            </Button>
          </div>

          <div className={cn(
            "flex items-start gap-2 sm:gap-3 min-w-0"
          )}>
            <div
              className={cn(
                "rounded-lg bg-gradient-purple flex items-center justify-center shrink-0",
                isMobile ? "w-9 h-9" : "w-10 h-10 sm:w-12 sm:h-12"
              )}
            >
              <ThemeIcon
                className={cn(
                  "text-white shrink-0",
                  isMobile ? "w-5 h-5" : "w-6 h-6"
                )}
              />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <h1
                className={cn(
                  "font-bold text-foreground leading-tight break-words",
                  isMobile ? "text-base sm:text-lg" : "text-lg sm:text-xl"
                )}
              >
                {agent.name}
              </h1>
              <p
                className={cn(
                  "text-muted-foreground mt-0.5 break-words line-clamp-2",
                  isMobile ? "text-xs" : "text-sm"
                )}
              >
                {agent.description}
              </p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <Card
          className={cn(
            "flex-1 flex flex-col min-h-0 overflow-hidden",
            isMobile ? "mx-3 mb-3 mt-2" : "mx-4 sm:mx-6 mb-4 sm:mb-6 mt-2 sm:mt-4"
          )}
        >
          <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
            <div
              className={cn(
                "space-y-3 sm:space-y-4",
                isMobile ? "p-3" : "p-4 sm:p-6"
              )}
            >
              {!currentChat && !chatsLoading && (
                <div className="text-center text-muted-foreground py-8">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className={isMobile ? "text-sm" : ""}>
                    Selecione uma conversa existente ou crie uma nova para começar.
                  </p>
                </div>
              )}
              {currentChat && messages.length === 0 && !chatsLoading && (
                <div className="text-center text-muted-foreground py-8">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className={isMobile ? "text-sm" : ""}>
                    Comece uma conversa com o agente. Digite sua solicitação e
                    clique em "Enviar".
                  </p>
                </div>
              )}
              {messages.map((message, index) => {
                // Usar ID da mensagem se disponível, senão usar uma key única
                const messageKey = message.id || `${message.role}-${index}-${message.content.slice(0, 30)}-${message.createdAt || index}`;
                return (
                  <ChatMessage
                    key={messageKey}
                    message={{
                      id: message.id || `msg-${index}`,
                      role: message.role,
                      content: message.content,
                      createdAt: message.createdAt 
                        ? new Date(message.createdAt).toISOString()
                        : new Date().toISOString(),
                    }}
                  />
                );
              })}
              {isSending && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className={isMobile ? "text-sm" : ""}>
                    Processando...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div
            className={cn(
              "border-t border-border flex-shrink-0 overflow-hidden",
              isMobile ? "p-2" : "p-3 sm:p-4"
            )}
          >
            {/* Arquivo anexado */}
            {attachedFile && (
              <div className={cn(
                "mb-2 flex items-center gap-2 rounded-md bg-muted min-w-0",
                isMobile ? "p-1.5 text-xs" : "p-2 text-sm"
              )}>
                <Paperclip className={cn(
                  "text-muted-foreground shrink-0",
                  isMobile ? "h-3.5 w-3.5" : "h-4 w-4"
                )} />
                <span className="flex-1 truncate text-foreground min-w-0">
                  {attachedFile.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className={cn(
                    "shrink-0",
                    isMobile ? "h-6 w-6" : "h-7 w-7"
                  )}
                  disabled={isSending}
                >
                  <X className={cn(
                    isMobile ? "h-3 w-3" : "h-3.5 w-3.5"
                  )} />
                </Button>
              </div>
            )}

            <div className={cn(
              "flex gap-2 min-w-0",
              isMobile && "gap-1.5"
            )}>
              <div className="relative flex-1 min-w-0 overflow-hidden">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!isSending && (input.trim() || attachedFile) && currentChat) {
                        handleSend();
                      }
                    }
                  }}
                  placeholder={isMobile 
                    ? "Digite... (Shift+Enter para nova linha)"
                    : "Digite sua solicitação... (Shift+Enter para nova linha)"
                  }
                  className={cn(
                    "min-h-[60px] max-h-[200px] resize-none w-full",
                    isMobile 
                      ? "text-sm px-3 py-2" 
                      : "px-3 py-2"
                  )}
                  disabled={isSending || !currentChat}
                  rows={1}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileInputChange}
                  accept=".pdf,.txt,.doc,.docx,.json,.csv"
                  disabled={isSending || !currentChat}
                />
              </div>
              <div className={cn(
                "flex flex-col gap-1.5 sm:gap-2 shrink-0"
              )}>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending || !currentChat}
                  className={cn(
                    "shrink-0",
                    isMobile ? "h-9 w-9" : "h-10 w-10"
                  )}
                  title="Anexar arquivo"
                >
                  <Paperclip className={cn(
                    isMobile ? "h-4 w-4" : "h-4 w-4"
                  )} />
                </Button>
                <Button
                  onClick={handleSend}
                  size="icon"
                  disabled={isSending || (!input.trim() && !attachedFile) || !currentChat}
                  className={cn(
                    "shrink-0",
                    isMobile ? "h-9 w-9" : "h-10 w-10"
                  )}
                  title="Enviar"
                >
                  {isSending ? (
                    <Loader2 className={cn(
                      "animate-spin",
                      isMobile ? "h-4 w-4" : "h-4 w-4"
                    )} />
                  ) : (
                    <Send className={cn(
                      isMobile ? "h-4 w-4" : "h-4 w-4"
                    )} />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
