import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Plus, Send, Trash2, Trello, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { kanbanBridgeService } from "../../services/kanbanBridgeService";
import { useCurrentProfileId } from "../../hooks/useCurrentProfileId";
import { CreateCardFromPostDialog } from "./CreateCardFromPostDialog";
import { legalKanbanService } from "@/features/legal-kanban/services/legalKanbanService";
import {
  collectMentionUserIdsFromText,
  extractMentionQuery,
  replaceLastMentionWithUser,
  type MentionCandidate,
} from "../../utils";

interface PostRightSidebarProps {
  postId: string;
}

interface KanbanComment {
  id: string;
  content: string;
  created_at: string;
  author_user_id: string | null;
  author: { name: string | null; avatar_url: string | null } | null;
}

interface KanbanActivity {
  id: string;
  activity_type: string;
  message: string | null;
  created_at: string;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

export function PostRightSidebar({ postId }: PostRightSidebarProps) {
  const qc = useQueryClient();
  const { data: profileId } = useCurrentProfileId();
  const [createCardOpen, setCreateCardOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentMentionSearch, setCommentMentionSearch] = useState<string | null>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: link } = useQuery({
    queryKey: ["teams", "kanban-link", postId],
    queryFn: () => kanbanBridgeService.getLinkForPost(postId),
  });

  const cardId = link?.card_id ?? null;

  const { data: cardData } = useQuery({
    queryKey: ["teams", "kanban-card", cardId],
    queryFn: async () => {
      if (!cardId) return null;
      const { data: card } = await supabase
        .from("legal_kanban_cards")
        .select("id, title, status, priority, due_date, column_id, board_id, card_number")
        .eq("id", cardId).maybeSingle();
      if (!card) return null;
      const [{ data: column }, { data: board }, { data: activities }, { data: comments }] =
        await Promise.all([
          supabase.from("legal_kanban_columns").select("id, title").eq("id", card.column_id).maybeSingle(),
          supabase.from("legal_kanban_boards").select("id, title, slug").eq("id", card.board_id).maybeSingle(),
          supabase.from("legal_kanban_activities")
            .select("id, activity_type, message, created_at")
            .eq("card_id", card.id).order("created_at", { ascending: false }).limit(8),
          supabase.from("legal_kanban_comments")
            .select("id, content, created_at, author_user_id, author:users!legal_kanban_comments_author_user_id_fkey(name, avatar_url)")
            .eq("card_id", card.id).order("created_at", { ascending: false }).limit(8),
        ]);
      return {
        card,
        column,
        board,
        activities: (activities ?? []) as KanbanActivity[],
        comments: (comments ?? []) as unknown as KanbanComment[],
      };
    },
    enabled: !!cardId,
  });
  const cardLinked = !!cardId && !!cardData?.card;

