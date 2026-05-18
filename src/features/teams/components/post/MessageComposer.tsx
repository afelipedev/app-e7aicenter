import { useState, KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { messageService } from "../../services/messageService";
import { teamsKeys } from "../../hooks/useTeamsTree";

interface MessageComposerProps {
  postId: string;
}

export function MessageComposer({ postId }: MessageComposerProps) {
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const doc = {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: trimmed }] }],
      };
      return messageService.sendMessage({ post_id: postId, content_json: doc });
    },
    onSuccess: () => {
      setText("");
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
    <div className="flex items-end gap-2 border-t bg-background p-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escreva uma resposta… (Enter para enviar, Shift+Enter para nova linha)"
        rows={2}
        className="resize-none"
      />
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !text.trim()}>
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}
