import { useState } from "react";
import { cn } from "@/lib/utils";
import { Bot, User, Copy, Check } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/hooks/useChatHistory";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ChatMessageProps {
  message: ChatMessageType;
  metadata?: {
    model?: string;
    tokens_used?: number;
    finish_reason?: string;
    [key: string]: any;
  };
  className?: string;
}

// Função simples para formatar texto básico (suporte futuro para markdown)
function formatMessage(content: string): string {
  // Por enquanto, apenas preserva quebras de linha
  return content;
}

export function ChatMessage({ message, metadata, className }: ChatMessageProps) {
  const isMobile = useIsMobile();
  const isUser = message.role === "user";
  const formattedContent = formatMessage(message.content);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Texto copiado para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Erro ao copiar:", error);
      toast.error("Erro ao copiar texto");
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2 sm:gap-4 min-w-0 w-full",
        isMobile ? "p-2" : "p-4",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      {!isUser && (
        <div className={cn(
          "flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center",
          isMobile ? "w-6 h-6" : "w-8 h-8"
        )}>
          <Bot className={cn(
            "text-primary shrink-0",
            isMobile ? "w-3 h-3" : "w-4 h-4"
          )} />
        </div>
      )}
      
      <div
        className={cn(
          "rounded-lg relative group min-w-0 overflow-hidden",
          isMobile ? "max-w-[85%] p-3" : "max-w-[80%] p-4",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <div className={cn(
          "whitespace-pre-wrap break-words",
          isMobile ? "text-sm" : "text-base"
        )}
        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        >
          {formattedContent.split('\n').map((line, index) => (
            <span key={index}>
              {line}
              {index < formattedContent.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>
        
        {!isUser && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity",
              isMobile ? "h-6 w-6" : "h-7 w-7",
              copied && "opacity-100"
            )}
            onClick={handleCopy}
            title="Copiar mensagem"
          >
            {copied ? (
              <Check className={cn("text-green-600", isMobile ? "h-3 w-3" : "h-4 w-4")} />
            ) : (
              <Copy className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
            )}
          </Button>
        )}
        
        {metadata && !isUser && (
          <div className={cn(
            "mt-2 pt-2 border-t border-border/50 text-muted-foreground flex items-center gap-2 flex-wrap",
            isMobile ? "text-[10px]" : "text-xs"
          )}>
            {metadata.model && (
              <span>Modelo: {metadata.model}</span>
            )}
            {metadata.tokens_used && (
              <span>Tokens: {metadata.tokens_used}</span>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className={cn(
          "flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center",
          isMobile ? "w-6 h-6" : "w-8 h-8"
        )}>
          <User className={cn(
            "text-primary shrink-0",
            isMobile ? "w-3 h-3" : "w-4 h-4"
          )} />
        </div>
      )}
    </div>
  );
}
