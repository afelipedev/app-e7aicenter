import { useState, KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { messageService } from "../../services/messageService";
import { kanbanBridgeService } from "../../services/kanbanBridgeService";
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
      const message = await messageService.sendMessage({ post_id: postId, content_json: doc });

      // Espelha para o card vinculado, se houver
      try {
        const link = await kanbanBridgeService.getLinkForPost(postId);
        if (link?.card_id) {
          await kanbanBridgeService.mirrorComment({
            direction: "post_to_card",
            post_id: postId,
            card_id: link.card_id,
            content_text: trimmed,
            content_json: doc,
          });
        }
      } catch (e) {
        // mirror não bloqueia o envio principal
        console.warn("Mirror post→card falhou:", (e as Error).message);
      }
      return message;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: teamsKeys.messages(postId) });
      qc.invalidateQueries({ queryKey: ["teams", "kanban-card"] });
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