  const { data: cardMentionCandidates = [] } = useQuery({
    queryKey: ["teams", "kanban-board-members", cardData?.board?.id],
    queryFn: async () => {
      const boardId = cardData?.board?.id;
      if (!boardId) return [] as MentionCandidate[];
      const { data, error } = await supabase
        .from("legal_kanban_board_members")
        .select("user_id, user:users!legal_kanban_board_members_user_id_fkey(id, name, status)")
        .eq("board_id", boardId);
      if (error) throw new Error(error.message);

      return ((data ?? []) as Array<{
        user_id: string;
        user: { id: string; name: string | null; status: string | null } | null;
      }>)
        .filter((row) => row.user?.status === "ativo" && Boolean(row.user?.name))
        .map((row) => ({ id: row.user_id, name: row.user!.name! }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },
    enabled: !!cardData?.board?.id,
  });

  const filteredCardMentions = useMemo(() => {
    if (commentMentionSearch == null) return [];
    const query = commentMentionSearch.trim().toLowerCase();
    if (!query) return cardMentionCandidates.slice(0, 6);
    return cardMentionCandidates.filter((member) => member.name.toLowerCase().includes(query)).slice(0, 6);
  }, [cardMentionCandidates, commentMentionSearch]);

  // Realtime: atualiza atividades, comentários e card quando há mudanças no card vinculado
  useEffect(() => {
    if (!cardId) return;
    const channel = supabase
      .channel(`kanban-card-mirror:${cardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "legal_kanban_activities", filter: `card_id=eq.${cardId}` },
        () => qc.invalidateQueries({ queryKey: ["teams", "kanban-card", cardId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "legal_kanban_comments", filter: `card_id=eq.${cardId}` },
        () => qc.invalidateQueries({ queryKey: ["teams", "kanban-card", cardId] }),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "legal_kanban_cards", filter: `id=eq.${cardId}` },
        () => qc.invalidateQueries({ queryKey: ["teams", "kanban-card", cardId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cardId, qc]);

  const unlink = useMutation({
    mutationFn: () => kanbanBridgeService.unlink(postId),
    onSuccess: () => {
      toast.success("Card desvinculado");
      qc.invalidateQueries({ queryKey: ["teams", "kanban-link", postId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Inserir comentário no card a partir da postagem (espelha para post_messages via bridge)
  const addComment = useMutation({
    mutationFn: async () => {
      const text = newComment.trim();
      if (!text) throw new Error("Comentário vazio");
      if (!cardId || !profileId) throw new Error("Sem card vinculado");
      const mentionUserIds = collectMentionUserIdsFromText(text, cardMentionCandidates);
      return legalKanbanService.addComment(cardId, text, mentionUserIds);
    },
    onSuccess: () => {
      setNewComment("");
      setCommentMentionSearch(null);
      qc.invalidateQueries({ queryKey: ["teams", "kanban-card", cardId] });
      qc.invalidateQueries({ queryKey: ["teams", "messages", postId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Deletar comentário (propaga via mirror_delete)
  const removeComment = useMutation({
    mutationFn: async (commentId: string) => {
      await legalKanbanService.deleteComment(commentId);
    },
    onSuccess: () => {
      toast.success("Comentário removido");
      qc.invalidateQueries({ queryKey: ["teams", "kanban-card", cardId] });
      qc.invalidateQueries({ queryKey: ["teams", "messages", postId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 space-y-4">
      {/* Informações do Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Informações do Card
          </h3>
          {cardLinked && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => unlink.mutate()}>
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {cardLinked && cardData?.card ? (
          <NavLink
            to={`/documents/cases/quadros/${cardData.board?.slug ?? ""}?card=${cardData.card.id}`}
            className="block rounded-lg border bg-card p-3 hover:bg-accent/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {cardData.card.priority && (
                <Badge variant="outline" className="text-[10px] uppercase">
                  {cardData.card.priority}
                </Badge>
              )}
              {cardData.card.card_number != null && (
                <span className="text-xs text-muted-foreground font-mono">
                  #{cardData.card.card_number}
                </span>
              )}
            </div>
            <div className="flex items-start gap-1">
              <Trello className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="font-medium text-sm flex-1">{cardData.card.title}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {cardData.board?.title} · {cardData.column?.title}
              {cardData.card.due_date && (
                <> · vence {new Date(cardData.card.due_date).toLocaleDateString("pt-BR")}</>
              )}
            </div>
          </NavLink>
        ) : (
          <Button variant="default" className="w-full" onClick={() => setCreateCardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Card
          </Button>
        )}
      </Card>

      {/* Atividades recentes */}
      <Card className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Atividades recentes
        </h3>
        {!cardLinked ? (
          <p className="text-xs text-muted-foreground">
            Vincule ou crie um card para ver as atividades.
          </p>
        ) : cardData!.activities.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem atividades ainda.</p>
        ) : (
          <ul className="space-y-2.5">
            {cardData!.activities.map((a) => (
              <li key={a.id} className="flex gap-2 text-xs">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground/90">{a.message ?? a.activity_type}</p>
                  <p className="text-muted-foreground mt-0.5">{relativeTime(a.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Comentários do Card */}
      <Card className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Comentários do Card
        </h3>
        {!cardLinked ? (
          <p className="text-xs text-muted-foreground">
            Vincule ou crie um card para ver os comentários.
          </p>
        ) : (
          <>
            {cardData!.comments.length === 0 ? (
              <p className="text-xs text-muted-foreground mb-3">Sem comentários ainda.</p>
            ) : (
              <ul className="space-y-3 mb-3">
                {cardData!.comments.map((c) => {
                  const isAuthor = c.author_user_id === profileId;
                  return (
                    <li key={c.id} className="flex gap-2 group">
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        {c.author?.avatar_url && (
                          <AvatarImage src={c.author.avatar_url} alt={c.author?.name ?? ""} />
                        )}
                        <AvatarFallback className="text-[10px]">{initials(c.author?.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{c.author?.name ?? "Usuário"}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">{relativeTime(c.created_at)}</span>
                          </div>
                          {isAuthor && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeComment.mutate(c.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-foreground/80 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {profileId && (
              <div className="border-t pt-3 space-y-2">
                <Textarea
                  ref={commentTextareaRef}
                  value={newComment}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewComment(value);
                    setCommentMentionSearch(extractMentionQuery(value));
                  }}
                  placeholder="Adicionar comentário ao card... use @ para mencionar alguém"
                  rows={2}
                  className="resize-none text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (newComment.trim()) addComment.mutate();
                    }
                  }}
                />
                {commentMentionSearch !== null && filteredCardMentions.length > 0 ? (
                  <div className="rounded-xl border border-border/70 bg-popover p-1 shadow-lg">
                    <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Mencionar membro
                    </p>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {filteredCardMentions.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-xs hover:bg-accent"
                          onClick={() => {
                            setNewComment((prev) => replaceLastMentionWithUser(prev, member.name));
                            setCommentMentionSearch(null);
                            commentTextareaRef.current?.focus();
                          }}
                        >
                          <span className="truncate font-medium">{member.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => addComment.mutate()}
                  disabled={!newComment.trim() || addComment.isPending}
                >
                  {addComment.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Comentar
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <CreateCardFromPostDialog
        open={createCardOpen}
        onOpenChange={setCreateCardOpen}
        postId={postId}
      />
    </aside>
  );
}
