import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LegalKanbanRichTextEditor,
  type LegalKanbanRichTextEditorHandle,
} from "@/features/legal-kanban/components/editor/LegalKanbanRichTextEditor";
import { createEmptyRichTextDoc } from "@/features/legal-kanban/components/editor/extensions";
import type { RichTextDoc } from "@/features/legal-kanban/types";
import { postService } from "../../services/postService";
import { attachmentService } from "../../services/attachmentService";
import { teamsKeys } from "../../hooks/useTeamsTree";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  authorUserId: string;
}

export function CreatePostDialog({ open, onOpenChange, channelId, authorUserId }: CreatePostDialogProps) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [value, setValue] = useState<RichTextDoc>(createEmptyRichTextDoc());
  const [plainText, setPlainText] = useState("");
  const editorRef = useRef<LegalKanbanRichTextEditorHandle | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const snapshot = editorRef.current?.getSnapshot();
      const finalJson = snapshot?.json ?? value;
      const finalText = snapshot?.plainText ?? plainText;
      if (!title.trim()) throw new Error("Título obrigatório");
      return await postService.create({
        channel_id: channelId,
        author_user_id: authorUserId,
        title: title.trim(),
        description_json: finalJson,
        description_text: finalText,
      });
    },
    onSuccess: () => {
      toast.success("Postagem criada");
      qc.invalidateQueries({ queryKey: teamsKeys.posts(channelId) });
      onOpenChange(false);
      setTitle("");
      setValue(createEmptyRichTextDoc());
      setPlainText("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova postagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="post-title">Título</Label>
            <Input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Atualização do projeto X"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <LegalKanbanRichTextEditor
              ref={editorRef}
              value={value}
              onChange={(json, text) => { setValue(json); setPlainText(text); }}
              placeholder="Escreva a postagem… (suporta menções, listas, imagens)"
              onImageUpload={(file) => attachmentService.uploadInlineImage("draft", file)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
