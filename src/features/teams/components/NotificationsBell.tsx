import { NavLink } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "../hooks/useNotifications";

function describe(kind: string): string {
  switch (kind) {
    case "team_invite": return "Você foi adicionado a uma equipe";
    case "post_mention": return "Você foi mencionado em uma postagem";
    case "message_mention": return "Você foi mencionado em uma mensagem";
    case "post_reply": return "Nova resposta em uma postagem";
    default: return kind;
  }
}

function linkFor(n: { kind: string; payload: Record<string, unknown> }): string | null {
  const p = n.payload ?? {};
  if (n.kind === "team_invite" && p.team_id) return `/teams`;
  if ((n.kind === "post_mention" || n.kind === "post_reply") && p.post_id && p.channel_id) {
    return `/teams`;
  }
  if (n.kind === "message_mention" && p.post_id) return `/teams`;
  return null;
}

export function NotificationsBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]" variant="destructive">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">Notificações</span>
          <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} disabled={!unreadCount}>
            <Check className="mr-1 h-3.5 w-3.5" /> Marcar lidas
          </Button>
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Sem notificações</div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const href = linkFor(n);
                const content = (
                  <div className="flex items-start gap-2 p-3 hover:bg-accent/40">
                    <div className="flex-1 min-w-0">
                      <p className={"text-sm " + (n.read_at ? "text-muted-foreground" : "font-medium")}>
                        {describe(n.kind)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(n.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    {!n.read_at && (
                      <button
                        onClick={(e) => { e.preventDefault(); markRead.mutate(n.id); }}
                        className="text-xs text-primary hover:underline"
                      >
                        marcar lida
                      </button>
                    )}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {href ? <NavLink to={href} onClick={() => markRead.mutate(n.id)}>{content}</NavLink> : content}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
