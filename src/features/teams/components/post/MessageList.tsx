import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Smile, Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { messageService } from "../../services/messageService";
import { teamsKeys } from "../../hooks/useTeamsTree";
import { groupMessagesByDay, formatRelativeTime } from "../../utils";
import { DEFAULT_REACTIONS } from "../../constants";
import type { PostMessageWithAuthor } from "../../types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MessageListProps {
  postId: string;
  messages: PostMessageWithAuthor[];
  currentUserId: string | null;
}

function initials(name?: string) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function MessageList({ postId, messages, currentUserId }: MessageListProps) {
  const qc = useQueryClient();
  const groups = useMemo(() => groupMessagesByDay(messages), [messages]);
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("messageId");
  const highlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, messages.length]);

  const reactMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!currentUserId) throw new Error("Sem usuário");
      return messageService.toggleReaction(messageId, currentUserId, emoji);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamsKeys.messages(postId) }),
    onError: (err: Error) => toast.error(err.message),
  });

  const favMutation = useMutation({
    mutationFn: (messageId: string) => {
      if (!currentUserId) throw new Error("Sem usuário");
      return messageService.toggleMessageFavorite(messageId, currentUserId);
    },
    onSuccess: () => toast.success("Favorito atualizado"),
    onError: (err: Error) => toast.error(err.message),
  });

  const delMutation = useMutation({
    mutationFn: (messageId: string) => messageService.deleteMessage(messageId),
    onSuccess: () => {
      toast.success("Mensagem removida");
      qc.invalidateQueries({ queryKey: teamsKeys.messages(postId) });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!messages.length) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        Nenhuma mensagem ainda. Seja o primeiro a responder.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group, idx) => (
        <div key={group.dayKey}>
          {idx > 0 && <Separator className="my-3" />}
          <div className="mb-2 text-xs font-medium text-muted-foreground">{group.label}</div>
          <div className="space-y-3">
            {group.messages.map((m) => {
              const reactionCounts = new Map<string, number>();
              const reactedByMe = new Set<string>();
              for (const r of m.reactions ?? []) {
                reactionCounts.set(r.emoji, (reactionCounts.get(r.emoji) ?? 0) + 1);
                if (r.user_id === currentUserId) reactedByMe.add(r.emoji);
              }
              const isHighlight = highlightId === m.id;
              return (
                <div
                  key={m.id}
                  ref={isHighlight ? highlightRef : undefined}
                  className={cn(
                    "flex gap-3 group rounded-md p-1 -m-1 transition-colors",
                    isHighlight && "bg-yellow-500/10 ring-1 ring-yellow-500/40",
                  )}
                >
                  <Avatar className="h-8 w-8 mt-0.5">
                    {m.author?.avatar_url && <AvatarImage src={m.author.avatar_url} alt={m.author?.name ?? ""} />}
                    <AvatarFallback>{initials(m.author?.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{m.author?.name ?? "Usuário"}</span>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(m.created_at)}</span>
                      {m.edited_at && <span className="text-xs text-muted-foreground italic">(editado)</span>}
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.content_text}</p>
                    {reactionCounts.size > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Array.from(reactionCounts.entries()).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => reactMutation.mutate({ messageId: m.id, emoji })}
                            className={
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs hover:bg-accent " +
                              (reactedByMe.has(emoji) ? "border-primary bg-primary/10" : "border-border")
                            }
                          >
                            <span>{emoji}</span>
                            <span>{count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Smile className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <div className="flex gap-1">
                          {DEFAULT_REACTIONS.map((e) => (
                            <button
                              key={e}
                              className="text-lg hover:bg-accent rounded p-1"
                              onClick={() => reactMutation.mutate({ messageId: m.id, emoji: e })}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => favMutation.mutate(m.id)}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    {m.author_user_id === currentUserId && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => delMutation.mutate(m.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
