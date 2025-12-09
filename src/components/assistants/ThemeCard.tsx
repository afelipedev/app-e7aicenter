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
    <div className="relative pt-1 -mt-1 h-full flex flex-col">
      <Card
        className={cn(
          "cursor-pointer transition-all duration-200",
          "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20",
          "active:scale-[0.98]",
          "border-2 border-transparent",
          "h-full flex flex-col",
          isMobile ? "p-4" : "p-5 sm:p-6",
          className
        )}
        onClick={onClick}
      >
        <div className={cn(
          "flex flex-col items-start h-full",
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
          <div className="flex-1 w-full min-w-0 flex flex-col justify-between">
            <div>
              <h3 className={cn(
                "font-semibold text-foreground mb-1.5 leading-tight",
                isMobile ? "text-base" : "text-lg"
              )}>
                {theme.name}
              </h3>
            </div>
            <p className={cn(
              "text-muted-foreground mt-auto",
              isMobile ? "text-xs" : "text-sm"
            )}>
              {agentCount} {agentCount === 1 ? "agente disponível" : "agentes disponíveis"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
