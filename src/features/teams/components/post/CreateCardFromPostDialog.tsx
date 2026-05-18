import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { kanbanBridgeService } from "../../services/kanbanBridgeService";

interface CreateCardFromPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onCreated?: () => void;
}

export function CreateCardFromPostDialog({ open, onOpenChange, postId, onCreated }: CreateCardFromPostDialogProps) {
  const qc = useQueryClient();
  const [boardId, setBoardId] = useState("");
  const [columnId, setColumnId] = useState("");

  const { data: boards = [] } = useQuery({
    queryKey: ["legal-kanban-boards-for-bridge"],
    queryFn: async () => {
      const { data } = await supabase
        .from("legal_kanban_boards").select("id, title, slug").order("title");
      return data ?? [];
    },
    enabled: open,
  });

  const { data: columns = [] } = useQuery({
    queryKey: ["legal-kanban-columns", boardId],
    queryFn: async () => {
      const { data } = await supabase
        .from("legal_kanban_columns").select("id, title, position")
        .eq("board_id", boardId).order("position");
      return data ?? [];
    },
    enabled: !!boardId,
  });

  const create = useMutation({
    mutationFn: () => kanbanBridgeService.createCardFromPost({ post_id: postId, board_id: boardId, column_id: columnId }),
    onSuccess: () => {
      toast.success("Card criado e vinculado à postagem");
      qc.invalidateQueries({ queryKey: ["teams", "kanban-link", postId] });
      onCreated?.();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Card no Kanban</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Quadro</Label>
            <Select value={boardId} onValueChange={(v) => { setBoardId(v); setColumnId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar quadro" /></SelectTrigger>
              <SelectContent>
                {(boards as { id: string; title: string }[]).map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Raia/Coluna</Label>
            <Select value={columnId} onValueChange={setColumnId} disabled={!boardId}>
              <SelectTrigger><SelectValue placeholder="Selecionar coluna" /></SelectTrigger>
              <SelectContent>
                {(columns as { id: string; title: string }[]).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => create.mutate()} disabled={!boardId || !columnId || create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar e vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
