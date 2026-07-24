import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useMoveLegalKanbanCard } from "@/features/legal-kanban/hooks/useLegalKanbanBoard";
import type { LegalKanbanBoardData, LegalKanbanColumn } from "@/features/legal-kanban/types";

interface MoveKanbanCardPopoverProps {
  cardId: string;
  board: LegalKanbanBoardData;
  currentColumn: LegalKanbanColumn | null;
}

export function MoveKanbanCardPopover({ cardId, board, currentColumn }: MoveKanbanCardPopoverProps) {
  const [open, setOpen] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState("");
  const moveCard = useMoveLegalKanbanCard();
  const { user: authUser } = useAuth();

  const canMoveToDone = ["administrator", "advogado_adm"].includes(authUser?.role || "");

  const columns = useMemo(
    () => board.columns.filter((column) => !column.isArchived),
    [board.columns],
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setTargetColumnId("");
    }
  }

  async function handleMove() {
    if (moveCard.isPending) return;
    if (!targetColumnId || !currentColumn || targetColumnId === currentColumn.id) return;

    const destination = board.columns.find((column) => column.id === targetColumnId);
    // Cards arquivados não aparecem na raia, logo não contam para a posição final.
    const visibleCardsCount =
      destination?.cards?.filter((card) => card.status !== "arquivado").length ?? 0;

    // Fecha imediatamente: o painel do card recarrega após o move e desmontaria este popover.
    handleOpenChange(false);

    try {
      await moveCard.mutateAsync({
        cardId,
        sourceColumnId: currentColumn.id,
        destinationColumnId: targetColumnId,
        destinationIndex: visibleCardsCount,
      });
      toast.success(`Card movido para ${destination?.title}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao mover o card.");
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={moveCard.isPending}
          className="flex min-w-0 items-center gap-1.5 rounded-md border border-border/80 bg-muted/60 px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide text-foreground transition-colors hover:bg-muted disabled:opacity-70"
          title="Mover card de raia"
          aria-label="Mover card de raia"
        >
          {moveCard.isPending ? (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
          ) : null}
          <span className="min-w-0 truncate">
            {moveCard.isPending ? "Movendo..." : currentColumn?.title || "Sem raia"}
          </span>
          {moveCard.isPending ? null : <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Mover Card</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md"
            onClick={() => handleOpenChange(false)}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label>Quadro</Label>
            <Select value={board.board.id} disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={board.board.id}>{board.board.title}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Para mover para outro quadro, use Compartilhar.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Raia destino</Label>
            <Select value={targetColumnId} onValueChange={setTargetColumnId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma raia" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => {
                  const isCurrent = column.id === currentColumn?.id;
                  const isBlockedByRole = column.kind === "done" && !canMoveToDone;

                  return (
                    <SelectItem
                      key={column.id}
                      value={column.id}
                      disabled={isCurrent || isBlockedByRole}
                    >
                      {column.title}
                      {isCurrent ? " (atual)" : ""}
                      {!isCurrent && isBlockedByRole ? " (sem permissão)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => void handleMove()}
            disabled={
              !targetColumnId || targetColumnId === currentColumn?.id || moveCard.isPending
            }
          >
            {moveCard.isPending ? "Movendo..." : "Mover"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
