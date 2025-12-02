import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Brain } from "lucide-react";
import type { LLMModel } from "@/services/chatService";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ModelInfo {
  name: string;
  displayName: string;
  description: string;
  icon: React.ReactNode;
  speed: "Rápido" | "Médio" | "Lento";
  cost: "Baixo" | "Médio" | "Alto";
}

const MODEL_INFO: Record<LLMModel, ModelInfo> = {
  "gpt-4": {
    name: "gpt-4",
    displayName: "GPT-4",
    description: "Modelo padrão da OpenAI, balanceado",
    icon: <Sparkles className="w-4 h-4" />,
    speed: "Médio",
    cost: "Alto",
  },
  "gpt-4-turbo": {
    name: "gpt-4-turbo",
    displayName: "GPT-4 Turbo",
    description: "Versão mais rápida do GPT-4",
    icon: <Zap className="w-4 h-4" />,
    speed: "Rápido",
    cost: "Médio",
  },
  "gemini-2.5-flash": {
    name: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    description: "Modelo rápido e eficiente do Google",
    icon: <Brain className="w-4 h-4" />,
    speed: "Rápido",
    cost: "Baixo",
  },
  "claude-sonnet-4.5": {
    name: "claude-sonnet-4.5",
    displayName: "Claude Sonnet 4.5",
    description: "Modelo avançado da Anthropic",
    icon: <Brain className="w-4 h-4" />,
    speed: "Médio",
    cost: "Médio",
  },
};

interface ModelSelectorProps {
  currentModel: LLMModel;
  onModelChange: (model: LLMModel) => void;
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({
  currentModel,
  onModelChange,
  disabled = false,
  className,
}: ModelSelectorProps) {
  const isMobile = useIsMobile();
  const currentModelInfo = MODEL_INFO[currentModel];

  return (
    <div className={className}>
      <Select
        value={currentModel}
        onValueChange={(value) => onModelChange(value as LLMModel)}
        disabled={disabled}
      >
        <SelectTrigger className={cn("w-full", isMobile && "h-9 text-sm")}>
          <div className="flex items-center gap-2">
            {currentModelInfo.icon}
            <SelectValue>
              <div className={cn(
                "flex items-center gap-2",
                isMobile && "gap-1"
              )}>
                <span className={cn(isMobile && "text-xs")}>
                  {currentModelInfo.displayName}
                </span>
                <Badge variant="outline" className={cn(
                  "text-xs",
                  isMobile && "text-[10px] px-1 py-0"
                )}>
                  {currentModelInfo.speed}
                </Badge>
              </div>
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.values(MODEL_INFO).map((model) => (
            <SelectItem key={model.name} value={model.name}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {model.icon}
                  <span className="font-medium">{model.displayName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{model.description}</span>
                  <Badge variant="outline" className="text-xs">
                    {model.speed}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {model.cost}
                  </Badge>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
