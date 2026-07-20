import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AtSign, Bell, Check, MessageSquarePlus, ShieldAlert, Trello, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotifications } from "../hooks/useNotifications";
import type { NotificationRow } from "../types";

interface NotifPayload {
  // Teams (post / message)
  post_id?: string;
  message_id?: string;
  channel_id?: string;
  channel_slug?: string;
  channel_name?: string;
  team_id?: string;
  team_slug?: string;
  post_title?: string;
  // Kanban
  card_id?: string;
  card_title?: string;
  board_id?: string;
  board_slug?: string;
  board_title?: string;
}

function payloadOf(n: NotificationRow): NotifPayload {
  return (n.payload ?? {}) as NotifPayload;
}

function describe(n: NotificationRow): string {
  const p = payloadOf(n);
  switch (n.kind) {
    case "team_invite":
      return "Você foi adicionado a uma equipe";
    case "post_mention":
      return p.post_title
        ? `Você foi mencionado na postagem "${p.post_title}"`
        : "Você foi mencionado em uma postagem";
    case "message_mention":
      return p.post_title
        ? `Você foi mencionado em uma resposta da postagem "${p.post_title}"`
        : "Você foi mencionado em uma mensagem";
    case "post_reply":
      return p.post_title ? `Nova resposta em "${p.post_title}"` : "Nova resposta em uma postagem";
    case "kanban_comment_mention":
      return p.card_title
        ? `Você foi mencionado no card "${p.card_title}"`
        : "Você foi mencionado em um comentário do kanban";
    case "card_member_added":
      return p.card_title
        ? `Você foi adicionado ao card "${p.card_title}"`
        : "Você foi adicionado a um card";
    case "board_member_added":
      return p.board_title
        ? `Você foi adicionado ao quadro "${p.board_title}"`
        : "Você foi adicionado a um quadro";
    case "card_pending_approval":
      return p.card_title
        ? `O card "${p.card_title}" está aguardando aprovação`
        : "Um card está aguardando aprovação";
    case "post_created":
      return p.post_title && p.channel_name
        ? `Nova postagem em #${p.channel_name}: "${p.post_title}"`
        : "Nova postagem em um canal";
    default:
      return n.kind;
  }
}

function iconFor(n: NotificationRow) {
  switch (n.kind) {
    case "post_mention":
    case "message_mention":
    case "kanban_comment_mention":
      return AtSign;
    case "card_member_added":
    case "board_member_added":
      return UserPlus;
    case "card_pending_approval":
      return ShieldAlert;
    case "post_created":
      return MessageSquarePlus;
    case "team_invite":
      return UserPlus;
    default:
      return Trello;
  }
}

function linkFor(n: NotificationRow): string | null {
  const p = payloadOf(n);
  switch (n.kind) {
    case "post_mention":
    case "post_reply":
    case "post_created":
      if (p.team_slug && p.channel_slug && p.post_id) {
        return `/teams/${p.team_slug}/${p.channel_slug}/${p.post_id}`;
      }
      return null;
    case "message_mention":
      if (p.team_slug && p.channel_slug && p.post_id) {
        const base = `/teams/${p.team_slug}/${p.channel_slug}/${p.post_id}`;
        return p.message_id ? `${base}?messageId=${p.message_id}` : base;
      }
      return null;
    case "kanban_comment_mention":
    case "card_member_added":
    case "card_pending_approval":
      if (p.board_slug && p.card_id) {
        return `/documents/cases/quadros/${p.board_slug}?card=${p.card_id}`;
      }
      return null;
    case "board_member_added":
      return p.board_slug ? `/documents/cases/quadros/${p.board_slug}` : null;
    case "team_invite":
      return p.team_slug ? `/teams/${p.team_slug}` : "/teams";
    default:
      return null;
  }
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();

  function handleOpen(n: NotificationRow) {
    const href = linkFor(n);
    if (!n.read_at) markRead.mutate(n.id);
    if (href) {
      setOpen(false);
      navigate(href);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title={unreadCount > 0 ? `${unreadCount} não lidas` : "Notificações"}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">Notificações</span>
          <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} disabled={!unreadCount}>
            <Check className="mr-1 h-3.5 w-3.5" /> Marcar todas
          </Button>
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Sem notificações</div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const Icon = iconFor(n);
                const href = linkFor(n);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleOpen(n)}
                      disabled={!href && !!n.read_at}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/50",
                        !n.read_at && "bg-primary/5",
                      )}
                    >
                      <div className={cn(
                        "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
                        n.read_at ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm leading-snug", !n.read_at && "font-medium")}>
                          {describe(n)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {relativeTime(n.created_at)}
                        </p>
                      </div>
                      {!n.read_at && (
                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
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
