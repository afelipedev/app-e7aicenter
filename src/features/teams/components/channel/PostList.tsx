import { NavLink } from "react-router-dom";
import { useState } from "react";
import { ChevronRight, FileText, Image as ImageIcon, MessageSquare, Pin, PinOff, Star, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCurrentProfileId } from "../../hooks/useCurrentProfileId";
import { postService } from "../../services/postService";
import { attachmentService } from "../../services/attachmentService";
import { teamsKeys } from "../../hooks/useTeamsTree";
import type { PostAttachment, PostWithAuthor } from "../../types";

interface PostListProps {
  posts: PostWithAuthor[];
  teamSlug: string;
  channelSlug: string;
  channelId?: string;
}

function initials(name?: string) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function humanSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function openAttachment(att: PostAttachment) {
  if (!att.storage_path) {
    if (att.url) window.open(att.url, "_blank", "noopener");
    return;
  }
  const url = await attachmentService.getSignedUrl(att.storage_path);
  if (url) window.open(url, "_blank", "noopener");
  else toast.error("Não foi possível abrir o anexo");
}

function AttachmentChip({ att }: { att: PostAttachment }) {
  const Icon = att.kind === "image" ? ImageIcon : FileText;
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAttachment(att); }}
      className="group inline-flex max-w-full items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground group-hover:text-primary-foreground" />
      <span className="truncate font-medium">{att.name}</span>
      {att.size_bytes ? (
        <span className="flex-shrink-0 text-muted-foreground group-hover:text-primary-foreground">
          {humanSize(att.size_bytes)}
        </span>
      ) : null}
    </button>
  );
}

export function PostList({ posts, teamSlug, channelSlug, channelId }: PostListProps) {
  const qc = useQueryClient();
  const { data: profileId } = useCurrentProfileId();
  const [postToDelete, setPostToDelete] = useState<PostWithAuthor | null>(null);

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) =>
      postService.update(id, { is_pinned: !pinned }),
    onMutate: async ({ id, pinned }) => {
      if (!channelId) return;
      await qc.cancelQueries({ queryKey: teamsKeys.posts(channelId) });
      const prev = qc.getQueryData<PostWithAuthor[]>(teamsKeys.posts(channelId));
      qc.setQueryData<PostWithAuthor[]>(teamsKeys.posts(channelId), (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, is_pinned: !pinned } : p)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (channelId && ctx?.prev) qc.setQueryData(teamsKeys.posts(channelId), ctx.prev);
      toast.error("Falha ao atualizar fixação");
    },
    onSuccess: (_, vars) => {
      toast.success(vars.pinned ? "Postagem desafixada" : "Postagem fixada");
      if (channelId) qc.invalidateQueries({ queryKey: teamsKeys.posts(channelId) });
    },
  });

  const removePost = useMutation({
    mutationFn: (id: string) => postService.softDelete(id),
    onMutate: async (id) => {
      if (!channelId) return;
      await qc.cancelQueries({ queryKey: teamsKeys.posts(channelId) });
      const prev = qc.getQueryData<PostWithAuthor[]>(teamsKeys.posts(channelId));
      qc.setQueryData<PostWithAuthor[]>(
        teamsKeys.posts(channelId),
        (old) => (old ?? []).filter((p) => p.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (channelId && ctx?.prev) qc.setQueryData(teamsKeys.posts(channelId), ctx.prev);
      toast.error("Falha ao excluir postagem");
    },
    onSuccess: () => {
      toast.success("Postagem removida");
      if (channelId) qc.invalidateQueries({ queryKey: teamsKeys.posts(channelId) });
      qc.invalidateQueries({ queryKey: teamsKeys.favorites() });
    },
    onSettled: () => setPostToDelete(null),
  });

  if (!posts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <MessageSquare className="mb-3 h-10 w-10 opacity-50" />
        <p className="text-sm">Nenhuma postagem ainda neste canal.</p>
        <p className="text-xs mt-1">Crie a primeira postagem para iniciar a discussão.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((p) => {
        const postPath = `/teams/${teamSlug}/${channelSlug}/${p.id}`;
        const canDelete = p.author_user_id === profileId;
        return (
          <Card
            key={p.id}
            className={cn(
              "p-4 transition-colors hover:bg-accent/20",
              p.is_pinned && "border-primary/40",
            )}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                {p.author?.avatar_url && <AvatarImage src={p.author.avatar_url} alt={p.author?.name ?? ""} />}
                <AvatarFallback>{initials(p.author?.name)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <NavLink to={postPath} className="font-semibold hover:underline truncate">
                    {p.title}
                  </NavLink>
                  {p.is_pinned && <Badge variant="secondary" className="gap-1"><Pin className="h-3 w-3" />Fixado</Badge>}
                  {p.is_announcement && <Badge variant="secondary">Aviso</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Por <span className="font-medium">{p.author?.name ?? "Usuário"}</span>
                  {" · "}
                  {relativeTime(p.last_activity_at ?? p.created_at)}
                </div>

                {p.description_text && (
                  <p className="mt-2 text-sm text-foreground/90 line-clamp-3 whitespace-pre-wrap">
                    {p.description_text}
                  </p>
                )}

                {p.attachments && p.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.attachments.map((att) => (
                      <AttachmentChip key={att.id} att={att} />
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {p.reply_count ?? 0} {p.reply_count === 1 ? "comentário" : "comentários"}
                    </span>
                  </div>
                  <NavLink to={postPath}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      Visualizar conversa
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </NavLink>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title={p.is_pinned ? "Desafixar postagem" : "Fixar postagem"}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePin.mutate({ id: p.id, pinned: !!p.is_pinned });
                  }}
                  disabled={togglePin.isPending}
                >
                  {p.is_pinned ? <PinOff className="h-4 w-4 text-primary" /> : <Pin className="h-4 w-4" />}
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Excluir postagem"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPostToDelete(p);
                    }}
                    disabled={removePost.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
                {p.is_favorited && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
              </div>
            </div>
          </Card>
        );
      })}

      <AlertDialog open={postToDelete != null} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir postagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove a postagem "{postToDelete?.title ?? ""}" e não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removePost.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removePost.isPending || !postToDelete}
              onClick={(event) => {
                event.preventDefault();
                if (postToDelete) {
                  removePost.mutate(postToDelete.id);
                }
              }}
            >
              {removePost.isPending ? "Excluindo..." : "Excluir postagem"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
