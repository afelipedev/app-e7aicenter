import { useMemo, useState } from "react";
import { ArchiveRestore, Layers, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useDeleteLegalKanbanCard,
  useUnarchiveLegalKanbanCard,
  useUnarchiveLegalKanbanColumn,
} from "../hooks/useLegalKanbanBoard";
import type { LegalKanbanBoardData, LegalKanbanCard } from "../types";
import { normalizeText } from "../utils";
import { LegalKanbanCardPreview } from "./LegalKanbanCardPreview";

type ArchivedCardItem = { card: LegalKanbanCard; columnTitle: string };

interface LegalKanbanArchivedItemsDialogProps {
  board: LegalKanbanBoardData | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManageArchive: boolean;
  onOpenCard: (cardId: string) => void;
}

export function LegalKanbanArchivedItemsDialog({
  board,
  open,
  onOpenChange,
  canManageArchive,
  onOpenCard,
}: LegalKanbanArchivedItemsDialogProps) {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LegalKanbanCard | null>(null);

  const unarchiveCard = useUnarchiveLegalKanbanCard();
  const unarchiveColumn = useUnarchiveLegalKanbanColumn();
  const deleteCard = useDeleteLegalKanbanCard();

  const busy = unarchiveCard.isPending || unarchiveColumn.isPending || deleteCard.isPending;

  // Cards arquivados individualmente: status "arquivado" em raias NÃO arquivadas.
  const archivedCards = useMemo<ArchivedCardItem[]>(() => {
    if (!board) return [];
    return board.columns
      .filter((column) => !column.isArchived)
      .flatMap((column) =>
        column.cards
          .filter((card) => card.status === "arquivado")
          .map((card) => ({ card, columnTitle: column.title })),
      );
  }, [board]);

  // Raias arquivadas (com todos os seus cards).
  const archivedColumns = useMemo(() => {
    if (!board) return [];
    return board.columns.filter((column) => column.isArchived);
  }, [board]);

  const normalizedSearch = normalizeText(search);

  const filteredCards = useMemo(() => {
    if (!normalizedSearch) return archivedCards;
    return archivedCards.filter(
      ({ card }) =>
        normalizeText(card.title).includes(normalizedSearch) ||
        String(card.cardNumber).includes(normalizedSearch),
    );
  }, [archivedCards, normalizedSearch]);

  const filteredColumns = useMemo(() => {
    if (!normalizedSearch) return archivedColumns;
    return archivedColumns.filter((column) => normalizeText(column.title).includes(normalizedSearch));
  }, [archivedColumns, normalizedSearch]);

  async function handleUnarchiveCard(cardId: string) {
    try {
      await unarchiveCard.mutateAsync(cardId);
      toast.success("Card desarquivado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao desarquivar o card.");
    }
  }

  async function handleUnarchiveColumn(columnId: string) {
    try {
      await unarchiveColumn.mutateAsync(columnId);
      toast.success("Raia desarquivada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao desarquivar a raia.");
    }
  }

  async function handleDeleteCard() {
    if (!deleteTarget) return;
    try {
      await deleteCard.mutateAsync(deleteTarget.id);
      toast.success("Card excluído.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir o card.");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Itens Arquivados</DialogTitle>
            <DialogDescription>
              Cards e raias arquivados deste quadro. Desarquive para retornar à exibição ou exclua definitivamente.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título ou número..."
              className="pl-9"
            />
          </div>

          <Tabs defaultValue="cards" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cards">Cards ({filteredCards.length})</TabsTrigger>
              <TabsTrigger value="columns">Raias ({filteredColumns.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="cards">
              <ScrollArea className="h-[52vh] pr-3">
                {filteredCards.length === 0 ? (
                  <EmptyState label="Nenhum card arquivado." />
                ) : (
                  <div className="space-y-3">
                    {filteredCards.map(({ card, columnTitle }) => (
                      <div
                        key={card.id}
                        className="rounded-[20px] border border-border/70 bg-card p-3.5 dark:bg-background"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Raia de origem: {columnTitle}
                          </span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-full px-3"
                              disabled={busy || !canManageArchive}
                              onClick={() => handleUnarchiveCard(card.id)}
                            >
                              <ArchiveRestore className="mr-1.5 h-4 w-4" />
                              Desarquivar
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="Excluir card"
                              disabled={busy || !canManageArchive}
                              onClick={() => setDeleteTarget(card)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="block w-full text-left"
                          onClick={() => onOpenCard(card.id)}
                        >
                          <LegalKanbanCardPreview card={card} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="columns">
              <ScrollArea className="h-[52vh] pr-3">
                {filteredColumns.length === 0 ? (
                  <EmptyState label="Nenhuma raia arquivada." />
                ) : (
                  <div className="space-y-3">
                    {filteredColumns.map((column) => (
                      <div
                        key={column.id}
                        className="flex items-center justify-between gap-3 rounded-[20px] border border-border/70 bg-card p-4 dark:bg-background"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${column.color}22` }}
                          >
                            <Layers className="h-4 w-4" style={{ color: column.color }} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{column.title}</p>
                            <p className="text-xs text-muted-foreground">{column.cards.length} card(s) arquivado(s)</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 shrink-0 rounded-full px-3"
                          disabled={busy || !canManageArchive}
                          onClick={() => handleUnarchiveColumn(column.id)}
                        >
                          <ArchiveRestore className="mr-1.5 h-4 w-4" />
                          Desarquivar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(value) => !value && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir card?</AlertDialogTitle>
            <AlertDialogDescription>
              O card <strong>{deleteTarget?.title}</strong> será excluído permanentemente e não poderá ser recuperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCard.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteCard.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                handleDeleteCard();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{label}</div>
  );
}
