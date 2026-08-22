import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Zap, Brain } from "lucide-react";
import type { LLMModel } from "@/services/chatService";
import { LLM_MODELS, type LLMIcon } from "@/config/llmModels";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ModelInfo {
  name: LLMModel;
  displayName: string;
  description: string;
  icon: React.ReactNode;
  speed: "Rápido" | "Médio" | "Lento";
  cost: "Baixo" | "Médio" | "Alto";
}

// Mapeia o ícone lógico do catálogo para o componente visual.
const ICON_BY_KEY: Record<LLMIcon, React.ReactNode> = {
  sparkles: <Sparkles className="w-4 h-4" />,
  zap: <Zap className="w-4 h-4" />,
  brain: <Brain className="w-4 h-4" />,
};

// Derivado do catálogo único (src/config/llmModels.ts) — sem duplicação.
const MODEL_INFO: Record<LLMModel, ModelInfo> = Object.fromEntries(
  LLM_MODELS.map((m) => [
    m.id,
    {
      name: m.id as LLMModel,
      displayName: m.displayName,
      description: m.description,
      icon: ICON_BY_KEY[m.icon],
      speed: m.speed,
      cost: m.cost,
    },
  ])
) as Record<LLMModel, ModelInfo>;

// Modelos oferecidos para novos chats (legados ficam de fora da lista, mas
// continuam resolvíveis via MODEL_INFO para chats antigos que já os usam).
const SELECTABLE_MODELS: ModelInfo[] = LLM_MODELS.filter((m) => !m.legacy).map(
  (m) => MODEL_INFO[m.id as LLMModel]
);

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
          {SELECTABLE_MODELS.map((model) => (
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
