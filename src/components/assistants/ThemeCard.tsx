import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ThemeInfo } from "@/config/aiAgents";
import { useIsMobile } from "@/hooks/use-mobile";

interface ThemeCardProps {
  theme: ThemeInfo;
  agentCount: number;
  onClick: () => void;
  className?: string;
}

export function ThemeCard({
  theme,
  agentCount,
  onClick,
  className,
}: ThemeCardProps) {
  const Icon = theme.icon;
  const isMobile = useIsMobile();

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 active:scale-[0.98]",
        isMobile ? "p-4" : "p-5 sm:p-6",
        className
      )}
      onClick={onClick}
    >
      <div className={cn(
        "flex flex-col items-start",
        isMobile ? "gap-3" : "gap-4"
      )}>
        <div className={cn(
          "rounded-lg bg-gradient-purple flex items-center justify-center shrink-0",
          isMobile ? "w-10 h-10" : "w-12 h-12"
        )}>
          <Icon className={cn(
            "text-white",
            isMobile ? "w-5 h-5" : "w-6 h-6"
          )} />
        </div>
        <div className="flex-1 w-full min-w-0">
          <h3 className={cn(
            "font-semibold text-foreground mb-1.5 leading-tight",
            isMobile ? "text-base" : "text-lg"
          )}>
            {theme.name}
          </h3>
          <p className={cn(
            "text-muted-foreground",
            isMobile ? "text-xs" : "text-sm"
          )}>
            {agentCount} {agentCount === 1 ? "agente disponível" : "agentes disponíveis"}
          </p>
        </div>
      </div>
    </Card>
  );
}
