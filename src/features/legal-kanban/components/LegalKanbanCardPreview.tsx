import {
  ArrowUpRight,
  CalendarDays,
  Copy,
  Hash,
  ListChecks,
  MessageSquare,
  Paperclip,
  ShieldAlert,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LEGAL_KANBAN_PRIORITY_META, LEGAL_KANBAN_STATUS_META } from "../constants";
import type { LegalKanbanCard } from "../types";
import {
  calendarDaysUntil,
  formatDaysRemainingUntilReminder,
  formatKanbanDatetimeLocal,
  formatRelativeDate,
} from "../utils";
import { MemberAvatar } from "./MemberAvatar";

/** Prévia visual do card, reutilizada no board e na central de Itens Arquivados. */
export function LegalKanbanCardPreview({ card }: { card: LegalKanbanCard }) {
  return (
    <div className="space-y-3">
      {card.labels.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {card.labels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 rounded-full border border-transparent px-2.5 py-1 text-[11px] font-semibold text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="break-words text-sm font-semibold leading-5 text-foreground [overflow-wrap:anywhere]">
            {card.title}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", LEGAL_KANBAN_STATUS_META[card.status].chip)}>
              {LEGAL_KANBAN_STATUS_META[card.status].label}
            </span>
            <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", LEGAL_KANBAN_PRIORITY_META[card.priority].chip)}>
              {LEGAL_KANBAN_PRIORITY_META[card.priority].label}
            </span>
          </div>
        </div>
        <span className="rounded-full border border-border/70 bg-muted/20 px-2.5 py-1 text-xs font-semibold text-muted-foreground dark:bg-muted/30">
          #{card.cardNumber}
        </span>
      </div>

      <div className="grid gap-2.5 text-xs text-muted-foreground">
        {card.reminderAt ? (
          <div
            role="status"
            className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5"
            aria-label={`Lembrete em ${formatKanbanDatetimeLocal(card.reminderAt)}. ${formatDaysRemainingUntilReminder(card.reminderAt)}.`}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-muted-foreground">{formatKanbanDatetimeLocal(card.reminderAt)}</span>
            <span className="text-muted-foreground" aria-hidden>
              ·
            </span>
            <span
              className={cn(
                "font-medium",
                calendarDaysUntil(card.reminderAt) < 0 && "text-destructive",
                calendarDaysUntil(card.reminderAt) >= 0 && "text-emerald-600 dark:text-emerald-500",
              )}
            >
              {formatDaysRemainingUntilReminder(card.reminderAt)}
            </span>
          </div>
        ) : null}
        {card.dueDate && !card.reminderAt ? (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-muted-foreground">
              Prazo <span className="font-medium text-foreground">{formatRelativeDate(card.dueDate)}</span>
            </span>
          </div>
        ) : null}

        {card.members.length > 0 ? (
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            <div className="flex -space-x-2">
              {card.members.slice(0, 4).map((member) => (
                <span key={member.id} title={member.user.name} className="rounded-full">
                  <MemberAvatar user={member.user} className="h-8 w-8 border border-background text-[11px] dark:border-card" />
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {card.checklistStats.total > 0 ? (
            <span className="inline-flex items-center gap-1" title="Itens concluídos do checklist">
              <ListChecks className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                {card.checklistStats.completed}/{card.checklistStats.total}
              </span>
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {card.commentsCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5" />
            {card.attachmentsCount}
          </span>
          {card.status === "aguardando_aprovacao" ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
              title="Card aguardando aprovação"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase">Aprovação</span>
            </span>
          ) : null}
          {card.hasLinkedPost ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary dark:bg-primary/20"
              title="Card vinculado a uma postagem"
            >
              <Hash className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase">Postagem</span>
            </span>
          ) : null}
          {card.hasLinkedCard ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300"
              title="Card compartilhado com outro quadro"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase">Compartilhado</span>
            </span>
          ) : null}
          {card.isDuplicate ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300"
              title="Card sincronizado com outras cópias"
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase">Duplicado</span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
