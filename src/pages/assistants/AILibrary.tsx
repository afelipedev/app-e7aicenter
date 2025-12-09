import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeCard } from "@/components/assistants/ThemeCard";
import {
  AGENT_THEMES,
  getAgentCountByTheme,
  type AgentTheme,
} from "@/config/aiAgents";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function AILibrary() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleThemeClick = (themeId: AgentTheme) => {
    navigate(`/assistants/library/${themeId}`);
  };

  const themes = Object.values(AGENT_THEMES);

  return (
    <div className={cn(
      "flex flex-col h-full w-full",
      isMobile ? "p-3 sm:p-4" : "p-4 sm:p-6"
    )}>
      {/* Header */}
      <div className={cn(
        "mb-4 sm:mb-6",
        isMobile && "mb-3"
      )}>
        <div className={cn(
          "flex items-center gap-2 sm:gap-3",
          isMobile ? "mb-3" : "mb-4"
        )}>
          <div
            className={cn(
              "rounded-lg bg-gradient-purple flex items-center justify-center shrink-0",
              isMobile ? "w-9 h-9" : "w-10 h-10 sm:w-12 sm:h-12"
            )}
          >
            <Sparkles
              className={cn(
                "text-white",
                isMobile ? "w-5 h-5" : "w-6 h-6"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className={cn(
                "font-bold text-foreground leading-tight",
                isMobile ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
              )}
            >
              Biblioteca IA
            </h1>
            <p
              className={cn(
                "text-muted-foreground mt-1",
                isMobile ? "text-xs sm:text-sm" : "text-sm"
              )}
            >
              Explore agentes especializados organizados por temas
            </p>
          </div>
        </div>
      </div>

      {/* Themes Grid */}
      <div className="flex-1 overflow-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        <div
          className={cn(
            "grid gap-3 sm:gap-4",
            "pt-1",
            "items-stretch",
            isMobile
              ? "grid-cols-1"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
          )}
        >
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              agentCount={getAgentCountByTheme(theme.id)}
              onClick={() => handleThemeClick(theme.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
