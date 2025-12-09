import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentCard } from "@/components/assistants/AgentCard";
import {
  getAgentsByTheme,
  getThemeInfo,
  type AgentTheme,
} from "@/config/aiAgents";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export default function AgentsByTheme() {
  const { themeId } = useParams<{ themeId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!themeId) {
      navigate("/assistants/library");
    }
  }, [themeId, navigate]);

  if (!themeId) {
    return null;
  }

  const theme = getThemeInfo(themeId as AgentTheme);
  const agents = getAgentsByTheme(themeId as AgentTheme);
  const ThemeIcon = theme.icon;

  const handleAgentClick = (agentId: string) => {
    navigate(`/assistants/library/agent/${agentId}`);
  };

  const handleBackClick = () => {
    navigate("/assistants/library");
  };

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
        <Button
          variant="ghost"
          onClick={handleBackClick}
          className={cn(
            "mb-3 sm:mb-4 gap-2",
            isMobile && "h-9 text-sm px-2"
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className={isMobile ? "hidden sm:inline" : ""}>
            {isMobile ? "Voltar" : "Voltar para Biblioteca"}
          </span>
        </Button>

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
            <ThemeIcon
              className={cn(
                "text-white",
                isMobile ? "w-5 h-5" : "w-6 h-6"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className={cn(
                "font-bold text-foreground leading-tight truncate",
                isMobile ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
              )}
            >
              {theme.name}
            </h1>
            <p
              className={cn(
                "text-muted-foreground mt-0.5",
                isMobile ? "text-xs sm:text-sm" : "text-sm"
              )}
            >
              {agents.length}{" "}
              {agents.length === 1 ? "agente disponível" : "agentes disponíveis"}
            </p>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="flex-1 overflow-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        {agents.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 sm:py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className={cn(
              isMobile ? "text-sm" : ""
            )}>
              Nenhum agente disponível para este tema.
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-3 sm:gap-4",
              isMobile
                ? "grid-cols-1"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}
          >
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onClick={() => handleAgentClick(agent.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
