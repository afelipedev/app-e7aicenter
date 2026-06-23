import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { legalKanbanService } from "@/features/legal-kanban/services/legalKanbanService";
import { kanbanCardBridgeService } from "@/features/kanban-shared/services/kanbanCardBridgeService";
import { useKanbanModule } from "@/features/kanban-shared/KanbanModuleContext";
import { KANBAN_MODULE_CONFIG } from "@/features/kanban-shared/kanbanModuleConfig";

interface ShareKanbanCardDialogProps {
  cardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShared?: () => void;
}

export function ShareKanbanCardDialog({
  cardId,
  open,
  onOpenChange,
  onShared,
}: ShareKanbanCardDialogProps) {
  const { shareTargetDomain, queryKeyPrefix } = useKanbanModule();
  const queryClient = useQueryClient();
  const [targetBoardId, setTargetBoardId] = useState("");
  const [targetColumnId, setTargetColumnId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetConfig = KANBAN_MODULE_CONFIG[shareTargetDomain];

  const boardsQuery = useQuery({
    queryKey: ["kanban-share-boards", shareTargetDomain],
    queryFn: () => legalKanbanService.listBoards(shareTargetDomain),
    enabled: open,
  });

  const boardDataQuery = useQuery({
    queryKey: ["kanban-share-board", targetBoardId],
    queryFn: () => {
      const board = boardsQuery.data?.find((item) => item.id === targetBoardId);
      return legalKanbanService.getBoardData(board?.slug || "", shareTargetDomain);
    },
    enabled: open && Boolean(targetBoardId),
  });

  const columns = useMemo(
    () => boardDataQuery.data?.columns.filter((column) => !column.isArchived) || [],
    [boardDataQuery.data],
  );

  async function handleShare() {
    if (!targetBoardId || !targetColumnId) {
      toast.error("Selecione o quadro e a raia de destino.");
      return;
    }

    setIsSubmitting(true);
    try {
      await kanbanCardBridgeService.shareCard({
        source_card_id: cardId,
        target_board_id: targetBoardId,
        target_column_id: targetColumnId,
      });
      toast.success(`Card compartilhado com ${targetConfig.pageTitle.toLowerCase()}.`);
      await queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
      onShared?.();
      onOpenChange(false);
      setTargetBoardId("");
      setTargetColumnId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao compartilhar card.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar com {targetConfig.sectionLabel}</DialogTitle>
          <DialogDescription>
            Selecione o quadro jurídico e a raia onde o card espelhado será criado. As alterações serão sincronizadas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Quadro destino</Label>
            <Select
              value={targetBoardId}
              onValueChange={(value) => {
                setTargetBoardId(value);
                setTargetColumnId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um quadro" />
              </SelectTrigger>
              <SelectContent>
                {(boardsQuery.data || []).map((board) => (
                  <SelectItem key={board.id} value={board.id}>
                    {board.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Raia destino</Label>
            <Select value={targetColumnId} onValueChange={setTargetColumnId} disabled={!targetBoardId}>
              <SelectTrigger>
                <SelectValue placeholder={targetBoardId ? "Selecione uma raia" : "Escolha o quadro primeiro"} />
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={() => void handleShare()} disabled={isSubmitting || !targetBoardId || !targetColumnId}>
            Compartilhar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
