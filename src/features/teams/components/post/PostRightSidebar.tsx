import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Trello, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { kanbanBridgeService } from "../../services/kanbanBridgeService";
import { CreateCardFromPostDialog } from "./CreateCardFromPostDialog";

interface PostRightSidebarProps {
  postId: string;
}

interface KanbanComment {
  id: string;
  content: string;
  created_at: string;
  author: { name: string | null; avatar_url: string | null } | null;
}

interface KanbanActivity {
  id: string;
  activity_type: string;
  message: string | null;
  created_at: string;
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

export function PostRightSidebar({ postId }: PostRightSidebarProps) {
  const qc = useQueryClient();
  const [createCardOpen, setCreateCardOpen] = useState(false);

  const { data: link } = useQuery({
    queryKey: ["teams", "kanban-link", postId],
    queryFn: () => kanbanBridgeService.getLinkForPost(postId),
  });

  const { data: cardData } = useQuery({
    queryKey: ["teams", "kanban-card", link?.card_id],
    queryFn: async () => {
      if (!link?.card_id) return null;
      const { data: card } = await supabase
        .from("legal_kanban_cards")
        .select("id, title, status, priority, due_date, column_id, board_id, card_number")
        .eq("id", link.card_id).maybeSingle();
      if (!card) return null;
      const [{ data: column }, { data: board }, { data: activities }, { data: comments }] =
        await Promise.all([
          supabase.from("legal_kanban_columns").select("id, title").eq("id", card.column_id).maybeSingle(),
          supabase.from("legal_kanban_boards").select("id, title, slug").eq("id", card.board_id).maybeSingle(),
          supabase.from("legal_kanban_activities")
            .select("id, activity_type, message, created_at")
            .eq("card_id", card.id).order("created_at", { ascending: false }).limit(8),
          supabase.from("legal_kanban_comments")
            .select("id, content, created_at, author:users!legal_kanban_comments_author_user_id_fkey(name, avatar_url)")
            .eq("card_id", card.id).order("created_at", { ascending: false }).limit(8),
        ]);
      return {
        card,
        column,
        board,
        activities: (activities ?? []) as KanbanActivity[],
        comments: (comments ?? []) as unknown as KanbanComment[],
      };
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

  const cardLinked = !!link?.card_id && !!cardData?.card;

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 space-y-4">
      {/* Informações do Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Informações do Card
          </h3>
          {cardLinked && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => unlink.mutate()}>
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {cardLinked && cardData?.card ? (
          <NavLink
            to={`/documents/cases/quadros/${cardData.board?.slug ?? ""}?card=${cardData.card.id}`}
            className="block rounded-lg border bg-card p-3 hover:bg-accent/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {cardData.card.priority && (
                <Badge variant="outline" className="text-[10px] uppercase">
                  {cardData.card.priority}
                </Badge>
              )}
              {cardData.card.card_number != null && (
                <span className="text-xs text-muted-foreground font-mono">
                  #{cardData.card.card_number}
                </span>
              )}
            </div>
            <div className="flex items-start gap-1">
              <Trello className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="font-medium text-sm flex-1">{cardData.card.title}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {cardData.board?.title} · {cardData.column?.title}
              {cardData.card.due_date && (
                <> · vence {new Date(cardData.card.due_date).toLocaleDateString("pt-BR")}</>
              )}
            </div>
          </NavLink>
        ) : (
          <Button variant="default" className="w-full" onClick={() => setCreateCardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Card
          </Button>
        )}
      </Card>

      {/* Atividades recentes */}
      <Card className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Atividades recentes
        </h3>
        {!cardLinked ? (
          <p className="text-xs text-muted-foreground">
            Vincule ou crie um card para ver as atividades.
          </p>
        ) : cardData!.activities.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem atividades ainda.</p>
        ) : (
          <ul className="space-y-2.5">
            {cardData!.activities.map((a) => (
              <li key={a.id} className="flex gap-2 text-xs">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground/90">{a.message ?? a.activity_type}</p>
                  <p className="text-muted-foreground mt-0.5">{relativeTime(a.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Comentários do Card */}
      <Card className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Comentários do Card
        </h3>
        {!cardLinked ? (
          <p className="text-xs text-muted-foreground">
            Vincule ou crie um card para ver os comentários.
          </p>
        ) : cardData!.comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem comentários ainda.</p>
        ) : (
          <ul className="space-y-3">
            {cardData!.comments.map((c) => (
              <li key={c.id} className="flex gap-2">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  {c.author?.avatar_url && (
                    <AvatarImage src={c.author.avatar_url} alt={c.author?.name ?? ""} />
                  )}
                  <AvatarFallback className="text-[10px]">{initials(c.author?.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium">{c.author?.name ?? "Usuário"}</span>
                  </div>
                  <p className="text-xs text-foreground/80 mt-0.5 line-clamp-3">{c.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <CreateCardFromPostDialog
        open={createCardOpen}
        onOpenChange={setCreateCardOpen}
        postId={postId}
      />
    </aside>
  );
}
