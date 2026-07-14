import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { kanbanCardBridgeService } from "@/features/kanban-shared/services/kanbanCardBridgeService";
import { useKanbanModule } from "@/features/kanban-shared/KanbanModuleContext";
import type { LegalKanbanBoardData } from "@/features/legal-kanban/types";

interface DuplicateKanbanCardDialogProps {
  cardId: string;
  board: LegalKanbanBoardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDuplicated?: () => void;
}

export function DuplicateKanbanCardDialog({
  cardId,
  board,
  open,
  onOpenChange,
  onDuplicated,
}: DuplicateKanbanCardDialogProps) {
  const { queryKeyPrefix } = useKanbanModule();
  const queryClient = useQueryClient();
  const [targetColumnId, setTargetColumnId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const columns = useMemo(
    () => board.columns.filter((column) => !column.isArchived),
    [board.columns],
  );

  async function handleDuplicate() {
    if (!targetColumnId) {
      toast.error("Selecione a raia de destino.");
      return;
    }

    setIsSubmitting(true);
    try {
      await kanbanCardBridgeService.duplicateCard({
        source_card_id: cardId,
        target_column_id: targetColumnId,
      });
      toast.success("Card duplicado. As cópias serão mantidas sincronizadas.");
      await queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
      onDuplicated?.();
      onOpenChange(false);
      setTargetColumnId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao duplicar card.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicar card</DialogTitle>
          <DialogDescription>
            Selecione a raia deste quadro onde a cópia será criada. Original e cópias ficam sincronizados: qualquer alteração em um deles atualiza os demais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>Raia destino</Label>
          <Select value={targetColumnId} onValueChange={setTargetColumnId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma raia" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((column) => (
                <SelectItem key={column.id} value={column.id}>
                  {column.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={() => void handleDuplicate()} disabled={isSubmitting || !targetColumnId}>
            Duplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
