import * as React from "react";
import { useMemo, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Archive, ArchiveX, ArrowUpRight, MoreVertical, Plus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { processRoutes } from "@/features/processes/constants";
import { kanbanBoardDetailPath } from "@/features/kanban-shared/kanbanModuleConfig";
import { useKanbanModule } from "@/features/kanban-shared/KanbanModuleContext";
import { LegalKanbanBoardSettingsSheet } from "../components/LegalKanbanBoardSettingsSheet";
import { LegalKanbanCardDetailsSheet } from "../components/LegalKanbanCardDetailsSheet";
import { LegalKanbanCardPreview as CardPreview } from "../components/LegalKanbanCardPreview";
import { LegalKanbanArchivedItemsDialog } from "../components/LegalKanbanArchivedItemsDialog";
import { LegalKanbanFiltersBar } from "../components/LegalKanbanFiltersBar";
import {
  useArchiveLegalKanbanColumn,
  useArchiveLegalKanbanColumnCards,
  useCreateLegalKanbanCard,
  useLegalKanbanBoard,
  useMoveLegalKanbanCard,
  useReorderLegalKanbanColumns,
} from "../hooks/useLegalKanbanBoard";
import { useLegalKanbanFilters } from "../hooks/useLegalKanbanFilters";
import type { LegalKanbanBoardData, LegalKanbanCard, LegalKanbanColumn, LegalKanbanColumnWithCards } from "../types";
import { reindexByHundreds } from "../utils";

type ActiveDragState =
  | { type: "column"; columnId: string }
  | { type: "card"; cardId: string; columnId: string }
  | null;

export default function LegalKanbanPage() {
  const navigate = useNavigate();
  const module = useKanbanModule();
  const { boardSlug = module.defaultBoardSlug } = useParams<{ boardSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const boardQuery = useLegalKanbanBoard(boardSlug);
  const createCard = useCreateLegalKanbanCard();
  const moveCard = useMoveLegalKanbanCard();
  const reorderColumns = useReorderLegalKanbanColumns();

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
  const [archivedItemsOpen, setArchivedItemsOpen] = useState(false);
  const [activeDrag, setActiveDrag] = useState<ActiveDragState>(null);
  const archiveColumn = useArchiveLegalKanbanColumn();
  const archiveColumnCards = useArchiveLegalKanbanColumnCards();

  const canManageBoard = ["administrator", "it", "advogado_adm"].includes(user?.role || "");
  const canFinalizeCards = ["administrator", "advogado_adm"].includes(user?.role || "");
  // Desarquivar card também é permitido ao perfil Advogado.
  const canUnarchiveCards = ["administrator", "advogado_adm", "advogado"].includes(user?.role || "");
  const { filters, setFilters, filteredColumns, filteredCardsCount, totalCardsCount, resetFilters } =
    useLegalKanbanFilters(boardQuery.data, user?.id || null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const boardData = boardQuery.data;
  const columnIds = useMemo(() => filteredColumns.map((column) => `column-${column.id}`), [filteredColumns]);

  async function handleCreateCard(columnId: string, title: string) {
    if (!boardData) return;
    try {
      await createCard.mutateAsync({
        boardId: boardData.board.id,
        columnId,
        title,
      });
      toast.success("Card criado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar o card.");
    }
  }

  async function handleArchiveColumn(columnId: string) {
    try {
      await archiveColumn.mutateAsync(columnId);
      toast.success("Raia arquivada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao arquivar a raia.");
      throw error;
    }
  }

  async function handleArchiveColumnCards(columnId: string) {
    try {
      const count = await archiveColumnCards.mutateAsync(columnId);
      toast.success(count > 0 ? `${count} card(s) arquivado(s).` : "Nenhum card para arquivar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao arquivar os cards da raia.");
      throw error;
    }
  }

  async function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);

    if (id.startsWith("column-")) {
      setActiveDrag({ type: "column", columnId: id.replace("column-", "") });
      return;
    }

    const activeCard = findCardByDndId(boardData, id);
    if (activeCard) {
      setActiveDrag({ type: "card", cardId: activeCard.card.id, columnId: activeCard.column.id });
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);

    if (!boardData || !event.over) return;

    const activeId = String(event.active.id);
    const overId = String(event.over.id);

    if (activeId.startsWith("column-") && overId.startsWith("column-") && activeId !== overId) {
      const sourceIndex = filteredColumns.findIndex((column) => `column-${column.id}` === activeId);
      const targetIndex = filteredColumns.findIndex((column) => `column-${column.id}` === overId);
      if (sourceIndex < 0 || targetIndex < 0) return;

      const nextColumns = [...filteredColumns];
      const [moved] = nextColumns.splice(sourceIndex, 1);
      nextColumns.splice(targetIndex, 0, moved);

      try {
        await reorderColumns.mutateAsync(
          reindexByHundreds(nextColumns).map((column) => ({
            ...column,
          })) as LegalKanbanColumn[],
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao reordenar as raias.");
      }
      return;
    }

    if (!activeId.startsWith("card-")) return;

    const activeCard = findCardByDndId(boardData, activeId);
    if (!activeCard) return;

    const overCard = findCardByDndId(boardData, overId);
    const overColumn = findColumnByDndId(boardData, overId);

    const destinationColumnId = overCard?.column.id || overColumn?.id;
    if (!destinationColumnId) return;

    if (destinationColumnId !== activeCard.column.id && !canFinalizeCards) {
      const destinationColumn = findColumnById(boardData.columns, destinationColumnId);
      if (destinationColumn?.kind === "done") {
        toast.error("Somente Administrador e Advogado Administrativo podem concluir cards.");
        return;
      }
    }

    const destinationIndex = overCard
      ? overCard.column.cards.findIndex((card) => card.id === overCard.card.id)
      : findColumnById(boardData.columns, destinationColumnId)?.cards.length || 0;

    try {
      await moveCard.mutateAsync({
        cardId: activeCard.card.id,
        sourceColumnId: activeCard.column.id,
        destinationColumnId,
        destinationIndex,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao mover o card.");
    }
  }

  const activeColumn = activeDrag?.type === "column" ? findColumnById(filteredColumns, activeDrag.columnId) : null;
  const activeCard =
    activeDrag?.type === "card" && boardData ? findCardById(boardData.columns, activeDrag.cardId)?.card || null : null;
  const cardFromUrl = searchParams.get("card");

  React.useEffect(() => {
    if (!boardData || !cardFromUrl) return;
    const exists = boardData.columns.some((column) => column.cards.some((card) => card.id === cardFromUrl));
    if (exists) {
      setSelectedCardId(cardFromUrl);
    }
  }, [boardData, cardFromUrl]);

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 pb-6">
      <section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {module.sectionLabel}
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[2rem]">
            {boardData?.board.title || "Quadro"}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Priorize o acompanhamento do board, filtros e movimentação das etapas com um layout mais limpo.
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap gap-2">
          {module.domain === "legal" ? (
            <Button className="rounded-full px-4" onClick={() => navigate(processRoutes.dashboard)}>
              Dashboard de processos
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          ) : null}
          <Button variant="outline" className="rounded-full px-4" onClick={() => navigate(module.basePath)}>
            Voltar para Quadros
          </Button>
          {boardData ? (
            <Button
              variant="outline"
              className="rounded-full px-4"
              onClick={() => setArchivedItemsOpen(true)}
            >
              <Archive className="mr-2 h-4 w-4" />
              Itens Arquivados
            </Button>
          ) : null}
          {boardData && canManageBoard ? (
            <LegalKanbanBoardSettingsSheet
              board={boardData}
              open={boardSettingsOpen}
              onOpenChange={setBoardSettingsOpen}
              onSaved={(nextSlug) => {
                if (nextSlug !== boardSlug) {
                  navigate(kanbanBoardDetailPath(module, nextSlug));
                }
              }}
            />
          ) : null}
        </div>
      </section>

      {boardData ? (
        <LegalKanbanFiltersBar
          members={boardData.members}
          labels={boardData.labels}
          filters={filters}
          filteredCardsCount={filteredCardsCount}
          totalCardsCount={totalCardsCount}
          onChange={setFilters}
          onReset={resetFilters}
        />
      ) : null}

      {boardQuery.isLoading ? (
        <KanbanSkeleton />
      ) : boardData ? (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div
              className="w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-[28px] border border-border/70 bg-card/80 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)] dark:bg-muted/20 dark:shadow-[0_24px_60px_-42px_rgba(0,0,0,0.65)] [-webkit-overflow-scrolling:touch]"
              role="region"
              aria-label="Raias do Quadro"
            >
              <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                <div className="flex w-max min-h-[calc(100vh-15rem)] gap-4 p-4 md:p-5">
                  {filteredColumns.map((column) => (
                    <KanbanColumnCard
                      key={column.id}
                      column={column}
                      canArchive={canFinalizeCards}
                      onArchive={handleArchiveColumn}
                      onArchiveCards={handleArchiveColumnCards}
                      onCreateCard={handleCreateCard}
                      onOpenCard={(cardId) => {
                        setSelectedCardId(cardId);
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev);
                          next.set("card", cardId);
                          return next;
                        }, { replace: true });
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>

            <DragOverlay>
              {activeColumn ? (
                <ColumnOverlay column={activeColumn} />
              ) : activeCard ? (
                <div className="w-[280px] rounded-[20px] border border-border/70 bg-card p-3.5 shadow-2xl dark:bg-background dark:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.75)] sm:w-[300px] xl:w-[320px]">
                  <CardPreview card={activeCard} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <LegalKanbanCardDetailsSheet
            key={selectedCardId ?? "empty-card"}
            cardId={selectedCardId}
            open={selectedCardId != null}
            board={boardData}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedCardId(null);
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete("card");
                  return next;
                }, { replace: true });
                return;
              }
              setSelectedCardId(selectedCardId);
            }}
          />

          <LegalKanbanArchivedItemsDialog
            board={boardData}
            open={archivedItemsOpen}
            onOpenChange={setArchivedItemsOpen}
            canManageArchive={canFinalizeCards}
            canUnarchiveCards={canUnarchiveCards}
            onOpenCard={(cardId) => {
              setArchivedItemsOpen(false);
              setSelectedCardId(cardId);
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("card", cardId);
                return next;
              }, { replace: true });
            }}
          />
        </>
      ) : (
        <Card className="rounded-[32px] border-border/70 bg-card/95 p-10 text-center text-muted-foreground">
          Não foi possível carregar o quadro selecionado.
        </Card>
      )}
    </div>
  );
}

