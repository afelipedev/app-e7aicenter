import {
  AlertTriangle,
  AtSign,
  Ban,
  MessageSquarePlus,
  ShieldAlert,
  Trello,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ATTENTION_KIND_LABEL, ATTENTION_PERSONAL_KINDS } from "../constants";
import type { DashboardAttentionItem } from "../types";

const KIND_ICON: Record<string, typeof Trello> = {
  kanban_overdue: AlertTriangle,
  kanban_blocked: Ban,
  post_mention: AtSign,
  message_mention: AtSign,
  kanban_comment_mention: AtSign,
  card_member_added: UserPlus,
  board_member_added: UserPlus,
  card_pending_approval: ShieldAlert,
  post_reply: MessageSquarePlus,
};

export function DashboardAttentionList({ items }: { items: DashboardAttentionItem[] }) {
  const navigate = useNavigate();
  const visible = items.filter((item) => ATTENTION_PERSONAL_KINDS.has(item.kind));

  if (!visible.length) {
    return (
      <div className="rounded-[12px] border border-dashed border-border px-5 py-8 text-sm leading-6 text-muted-foreground">
        Nada pendente para você no momento.
      </div>
    );
  }

  return (
    <ol className="divide-y divide-border overflow-hidden rounded-[12px] border border-border bg-card">
      {visible.map((item) => {
        const Icon = KIND_ICON[item.kind] ?? Trello;
        const kindLabel = ATTENTION_KIND_LABEL[item.kind] ?? "Atenção";
        return (
          <li key={`${item.kind}-${item.id}`}>
            <button
              type="button"
              onClick={() => navigate(item.href)}
              className="flex w-full min-h-14 items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <Icon
                className={
                  item.severity === "critical"
                    ? "mt-0.5 h-4 w-4 shrink-0 text-destructive"
                    : item.severity === "warning"
                      ? "mt-0.5 h-4 w-4 shrink-0 text-warning"
                      : "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                }
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">{item.title}</span>
                {item.subtitle ? (
                  <span className="block truncate text-sm text-muted-foreground">{item.subtitle}</span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                {kindLabel}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
