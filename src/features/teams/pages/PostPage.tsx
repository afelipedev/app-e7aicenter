import { useParams, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, FileText, Image as ImageIcon, Pin, Star, Trash2, UserPlus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { usePost, usePostMessages } from "../hooks/usePostThread";
import { useCurrentProfileId } from "../hooks/useCurrentProfileId";
import { MessageList } from "../components/post/MessageList";
import { ThreadSearchBox } from "../components/post/ThreadSearchBox";
import { FavoriteMessagesDialog } from "../components/post/FavoriteMessagesDialog";
import { MessageComposer } from "../components/post/MessageComposer";
import { PostRightSidebar } from "../components/post/PostRightSidebar";
import { InviteMemberDialog } from "../components/post/InviteMemberDialog";
import { postService } from "../services/postService";
import { attachmentService } from "../services/attachmentService";
import { teamsKeys } from "../hooks/useTeamsTree";
import type { PostAttachment } from "../types";
import type { MentionCandidate } from "../utils";

function initials(name?: string) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
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

export default function PostPage() {
  const { teamSlug, channelSlug, postId } = useParams<{ teamSlug: string; channelSlug: string; postId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [favMessagesOpen, setFavMessagesOpen] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const { data: post } = usePost(postId);
  const { messages, isLoading: msgLoading } = usePostMessages(postId);
  const { data: profileId } = useCurrentProfileId();

  // Need team_id + channel_id to wire the invite dialog
  const { data: channelRow } = useQuery({
    queryKey: ["teams", "channel-row", post?.channel_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("channels").select("id, team_id, visibility").eq("id", post!.channel_id).maybeSingle();
      return data as { id: string; team_id: string; visibility: "public" | "private" } | null;
    },
    enabled: !!post?.channel_id,
  });

  const { data: postMentionCandidates = [] } = useQuery({
    queryKey: ["teams", "post-mention-candidates", channelRow?.id, channelRow?.team_id, channelRow?.visibility],
    queryFn: async () => {
      if (!channelRow) return [] as MentionCandidate[];

      if (channelRow.visibility === "private") {
        const { data, error } = await supabase
          .from("channel_members")
          .select("user_id, user:users!channel_members_user_id_fkey(id, name, status)")
          .eq("channel_id", channelRow.id);
        if (error) throw new Error(error.message);
        return ((data ?? []) as unknown as Array<{
          user_id: string;
          user: { id: string; name: string | null; status: string | null } | null;
        }>)
          .filter((row) => row.user?.status === "ativo" && Boolean(row.user?.name))
          .map((row) => ({ id: row.user_id, name: row.user!.name! }))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      }

      const { data, error } = await supabase
        .from("team_members")
        .select("user_id, user:users!team_members_user_id_fkey(id, name, status)")
        .eq("team_id", channelRow.team_id);
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as Array<{
        user_id: string;
        user: { id: string; name: string | null; status: string | null } | null;
      }>)
        .filter((row) => row.user?.status === "ativo" && Boolean(row.user?.name))
        .map((row) => ({ id: row.user_id, name: row.user!.name! }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },
    enabled: !!channelRow,
  });

  const togglePin = useMutation({
    mutationFn: () => postService.update(postId!, { is_pinned: !post?.is_pinned }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: teamsKeys.post(postId!) });
      const prev = qc.getQueryData(teamsKeys.post(postId!));
      qc.setQueryData(teamsKeys.post(postId!), (old: unknown) =>
        old ? { ...(old as object), is_pinned: !post?.is_pinned } : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(teamsKeys.post(postId!), ctx.prev);
      toast.error("Falha ao atualizar fixação");
    },
    onSuccess: () => {
      toast.success(post?.is_pinned ? "Desafixada" : "Fixada");
      qc.invalidateQueries({ queryKey: teamsKeys.post(postId!) });
      if (post?.channel_id) qc.invalidateQueries({ queryKey: teamsKeys.posts(post.channel_id) });
    },
  });

  const toggleFav = useMutation({
    mutationFn: () => {
      if (!profileId) throw new Error("Sem perfil");
      return postService.toggleFavorite(postId!, profileId);
    },
    onSuccess: (favorited) => {
      toast.success(favorited ? "Adicionada aos favoritos" : "Removida dos favoritos");
      qc.invalidateQueries({ queryKey: teamsKeys.favorites() });
      if (post?.channel_id) qc.invalidateQueries({ queryKey: teamsKeys.posts(post.channel_id) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => postService.softDelete(postId!),
    onSuccess: async () => {
      if (post?.channel_id) {
        qc.setQueryData(teamsKeys.posts(post.channel_id), (old: unknown) =>
          Array.isArray(old) ? old.filter((item) => (item as { id?: string }).id !== postId) : old,
        );
      }
      qc.removeQueries({ queryKey: teamsKeys.post(postId!) });
      qc.invalidateQueries({ queryKey: teamsKeys.favorites() });
      if (post?.channel_id) {
        await qc.invalidateQueries({ queryKey: teamsKeys.posts(post.channel_id) });
      }
      toast.success("Postagem removida");
      navigate(`/teams/${teamSlug}/${channelSlug}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!post) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Carregando postagem…</div>;
  }

  const isAuthor = post.author_user_id === profileId;
  const attachments = (post.attachments ?? []) as PostAttachment[];

  return (
    <div className="w-full max-w-[1400px]">
      <NavLink
        to={`/teams/${teamSlug}/${channelSlug}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao canal
      </NavLink>

      <div className="mt-3 flex flex-col lg:flex-row gap-4">
        {/* Coluna principal — conversa */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                  {post.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                  {post.title}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Conversa com a equipe e o time de produto
                </p>
              </div>
              <div className="flex items-center gap-1">
                {channelRow && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setInviteOpen(true)}
                    title="Convidar membro"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => toggleFav.mutate()} disabled={!profileId} title="Favoritar">
                  <Star className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => togglePin.mutate()} title={post.is_pinned ? "Desafixar" : "Fixar"}>
                  <Pin className={post.is_pinned ? "h-4 w-4 text-primary" : "h-4 w-4"} />
                </Button>
                {isAuthor && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmDeleteOpen(true)}
                    title="Excluir postagem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Avatar className="h-9 w-9">
                {post.author?.avatar_url && (
                  <AvatarImage src={post.author.avatar_url} alt={post.author?.name ?? ""} />
                )}
                <AvatarFallback>{initials(post.author?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{post.author?.name ?? "Usuário"}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {new Date(post.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                {post.description_text && (
                  <div className="mt-1 prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                    {post.description_text}
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {attachments.map((att) => {
                      const Icon = att.kind === "image" ? ImageIcon : FileText;
                      return (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => openAttachment(att)}
                          className="inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs hover:bg-accent transition-colors max-w-full"
                        >
                          <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate font-medium">{att.name}</span>
                          {att.size_bytes ? (
                            <span className="text-muted-foreground flex-shrink-0">
                              {humanSize(att.size_bytes)}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="mt-4 border rounded-lg bg-card flex-1 flex flex-col">
            <div className="px-4 py-2.5 border-b flex items-center gap-2">
              <h2 className="text-sm font-medium shrink-0">
                Respostas {messages.length > 0 && `(${messages.length})`}
              </h2>
              <div className="flex-1 flex justify-center min-w-0 px-2">
                <ThreadSearchBox messages={messages} className="w-full max-w-sm" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                title="Mensagens favoritas"
                onClick={() => setFavMessagesOpen(true)}
                disabled={!profileId}
              >
                <Star className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 flex-1 max-h-[60vh] overflow-y-auto">
              {msgLoading ? (
                <div className="text-sm text-muted-foreground">Carregando…</div>
              ) : (
                <MessageList
                  postId={postId!}
                  messages={messages}
                  currentUserId={profileId ?? null}
                  mentionNames={postMentionCandidates.map((c) => c.name)}
                />
              )}
            </div>
            {profileId && <MessageComposer postId={postId!} mentionCandidates={postMentionCandidates} />}
          </div>
        </div>

        {/* Sidebar direita */}
        <PostRightSidebar postId={postId!} channelId={post.channel_id} />
      </div>

      {channelRow && (
        <InviteMemberDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          teamId={channelRow.team_id}
          channelId={channelRow.id}
        />
      )}

      <FavoriteMessagesDialog
        open={favMessagesOpen}
        onOpenChange={setFavMessagesOpen}
        postId={postId!}
        onSelectMessage={(messageId) => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set("messageId", messageId);
            return next;
          });
        }}
      />

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir postagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove a postagem e não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                remove.mutate();
                setConfirmDeleteOpen(false);
              }}
            >
              {remove.isPending ? "Excluindo..." : "Excluir postagem"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
