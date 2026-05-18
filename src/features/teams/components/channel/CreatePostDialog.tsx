import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CloudUpload, FileText, Image as ImageIcon, Loader2, Pin, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { MAX_ATTACHMENT_BYTES } from "../../constants";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  authorUserId: string;
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CreatePostDialog({ open, onOpenChange, channelId, authorUserId }: CreatePostDialogProps) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [value, setValue] = useState<RichTextDoc>(createEmptyRichTextDoc());
  const [plainText, setPlainText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pinOnPublish, setPinOnPublish] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const editorRef = useRef<LegalKanbanRichTextEditorHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setValue(createEmptyRichTextDoc());
    setPlainText("");
    setFiles([]);
    setPinOnPublish(false);
  };

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const accepted: File[] = [];
    for (const f of arr) {
      if (f.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`"${f.name}" excede 25 MB`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const snapshot = editorRef.current?.getSnapshot();
      const finalJson = snapshot?.json ?? value;
      const finalText = snapshot?.plainText ?? plainText;
      if (!title.trim()) throw new Error("Título obrigatório");
      const post = await postService.create({
        channel_id: channelId,
        author_user_id: authorUserId,
        title: title.trim(),
        description_json: finalJson,
        description_text: finalText,
      });
      if (pinOnPublish) {
        await postService.update(post.id, { is_pinned: true });
      }
      for (const file of files) {
        try {
          await attachmentService.uploadPostAttachment(post.id, channelId, authorUserId, file);
        } catch (e) {
          toast.error(`Falha ao anexar "${file.name}": ${(e as Error).message}`);
        }
      }
      return post;
    },
    onSuccess: () => {
      toast.success("Postagem publicada");
      qc.invalidateQueries({ queryKey: teamsKeys.posts(channelId) });
      onOpenChange(false);
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetForm();
      }}
    >
      <DialogContent className="w-[min(96vw,56rem)] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Criar Nova Postagem</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 max-h-[calc(90vh-9rem)] space-y-4 overflow-y-auto px-6 pb-4">
          <div className="min-w-0">
            <Label htmlFor="post-title">Título da Postagem</Label>
            <Input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Insira o título aqui…"
              className="w-full min-w-0 mt-1.5"
            />
          </div>

          <div className="min-w-0">
            <Label>Conteúdo da Postagem</Label>
            <div className="mt-1.5">
              <LegalKanbanRichTextEditor
                ref={editorRef}
                value={value}
                onChange={(json, text) => { setValue(json); setPlainText(text); }}
                placeholder="Comece a escrever sua postagem corporativa aqui…"
                onImageUpload={(file) => attachmentService.uploadInlineImage("draft", file)}
                className="min-w-0 max-w-full"
              />
            </div>
          </div>

          <div className="min-w-0">
            <Label>Anexos</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-1.5 cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
            >
              <CloudUpload className="mx-auto h-7 w-7 text-muted-foreground mb-2" />
              <p className="text-sm">
                Arraste arquivos ou{" "}
                <span className="text-primary underline">clique aqui</span> para anexar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, PNG e JPG (máx. 25MB cada)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((f, i) => {
                  const Icon = f.type.startsWith("image/") ? ImageIcon : FileText;
                  return (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 truncate font-medium">{f.name}</span>
                      <span className="text-muted-foreground flex-shrink-0">{humanSize(f.size)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFile(i)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="pin-on-publish"
              checked={pinOnPublish}
              onCheckedChange={(v) => setPinOnPublish(v === true)}
            />
            <Label htmlFor="pin-on-publish" className="text-sm font-normal flex items-center gap-1.5 cursor-pointer">
              <Pin className="h-3.5 w-3.5" />
              Fixar esta postagem no topo
            </Label>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
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
