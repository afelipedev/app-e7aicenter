import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  "gpt-5.2": {
    name: "gpt-5.2",
    displayName: "GPT-5.2",
    description: "Modelo avançado da OpenAI (sem temperatura na Edge Function)",
    icon: <Sparkles className="w-4 h-4" />,
    speed: "Médio",
    cost: "Alto",
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
              <span className={cn(isMobile && "text-xs")}>
                {currentModelInfo.displayName}
              </span>
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.values(MODEL_INFO).map((model) => (
            <SelectItem key={model.name} value={model.name}>
              <div className="flex items-center gap-2">
                {model.icon}
                <span className="font-medium">{model.displayName}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
