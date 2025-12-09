import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIAgent } from "@/config/aiAgents";
import { useIsMobile } from "@/hooks/use-mobile";

interface AgentCardProps {
  agent: AIAgent;
  onClick: () => void;
  className?: string;
}

export function AgentCard({ agent, onClick, className }: AgentCardProps) {
  const isMobile = useIsMobile();

  return (
    <div className="relative pt-1 -mt-1 h-full flex flex-col">
      <Card
        className={cn(
          "transition-all duration-200",
          "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20",
          "active:scale-[0.98]",
          "border-2 border-transparent",
          "h-full flex flex-col",
          isMobile ? "p-4" : "p-5 sm:p-6",
          className
        )}
      >
        <div className={cn(
          "flex flex-col h-full",
          isMobile ? "gap-3" : "gap-4"
        )}>
          <div className="flex-1 min-h-0 flex flex-col">
            <h3 className={cn(
              "font-semibold text-foreground mb-2 leading-tight",
              isMobile ? "text-base" : "text-lg"
            )}>
              {agent.name}
            </h3>
            <p className={cn(
              "text-muted-foreground line-clamp-3 flex-1",
              isMobile ? "text-xs" : "text-sm"
            )}>
              {agent.description}
            </p>
          </div>
          <Button
            onClick={onClick}
            className={cn(
              "w-full gap-2 shrink-0",
              isMobile && "h-9 text-sm"
            )}
            variant="default"
          >
            Usar Agente
            <ArrowRight className={cn(
              isMobile ? "w-3.5 h-3.5" : "w-4 h-4"
            )} />
          </Button>
        </div>
      </Card>
    </div>
  );
}