function KanbanColumnCard({
  column,
  onCreateCard,
  onOpenCard,
  canArchive,
  onArchive,
  onArchiveCards,
}: {
  column: LegalKanbanColumnWithCards;
  onCreateCard: (columnId: string, title: string) => Promise<void>;
  onOpenCard: (cardId: string) => void;
  canArchive: boolean;
  onArchive: (columnId: string) => Promise<void>;
  onArchiveCards: (columnId: string) => Promise<void>;
}) {
  const [newCardTitle, setNewCardTitle] = useState("");
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveCardsConfirmOpen, setArchiveCardsConfirmOpen] = useState(false);
  const [archivingCards, setArchivingCards] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `column-${column.id}`,
    data: {
      type: "column",
      columnId: column.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex h-[calc(100vh-16.5rem)] w-[280px] shrink-0 flex-col rounded-[24px] border border-border/70 bg-gradient-to-b from-card to-muted/30 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] dark:from-card dark:to-muted/10 dark:shadow-[0_18px_40px_-34px_rgba(0,0,0,0.55)] sm:w-[300px] xl:w-[320px]",
        isDragging && "opacity-80",
      )}
    >
      <div
        className="border-b border-border/70 px-3.5 pb-3.5 pt-3.5"
        style={{
          background: `linear-gradient(135deg, ${column.color}18, transparent 62%)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            className="flex flex-1 items-start gap-3 text-left"
            {...attributes}
            {...listeners}
          >
            <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: column.color }} />
            <div>
              <p className="text-sm font-semibold text-foreground">{column.title}</p>
              <p className="text-xs text-muted-foreground">{column.cards.length} cards nesta etapa</p>
            </div>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs font-semibold text-muted-foreground dark:bg-muted/40">
              {column.cards.length}
            </span>
            {canArchive ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground"
                    title="Ações da raia"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    disabled={column.cards.length === 0}
                    onClick={() => setArchiveCardsConfirmOpen(true)}
                  >
                    <ArchiveX className="mr-2 h-4 w-4" />
                    Arquivar cards
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setArchiveConfirmOpen(true)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Arquivar raia
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar raia?</AlertDialogTitle>
              <AlertDialogDescription>
                A raia <strong>{column.title}</strong> e todos os {column.cards.length} card(s) nela serão
                arquivados e sairão do quadro. Você poderá restaurá-los em "Itens Arquivados".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={archiving}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={archiving}
                onClick={async (event) => {
                  event.preventDefault();
                  setArchiving(true);
                  try {
                    await onArchive(column.id);
                    setArchiveConfirmOpen(false);
                  } finally {
                    setArchiving(false);
                  }
                }}
              >
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={archiveCardsConfirmOpen} onOpenChange={setArchiveCardsConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar todos os cards da raia?</AlertDialogTitle>
              <AlertDialogDescription>
                Todos os {column.cards.length} card(s) da raia <strong>{column.title}</strong> serão
                arquivados e sairão do quadro. A raia permanece visível. Você poderá restaurá-los em
                "Itens Arquivados".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={archivingCards}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={archivingCards}
                onClick={async (event) => {
                  event.preventDefault();
                  setArchivingCards(true);
                  try {
                    await onArchiveCards(column.id);
                    setArchiveCardsConfirmOpen(false);
                  } finally {
                    setArchivingCards(false);
                  }
                }}
              >
                Arquivar cards
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="mt-3 flex gap-2">
          <Input
            value={newCardTitle}
            onChange={(event) => setNewCardTitle(event.target.value)}
            placeholder="Novo card"
            className="h-10 rounded-full border-border/70 bg-background/85 dark:bg-muted/30"
          />
          <Button
            size="icon"
            className="rounded-full"
            onClick={async () => {
              if (!newCardTitle.trim()) return;
              await onCreateCard(column.id, newCardTitle.trim());
              setNewCardTitle("");
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ColumnCardsList column={column} onOpenCard={onOpenCard} />
    </div>
  );
}

function ColumnCardsList({
  column,
  onOpenCard,
}: {
  column: LegalKanbanColumnWithCards;
  onOpenCard: (cardId: string) => void;
}) {
  const parentRef = React.useRef<HTMLDivElement | null>(null);
  const shouldVirtualize = column.cards.length > 24;

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? column.cards.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 172,
    overscan: 4,
    enabled: shouldVirtualize,
  });

  const items = shouldVirtualize
    ? virtualizer.getVirtualItems().map((virtualItem) => ({
        key: virtualItem.key,
        card: column.cards[virtualItem.index],
        start: virtualItem.start,
        size: virtualItem.size,
      }))
    : column.cards.map((card, index) => ({
        key: card.id,
        card,
        start: index * 172,
        size: 172,
      }));

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto px-2.5 pb-2.5 pt-2.5">
      <SortableContext items={column.cards.map((card) => `card-${card.id}`)} strategy={verticalListSortingStrategy}>
        <div
          className="relative space-y-3"
          style={
            shouldVirtualize
              ? {
                  height: `${virtualizer.getTotalSize()}px`,
                }
              : undefined
          }
        >
          {column.cards.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground dark:bg-muted/10">
              Solte cards aqui para continuar o fluxo.
            </div>
          ) : shouldVirtualize ? (
            items.map(({ key, card, start, size }) => (
              <div
                key={key}
                className="absolute left-0 top-0 w-full"
                style={{
                  transform: `translateY(${start}px)`,
                  height: `${size}px`,
                }}
              >
                <KanbanCardItem card={card} onOpenCard={onOpenCard} />
              </div>
            ))
          ) : (
            column.cards.map((card) => <KanbanCardItem key={card.id} card={card} onOpenCard={onOpenCard} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function KanbanCardItem({
  card,
  onOpenCard,
}: {
  card: LegalKanbanCard;
  onOpenCard: (cardId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card.id}`,
    data: {
      type: "card",
      cardId: card.id,
      columnId: card.columnId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      onClick={() => onOpenCard(card.id)}
      className={cn(
        "w-full rounded-[20px] border border-border/70 bg-card p-3.5 text-left shadow-[0_14px_36px_-32px_rgba(15,23,42,0.4)] transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-accent/30 dark:bg-background dark:shadow-[0_14px_36px_-32px_rgba(0,0,0,0.5)] dark:hover:bg-muted/40 dark:hover:border-primary/35",
        isDragging && "opacity-70",
      )}
      {...attributes}
      {...listeners}
    >
      <CardPreview card={card} />
    </button>
  );
}

function ColumnOverlay({ column }: { column: LegalKanbanColumnWithCards }) {
  return (
    <div className="w-[300px] rounded-[24px] border border-border/70 bg-card/95 p-4 shadow-2xl backdrop-blur dark:bg-background dark:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.75)]">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: column.color }} />
        <div>
          <p className="font-semibold">{column.title}</p>
          <p className="text-xs text-muted-foreground">{column.cards.length} cards</p>
        </div>
      </div>
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-20 rounded-[24px]" />
      <Skeleton className="h-32 rounded-[24px]" />
      <div className="grid gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[560px] rounded-[28px]" />
        ))}
      </div>
    </div>
  );
}

function findColumnById(columns: LegalKanbanColumnWithCards[], columnId: string) {
  return columns.find((column) => column.id === columnId) || null;
}

function findColumnByDndId(board: LegalKanbanBoardData | undefined, id: string) {
  if (!board || !id.startsWith("column-")) return null;
  return board.columns.find((column) => `column-${column.id}` === id) || null;
}

function findCardById(columns: LegalKanbanColumnWithCards[], cardId: string) {
  for (const column of columns) {
    const card = column.cards.find((item) => item.id === cardId);
    if (card) {
      return { card, column };
    }
  }
  return null;
}

function findCardByDndId(board: LegalKanbanBoardData | undefined, id: string) {
  if (!board || !id.startsWith("card-")) return null;
  return findCardById(board.columns, id.replace("card-", ""));
}
