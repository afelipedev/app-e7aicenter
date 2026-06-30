import { useEffect, useRef, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

interface ProcessingProgressRowProps {
  /** Rótulo da linha (ex.: "Empresa - 05/2023 — arquivo 1 de 3") */
  filename: string;
  /** Progresso REAL vindo do backend (marcos do n8n: 10/70/92/100) */
  progress: number;
  /** Status do processamento */
  status: string;
  /** Ação de cancelar (opcional) */
  onCancel?: () => void;
  /** Desabilita o botão de cancelar */
  cancelDisabled?: boolean;
}

/**
 * Linha de progresso com "trickle": entre os marcos reais do n8n, a barra avança
 * suavemente sozinha (desacelerando perto de um teto), e SNAPA para o valor real
 * assim que um novo marco chega. Resolve a sensação de "travado" durante a etapa de
 * IA (que fica longos segundos sem reportar progresso), inclusive para 1 arquivo.
 *
 * O valor real continua sendo a fonte de verdade — o trickle nunca ultrapassa um teto
 * abaixo do próximo marco e nunca chega a 100 antes da conclusão real.
 */
export function ProcessingProgressRow({
  filename,
  progress,
  status,
  onCancel,
  cancelDisabled,
}: ProcessingProgressRowProps) {
  const [display, setDisplay] = useState<number>(progress || 0);
  const displayRef = useRef(display);
  displayRef.current = display;

  // Snap imediato: conclui em 100; ou sobe quando o progresso real avança.
  useEffect(() => {
    if (status === 'completed') {
      setDisplay(100);
      return;
    }
    if ((progress || 0) > displayRef.current) {
      setDisplay(progress || 0);
    }
  }, [progress, status]);

  // Trickle: avança suavemente entre os marcos enquanto processa.
  useEffect(() => {
    if (status === 'completed' || status === 'error') return;
    const id = setInterval(() => {
      setDisplay(prev => {
        const real = progress || 0;
        if (prev < real) return real; // real avançou → snap
        const ceiling = Math.min(real + 20, 95); // teto antes do próximo marco
        if (prev >= ceiling) return prev;
        const next = prev + Math.max(0.4, (ceiling - prev) * 0.06); // desacelera perto do teto
        return Math.min(next, ceiling);
      });
    }, 400);
    return () => clearInterval(id);
  }, [progress, status]);

  const pct = Math.round(display);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm gap-2">
        <span className="flex-1 truncate">{filename}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {status !== 'completed' && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          )}
          <span className="tabular-nums">{pct}%</span>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={cancelDisabled}
              className="h-6 w-6 p-0 text-red-500"
              title="Cancelar processamento"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <Progress value={pct} />
    </div>
  );
}
