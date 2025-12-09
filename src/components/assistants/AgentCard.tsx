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
    <Card
      className={cn(
        "hover:shadow-lg transition-all hover:-translate-y-1 active:scale-[0.98]",
        isMobile ? "p-4" : "p-5 sm:p-6",
        className
      )}
    >
      <div className={cn(
        "flex flex-col h-full",
        isMobile ? "gap-3" : "gap-4"
      )}>
        <div className="flex-1 min-h-0">
          <h3 className={cn(
            "font-semibold text-foreground mb-2 leading-tight",
            isMobile ? "text-base" : "text-lg"
          )}>
            {agent.name}
          </h3>
          <p className={cn(
            "text-muted-foreground line-clamp-3",
            isMobile ? "text-xs" : "text-sm"
          )}>
            {agent.description}
          </p>
        </div>
        <Button
          onClick={onClick}
          className={cn(
            "w-full gap-2",
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
  );
}
