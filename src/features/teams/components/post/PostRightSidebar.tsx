import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CloudUpload,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Trash2,
  Trello,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { MAX_ATTACHMENT_BYTES } from "../../constants";
import { teamsKeys } from "../../hooks/useTeamsTree";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { kanbanBridgeService } from "../../services/kanbanBridgeService";
import { attachmentService } from "../../services/attachmentService";
import { useCurrentProfileId } from "../../hooks/useCurrentProfileId";
import type { PostAttachment } from "../../types";
import { CreateCardFromPostDialog } from "./CreateCardFromPostDialog";
import { legalKanbanService } from "@/features/legal-kanban/services/legalKanbanService";
import { MentionHighlightedText } from "../MentionHighlightedText";
import { linkedActivityService } from "../../services/linkedActivityService";
import {
  collectMentionUserIdsFromText,
  extractMentionQuery,
  replaceLastMentionWithUser,
  type MentionCandidate,
} from "../../utils";

interface PostRightSidebarProps {
  postId: string;
  channelId?: string;
}

interface KanbanComment {
  id: string;
  content: string;
  created_at: string;
  author_user_id: string | null;
  author: { name: string | null; avatar_url: string | null } | null;
  mentions?: Array<{ user: { name: string | null } | null }>;
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

const GLOBAL_KANBAN_MANAGER_ROLES = ["administrator", "it", "advogado_adm"];

export function PostRightSidebar({ postId, channelId }: PostRightSidebarProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profileId } = useCurrentProfileId();
  const [createCardOpen, setCreateCardOpen] = useState(false);
  const [noAccessOpen, setNoAccessOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentMentionSearch, setCommentMentionSearch] = useState<string | null>(null);
  const [attachmentDragOver, setAttachmentDragOver] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<PostAttachment | null>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

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
      const [{ data: column }, { data: board }, { data: comments }] =
        await Promise.all([
          supabase.from("legal_kanban_columns").select("id, title").eq("id", card.column_id).maybeSingle(),
          supabase.from("legal_kanban_boards").select("id, title, slug").eq("id", card.board_id).maybeSingle(),
          supabase.from("legal_kanban_comments")
            .select(`
              id, content, created_at, author_user_id,
              author:users!legal_kanban_comments_author_user_id_fkey(name, avatar_url),
              mentions:legal_kanban_comment_mentions(user:users(name))
            `)
            .eq("card_id", card.id).order("created_at", { ascending: false }).limit(8),
        ]);
      return {
        card,
        column,
        board,
        comments: (comments ?? []) as unknown as KanbanComment[],
      };
    },
    enabled: !!cardId,
  });
  const cardLinked = !!cardId && !!cardData?.card;

  const { data: recentActivities = [] } = useQuery({
    queryKey: ["teams", "linked-activities", postId, cardId ?? "none"],
    queryFn: () => linkedActivityService.listForPostAndCard(postId, cardId),
  });

  const { data: attachments = [] } = useQuery<PostAttachment[]>({
    queryKey: ["teams", "post-attachments", postId],
    queryFn: () => attachmentService.listForPost(postId),
    enabled: !!postId,
  });

  async function openAttachment(att: PostAttachment) {
    if (!att.storage_path) {
      if (att.url) window.open(att.url, "_blank", "noopener");
      return;
    }
    const url = await attachmentService.getSignedUrl(att.storage_path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("Não foi possível abrir o anexo");
  }

  const invalidateLinkedActivities = () => {
    qc.invalidateQueries({ queryKey: ["teams", "linked-activities", postId] });
  };

  const uploadAttachments = useMutation({
    mutationFn: async (files: File[]) => {
      if (!channelId || !profileId) throw new Error("Não foi possível enviar o anexo");
      for (const file of files) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          toast.error(`"${file.name}" excede 25 MB`);
          continue;
        }
        await attachmentService.uploadPostAttachment(postId, channelId, profileId, file);
      }
    },
    onSuccess: () => {
      toast.success("Anexo(s) adicionado(s)");
      qc.invalidateQueries({ queryKey: ["teams", "post-attachments", postId] });
      qc.invalidateQueries({ queryKey: teamsKeys.post(postId) });
      invalidateLinkedActivities();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAttachment = useMutation({
    mutationFn: async (att: PostAttachment) => {
      await attachmentService.deleteAttachment(att.id, att.storage_path);
    },
    onSuccess: () => {
      toast.success("Anexo removido");
      setAttachmentToDelete(null);
      qc.invalidateQueries({ queryKey: ["teams", "post-attachments", postId] });
      qc.invalidateQueries({ queryKey: teamsKeys.post(postId) });
      invalidateLinkedActivities();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleAttachmentFiles(incoming: FileList | File[]) {
    const accepted = Array.from(incoming).filter((f) => {
      if (f.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`"${f.name}" excede 25 MB`);
        return false;
      }
      return true;
    });
    if (accepted.length) uploadAttachments.mutate(accepted);
  }

  function humanSize(bytes?: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  const boardId = cardData?.board?.id ?? null;
  const isGlobalManager = GLOBAL_KANBAN_MANAGER_ROLES.includes(user?.role ?? "");

  const { data: isBoardMember = false } = useQuery({
    queryKey: ["legal-kanban", "is-board-member", boardId, profileId],
    queryFn: async () => {
      if (!boardId || !profileId) return false;
      const { count } = await supabase
        .from("legal_kanban_board_members")
        .select("id", { count: "exact", head: true })
        .eq("board_id", boardId)
        .eq("user_id", profileId);
      return (count ?? 0) > 0;
    },
    enabled: !!boardId && !!profileId && !isGlobalManager,
  });

  const hasBoardAccess = isGlobalManager || isBoardMember;

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

      return ((data ?? []) as unknown as Array<{
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

  // Realtime: atividades (post + card), comentários e dados do card vinculado
  useEffect(() => {
    const channelName = `teams-post-sidebar:${postId}:${cardId ?? "no-card"}`;
    let channel = supabase.channel(channelName);

    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "post_activities", filter: `post_id=eq.${postId}` },
      invalidateLinkedActivities,
    );
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "post_attachments", filter: `post_id=eq.${postId}` },
      () => {
        invalidateLinkedActivities();
        qc.invalidateQueries({ queryKey: ["teams", "post-attachments", postId] });
      },
    );

    if (cardId) {
      channel = channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "legal_kanban_activities", filter: `card_id=eq.${cardId}` },
          invalidateLinkedActivities,
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
        );
    }

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cardId, postId, qc]);

  const unlink = useMutation({
    mutationFn: () => kanbanBridgeService.unlink(postId),
    onSuccess: () => {
      toast.success("Card desvinculado");
      qc.invalidateQueries({ queryKey: ["teams", "kanban-link", postId] });
      invalidateLinkedActivities();
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
      invalidateLinkedActivities();
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
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Trello className="h-3.5 w-3.5" />
            Informações do Card
          </h3>
          {cardLinked && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => unlink.mutate()}>
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {cardLinked && cardData?.card ? (
          <button
            type="button"
            onClick={() => {
              if (!hasBoardAccess) {
                setNoAccessOpen(true);
                return;
              }
              navigate(`/documents/cases/quadros/${cardData.board?.slug ?? ""}?card=${cardData.card.id}`);
            }}
            className="block w-full rounded-lg border bg-card p-3 text-left hover:bg-accent/40 transition-colors"
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
              {!hasBoardAccess && (
                <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-700">
                  <Lock className="h-2.5 w-2.5" />
                  Sem acesso
                </Badge>
              )}
            </div>
            <div className="flex items-start gap-1">
              <Trello className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="font-medium text-sm flex-1">{cardData.card.title}</span>
              {hasBoardAccess ? (
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {cardData.board?.title} · {cardData.column?.title}
              {cardData.card.due_date && (
                <> · vence {new Date(cardData.card.due_date).toLocaleDateString("pt-BR")}</>
              )}
            </div>
          </button>
        ) : (
          <Button variant="default" className="w-full" onClick={() => setCreateCardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Card
          </Button>
        )}
      </Card>

      {/* Anexos da postagem */}
      <Card className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          Anexos da postagem
          {attachments.length > 0 && (
            <span className="ml-auto text-[10px] font-normal text-muted-foreground">
              {attachments.length}
            </span>
          )}
        </h3>

        {attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground mb-3">Nenhum anexo nesta postagem.</p>
        ) : (
          <ul className="space-y-1.5 mb-3">
            {attachments.map((att) => {
              const Icon = att.kind === "image" ? ImageIcon : FileText;
              return (
                <li key={att.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openAttachment(att)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left"
                  >
                    <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 truncate font-medium">{att.name}</span>
                    {att.size_bytes ? (
                      <span className="text-muted-foreground flex-shrink-0">{humanSize(att.size_bytes)}</span>
                    ) : null}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 opacity-70 hover:opacity-100"
                    title="Excluir anexo"
                    onClick={() => setAttachmentToDelete(att)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {channelId && profileId && (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") attachmentInputRef.current?.click();
            }}
            onDragOver={(e) => { e.preventDefault(); setAttachmentDragOver(true); }}
            onDragLeave={() => setAttachmentDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setAttachmentDragOver(false);
              if (e.dataTransfer.files?.length) handleAttachmentFiles(e.dataTransfer.files);
            }}
            onClick={() => attachmentInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border border-dashed px-3 py-3 text-center transition-colors ${
              attachmentDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            {uploadAttachments.isPending ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <CloudUpload className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-[11px] text-muted-foreground">
                  Arraste ou{" "}
                  <span className="text-primary underline">clique</span> para anexar
                </p>
              </>
            )}
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              className="hidden"
              disabled={uploadAttachments.isPending}
              onChange={(e) => {
                if (e.target.files?.length) handleAttachmentFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </Card>

      {/* Atividades recentes */}
      <Card className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          Atividades recentes
        </h3>
        {recentActivities.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem atividades ainda.</p>
        ) : (
          <ul className="space-y-2.5">
            {recentActivities.map((a) => (
              <li key={`${a.source}-${a.id}`} className="flex gap-2 text-xs">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground/90">{a.message}</p>
                  <p className="text-muted-foreground mt-0.5">{relativeTime(a.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Comentários do Card */}
      <Card className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
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
                        <p className="text-xs text-foreground/80 mt-0.5 whitespace-pre-wrap">
                          <MentionHighlightedText
                            content={c.content}
                            mentionNames={[
                              ...cardMentionCandidates.map((m) => m.name),
                              ...(c.mentions ?? [])
                                .map((m) => m.user?.name)
                                .filter((name): name is string => Boolean(name)),
                            ]}
                          />
                        </p>
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
        onCreated={invalidateLinkedActivities}
      />

      <AlertDialog
        open={!!attachmentToDelete}
        onOpenChange={(open) => { if (!open) setAttachmentToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anexo?</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              O arquivo{" "}
              <span className="font-medium text-foreground break-all">{attachmentToDelete?.name}</span>{" "}
              será removido permanentemente desta postagem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAttachment.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAttachment.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (attachmentToDelete) deleteAttachment.mutate(attachmentToDelete);
              }}
            >
              {deleteAttachment.isPending ? "Excluindo..." : "Excluir anexo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={noAccessOpen} onOpenChange={setNoAccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              Acesso restrito ao quadro
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-1">
              <span className="block">
                Você não é membro do quadro{" "}
                <span className="font-medium text-foreground">{cardData?.board?.title ?? ""}</span>{" "}
                e por isso não pode visualizar este card.
              </span>
              <span className="block">
                Solicite ao responsável da equipe que adicione você como membro do quadro
                em <span className="font-mono text-xs">Gestão de Quadros</span>.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setNoAccessOpen(false)}>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
