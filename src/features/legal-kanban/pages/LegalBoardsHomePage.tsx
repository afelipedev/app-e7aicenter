import { Star, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { processRoutes } from "@/features/processes/constants";
import { LegalKanbanBoardSettingsSheet } from "../components/LegalKanbanBoardSettingsSheet";
import { useDeleteLegalKanbanBoard, useLegalKanbanBoards, useToggleLegalKanbanBoardFavorite } from "../hooks/useLegalKanbanBoard";
import { useState } from "react";

export default function LegalBoardsHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const boardsQuery = useLegalKanbanBoards();
  const toggleFavorite = useToggleLegalKanbanBoardFavorite();
  const deleteBoard = useDeleteLegalKanbanBoard();
  const [boardToDelete, setBoardToDelete] = useState<{ id: string; title: string } | null>(null);

  const boards = boardsQuery.data || [];
  const favoriteBoards = boards.filter((board) => board.isFavorite);
  const canCreateBoard = ["administrator", "it", "advogado_adm"].includes(user?.role || "");

  return (
    <div className="space-y-6 pb-8">
      <section className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Documentos e Processos</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">Quadros</h1>
          <p className="text-sm text-muted-foreground">
            Visualize seus quadros e acesse rapidamente seus favoritos.
          </p>
        </div>
        {canCreateBoard ? (
          <LegalKanbanBoardSettingsSheet
            triggerLabel="Novo Quadro"
            onSaved={(boardSlug) => navigate(processRoutes.boardDetail(boardSlug))}
          />
        ) : null}
      </section>

      <BoardsSection
        title="Meus Quadros"
        boards={boards}
        emptyMessage="Você ainda não possui quadros associados."
        onOpen={(slug) => navigate(processRoutes.boardDetail(slug))}
        onToggleFavorite={async (boardId, isFavorite) => {
          try {
            await toggleFavorite.mutateAsync({ boardId, isFavorite });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao atualizar favorito.");
          }
        }}
        canDeleteBoard={canCreateBoard}
        onDeleteRequest={(boardId, title) => setBoardToDelete({ id: boardId, title })}
      />

      <BoardsSection
        title="Quadros Favoritos"
        boards={favoriteBoards}
        emptyMessage="Nenhum quadro favoritado ainda."
        onOpen={(slug) => navigate(processRoutes.boardDetail(slug))}
        onToggleFavorite={async (boardId, isFavorite) => {
          try {
            await toggleFavorite.mutateAsync({ boardId, isFavorite });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao atualizar favorito.");
          }
        }}
        canDeleteBoard={canCreateBoard}
        onDeleteRequest={(boardId, title) => setBoardToDelete({ id: boardId, title })}
      />

      <AlertDialog open={boardToDelete != null} onOpenChange={(open) => !open && setBoardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir quadro?</AlertDialogTitle>
            <AlertDialogDescription>
              {boardToDelete
                ? `O quadro "${boardToDelete.title}" será excluído permanentemente, incluindo cards e configurações.`
                : "Confirme a exclusão do quadro."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!boardToDelete) return;
                try {
                  await deleteBoard.mutateAsync(boardToDelete.id);
                  toast.success("Quadro excluído com sucesso.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Erro ao excluir quadro.");
                } finally {
                  setBoardToDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BoardsSection({
  title,
  boards,
  emptyMessage,
  onOpen,
  onToggleFavorite,
  canDeleteBoard,
  onDeleteRequest,
}: {
  title: string;
  boards: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    coverImageUrl: string | null;
    isFavorite: boolean;
  }>;
  emptyMessage: string;
  onOpen: (slug: string) => void;
  onToggleFavorite: (boardId: string, isFavorite: boolean) => Promise<void>;
  canDeleteBoard: boolean;
  onDeleteRequest: (boardId: string, title: string) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {boards.length === 0 ? (
        <Card className="rounded-2xl border border-dashed border-border/70 bg-muted/15 p-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {boards.map((board) => (
            <Card key={board.id} className="w-80 shrink-0 overflow-hidden rounded-2xl border-border/70 bg-card/95">
              <button type="button" className="w-full text-left" onClick={() => onOpen(board.slug)}>
                <div className="h-36 w-full bg-muted/30">
                  {board.coverImageUrl ? (
                    <img src={board.coverImageUrl} alt={`Capa do quadro ${board.title}`} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="space-y-1 p-4">
                  <p className="font-semibold">{board.title}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{board.description || "Sem descrição do quadro."}</p>
                </div>
              </button>
              <div className="flex items-center justify-between border-t border-border/70 px-4 py-3">
                <Button variant="outline" size="sm" onClick={() => onOpen(board.slug)}>
                  Abrir
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void onToggleFavorite(board.id, board.isFavorite)}
                    title={board.isFavorite ? "Remover dos favoritos" : "Favoritar quadro"}
                  >
                    {board.isFavorite ? <Star className="h-4 w-4 fill-current text-amber-500" /> : <Star className="h-4 w-4" />}
                  </Button>
                  {canDeleteBoard ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteRequest(board.id, board.title);
                      }}
                      title="Excluir quadro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
