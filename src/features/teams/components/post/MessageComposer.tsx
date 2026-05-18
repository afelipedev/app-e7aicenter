import { useMemo, useRef, useState, KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { messageService } from "../../services/messageService";
import { teamsKeys } from "../../hooks/useTeamsTree";
import {
  collectMentionUserIdsFromText,
  extractMentionQuery,
  replaceLastMentionWithUser,
  type MentionCandidate,
} from "../../utils";

interface MessageComposerProps {
  postId: string;
  mentionCandidates: MentionCandidate[];
}

export function MessageComposer({ postId, mentionCandidates }: MessageComposerProps) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const filteredMentions = useMemo(() => {
    if (mentionSearch == null) return [];
    const query = mentionSearch.trim().toLowerCase();
    if (!query) return mentionCandidates.slice(0, 6);
    return mentionCandidates.filter((member) => member.name.toLowerCase().includes(query)).slice(0, 6);
  }, [mentionCandidates, mentionSearch]);

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const mentionUserIds = collectMentionUserIdsFromText(trimmed, mentionCandidates);
      const doc = {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: trimmed }] }],
      };
      return messageService.sendMessage({
        post_id: postId,
        content_json: doc,
        mention_user_ids: mentionUserIds,
      });
    },
    onSuccess: () => {
      setText("");
      setMentionSearch(null);
      qc.invalidateQueries({ queryKey: teamsKeys.messages(postId) });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      mutation.mutate();
    }
  };

  return (
    <div className="relative flex items-end gap-2 border-t bg-background p-3">
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          const value = e.target.value;
          setText(value);
          setMentionSearch(extractMentionQuery(value));
        }}
        onKeyDown={handleKeyDown}
        placeholder="Escreva uma resposta... use @ para mencionar alguém (Enter para enviar, Shift+Enter para nova linha)"
        rows={2}
        className="resize-none"
      />
      {mentionSearch !== null && filteredMentions.length > 0 ? (
        <div className="absolute bottom-[calc(100%+0.35rem)] left-3 z-20 w-[min(28rem,calc(100%-4.5rem))] rounded-xl border border-border/70 bg-popover p-1 shadow-xl">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Mencionar membro
          </p>
          <div className="max-h-44 space-y-1 overflow-y-auto">
            {filteredMentions.map((member) => (
              <button
                key={member.id}
                type="button"
                className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setText((prev) => replaceLastMentionWithUser(prev, member.name));
                  setMentionSearch(null);
                  textareaRef.current?.focus();
                }}
              >
                <span className="truncate font-medium">{member.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !text.trim()}>
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}
