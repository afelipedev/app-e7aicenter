import { useParams, NavLink } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Pin, Star, Trash2, Trello } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePost, usePostMessages } from "../hooks/usePostThread";
import { useCurrentProfileId } from "../hooks/useCurrentProfileId";
import { MessageList } from "../components/post/MessageList";
import { MessageComposer } from "../components/post/MessageComposer";
import { postService } from "../services/postService";
import { KanbanLinkSection } from "../components/post/KanbanLinkSection";
import { CreateCardFromPostDialog } from "../components/post/CreateCardFromPostDialog";

function initials(name?: string) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function PostPage() {
  const { teamSlug, channelSlug, postId } = useParams<{ teamSlug: string; channelSlug: string; postId: string }>();
  const [bridgeOpen, setBridgeOpen] = useState(false);
  const { data: post } = usePost(postId);
  const { messages, isLoading: msgLoading } = usePostMessages(postId);
  const { data: profileId } = useCurrentProfileId();

  const togglePin = useMutation({
    mutationFn: () => postService.update(postId!, { is_pinned: !post?.is_pinned }),
    onSuccess: () => toast.success(post?.is_pinned ? "Desafixada" : "Fixada"),
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleFav = useMutation({
    mutationFn: () => {
      if (!profileId) throw new Error("Sem perfil");
      return postService.toggleFavorite(postId!, profileId);
    },
    onSuccess: () => toast.success("Favorito atualizado"),
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => postService.softDelete(postId!),
    onSuccess: () => toast.success("Postagem removida"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!post) {
    return <div className="container mx-auto px-4 py-6 text-sm text-muted-foreground">Carregando postagem…</div>;
  }

  const isAuthor = post.author_user_id === profileId;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <NavLink to={`/teams/${teamSlug}/${channelSlug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao canal
      </NavLink>

      <Card className="mt-3 p-5">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials(post.author?.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {post.is_pinned && <Pin className="h-4 w-4 text-primary" />}
              <h1 className="text-lg font-semibold">{post.title}</h1>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {post.author?.name ?? "Usuário"} · {new Date(post.created_at).toLocaleString("pt-BR")}
            </div>
            {post.description_text && (
              <div className="mt-3 prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                {post.description_text}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setBridgeOpen(true)} title="Criar Card no Kanban">
              <Trello className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => toggleFav.mutate()} disabled={!profileId}>
              <Star className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => togglePin.mutate()}>
              <Pin className={post.is_pinned ? "h-4 w-4 text-primary" : "h-4 w-4"} />
            </Button>
            {isAuthor && (
              <Button variant="ghost" size="icon" onClick={() => remove.mutate()}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      <KanbanLinkSection postId={postId!} />

      <div className="mt-4 border rounded-lg bg-card">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-medium">Respostas {messages.length > 0 && `(${messages.length})`}</h2>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {msgLoading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : (
            <MessageList postId={postId!} messages={messages} currentUserId={profileId ?? null} />
          )}
        </div>
        {profileId && <MessageComposer postId={postId!} />}
      </div>

      <CreateCardFromPostDialog
        open={bridgeOpen}
        onOpenChange={setBridgeOpen}
        postId={postId!}
      />
    </div>
  );
}
