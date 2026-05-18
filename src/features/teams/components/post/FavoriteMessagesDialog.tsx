import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, StarOff } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";
import { messageService } from "../../services/messageService";
import { useCurrentProfileId } from "../../hooks/useCurrentProfileId";

interface FavoriteMessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onSelectMessage: (messageId: string) => void;
}

interface FavoriteRow {
  id: string;
  message_id: string;
  message: {
    id: string;
    content_text: string;
    created_at: string;
    deleted_at: string | null;
    author: { id: string; name: string | null; avatar_url: string | null } | null;
  } | null;
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

const favKey = (postId: string, profileId: string | null | undefined) =>
  ["teams", "favorite-messages", postId, profileId ?? "anon"] as const;

export function FavoriteMessagesDialog({ open, onOpenChange, postId, onSelectMessage }: FavoriteMessagesDialogProps) {
  const qc = useQueryClient();
  const { data: profileId } = useCurrentProfileId();

  const { data: favorites = [], isLoading } = useQuery<FavoriteRow[]>({
    queryKey: favKey(postId, profileId),
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from("message_favorites")
        .select(
          "id, message_id, message:post_messages!message_favorites_message_id_fkey(id, post_id, content_text, created_at, deleted_at, author:users!post_messages_author_user_id_fkey(id, name, avatar_url))",
        )
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as Array<{
        id: string;
        message_id: string;
        message: (FavoriteRow["message"] & { post_id: string }) | null;
      }>;
      return rows
        .filter((r) => r.message && r.message.post_id === postId && !r.message.deleted_at)
        .map((r) => ({ id: r.id, message_id: r.message_id, message: r.message }));
    },
    enabled: open && !!profileId,
  });

  // Realtime: refresh quando favoritos do usuário mudam
  useEffect(() => {
    if (!open || !profileId) return;
    const channel = supabase
      .channel(`message_favorites:${profileId}:${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_favorites", filter: `user_id=eq.${profileId}` },
        () => qc.invalidateQueries({ queryKey: favKey(postId, profileId) }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, profileId, postId, qc]);

  const unfavorite = useMutation({
    mutationFn: async (messageId: string) => {
      if (!profileId) throw new Error("Sem perfil");
      return messageService.toggleMessageFavorite(messageId, profileId);
    },
    onMutate: async (messageId) => {
      await qc.cancelQueries({ queryKey: favKey(postId, profileId) });
      const prev = qc.getQueryData<FavoriteRow[]>(favKey(postId, profileId));
      qc.setQueryData<FavoriteRow[]>(favKey(postId, profileId), (old) =>
        (old ?? []).filter((r) => r.message_id !== messageId),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(favKey(postId, profileId), ctx.prev);
      toast.error("Falha ao desfavoritar");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: favKey(postId, profileId) });
    },
  });

  function handleSelect(messageId: string) {
    onSelectMessage(messageId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Mensagens favoritas
          </DialogTitle>
          <DialogDescription>
            Suas mensagens favoritadas nesta postagem. Clique para ir até a mensagem no chat.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-5 pb-5">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : favorites.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Você ainda não favoritou mensagens nesta postagem.
            </div>
          ) : (
            <ul className="space-y-2">
              {favorites.map((f) => {
                if (!f.message) return null;
                const m = f.message;
                return (
                  <li
                    key={f.id}
                    className="group flex items-start gap-2 rounded-md border bg-card p-2.5 hover:bg-accent/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(m.id)}
                      className="flex flex-1 min-w-0 items-start gap-2 text-left"
                    >
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        {m.author?.avatar_url && (
                          <AvatarImage src={m.author.avatar_url} alt={m.author?.name ?? ""} />
                        )}
                        <AvatarFallback className="text-[10px]">{initials(m.author?.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-medium">{m.author?.name ?? "Usuário"}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{relativeTime(m.created_at)}</span>
                        </div>
                        <p className="text-sm text-foreground/90 mt-0.5 line-clamp-2 whitespace-pre-wrap">
                          {m.content_text || "(sem texto)"}
                        </p>
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 opacity-60 group-hover:opacity-100"
                      title="Desfavoritar"
                      onClick={() => unfavorite.mutate(m.id)}
                      disabled={unfavorite.isPending}
                    >
                      <StarOff className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
