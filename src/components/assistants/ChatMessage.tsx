import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/hooks/useChatHistory";
import { useIsMobile } from "@/hooks/use-mobile";

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

  return (
    <div
      className={cn(
        "flex gap-2 sm:gap-4",
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
            "text-primary",
            isMobile ? "w-3 h-3" : "w-4 h-4"
          )} />
        </div>
      )}
      
      <div
        className={cn(
          "rounded-lg",
          isMobile ? "max-w-[85%] p-3" : "max-w-[80%] p-4",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <div className={cn(
          "whitespace-pre-wrap break-words",
          isMobile ? "text-sm" : ""
        )}>
          {formattedContent.split('\n').map((line, index) => (
            <span key={index}>
              {line}
              {index < formattedContent.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>
        
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
            "text-primary",
            isMobile ? "w-3 h-3" : "w-4 h-4"
          )} />
        </div>
      )}
    </div>
  );
}
