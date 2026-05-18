import { NavLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Trello, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { kanbanBridgeService } from "../../services/kanbanBridgeService";

interface KanbanLinkSectionProps {
  postId: string;
}

export function KanbanLinkSection({ postId }: KanbanLinkSectionProps) {
  const qc = useQueryClient();
  const { data: link } = useQuery({
    queryKey: ["teams", "kanban-link", postId],
    queryFn: () => kanbanBridgeService.getLinkForPost(postId),
  });

  const { data: cardData } = useQuery({
    queryKey: ["teams", "kanban-card", link?.card_id],
    queryFn: async () => {
      if (!link?.card_id) return null;
      const { data } = await supabase
        .from("legal_kanban_cards")
        .select("id, title, status, priority, due_date, column_id, board_id")
        .eq("id", link.card_id).maybeSingle();
      if (!data) return null;
      const [{ data: column }, { data: board }, { data: activities }] = await Promise.all([
        supabase.from("legal_kanban_columns").select("id, title").eq("id", data.column_id).maybeSingle(),
        supabase.from("legal_kanban_boards").select("id, title, slug").eq("id", data.board_id).maybeSingle(),
        supabase.from("legal_kanban_activities").select("id, activity_type, message, created_at")
          .eq("card_id", data.id).order("created_at", { ascending: false }).limit(10),
      ]);
      return { card: data, column, board, activities: activities ?? [] };
    },
    enabled: !!link?.card_id,
  });

  const unlink = useMutation({
    mutationFn: () => kanbanBridgeService.unlink(postId),
    onSuccess: () => {
      toast.success("Card desvinculado");
      qc.invalidateQueries({ queryKey: ["teams", "kanban-link", postId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!link?.card_id) return null;

  return (
    <Card className="mt-4 p-4">
      <div className="flex items-start gap-3">
        <Trello className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Informações do Card</span>
            <Badge variant="outline" className="text-xs">{cardData?.card?.status ?? "—"}</Badge>
            <Badge variant="outline" className="text-xs">{cardData?.card?.priority ?? "—"}</Badge>
          </div>
          {cardData?.card && (
            <div className="mt-1 text-sm">
              <NavLink
                to={`/documents/cases/quadros/${cardData.board?.slug ?? ""}?card=${cardData.card.id}`}
                className="text-primary hover:underline inline-flex items-center"
              >
                {cardData.card.title}
                <ExternalLink className="ml-1 h-3 w-3" />
              </NavLink>
              <div className="text-xs text-muted-foreground mt-0.5">
                {cardData.board?.title} · {cardData.column?.title}
                {cardData.card.due_date && ` · vence ${new Date(cardData.card.due_date).toLocaleDateString("pt-BR")}`}
              </div>
            </div>
          )}
          {cardData?.activities && cardData.activities.length > 0 && (
            <div className="mt-3 border-t pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Atividades recentes</p>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {(cardData.activities as { id: string; activity_type: string; message?: string | null; created_at: string }[]).slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <span className="font-mono">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                    {" — "}
                    {a.message ?? a.activity_type}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => unlink.mutate()}>
          <Unlink className="mr-1 h-4 w-4" /> Desvincular
        </Button>
      </div>
    </Card>
  );
}
