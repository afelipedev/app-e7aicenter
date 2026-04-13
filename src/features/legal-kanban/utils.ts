import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  formatDistanceToNowStrict,
  isAfter,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { createEmptyRichTextDoc } from "./components/editor/extensions";
import type {
  KanbanDueFilter,
  LegalKanbanColumnWithCards,
  LegalKanbanFiltersState,
  LegalKanbanUser,
  RichTextDoc,
} from "./types";

/** Garante documento TipTap válido a partir do JSONB/string do Postgres. */
export function normalizeRichTextDoc(raw: unknown): RichTextDoc {
  if (raw == null) return createEmptyRichTextDoc();
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return createEmptyRichTextDoc();
    }
  }
  if (typeof value !== "object" || value === null) return createEmptyRichTextDoc();
  const obj = value as Record<string, unknown>;
  if (obj.type !== "doc") return createEmptyRichTextDoc();
  return value as RichTextDoc;
}

export function formatRelativeDate(date: string | null | undefined) {
  if (!date) return "Sem data";
  return formatDistanceToNowStrict(parseISO(date), {
    addSuffix: true,
    locale: ptBR,
  });
}

/** Data/hora no fuso local, alinhado ao modal do card (dd/MM/yyyy · HH:mm). */
export function formatKanbanDatetimeLocal(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "dd/MM/yyyy · HH:mm", { locale: ptBR });
}

/** Dias entre hoje (calendário) e a data do lembrete; positivo = futuro. */
export function calendarDaysUntil(isoDate: string) {
  const target = startOfDay(parseISO(isoDate));
  const today = startOfDay(new Date());
  return differenceInCalendarDays(target, today);
}

/** Texto curto para o card: "3 dias restantes", "Hoje", "1 dia de atraso", etc. */
export function formatDaysRemainingUntilReminder(isoDate: string) {
  const days = calendarDaysUntil(isoDate);
  if (days > 1) return `${days} dias restantes`;
  if (days === 1) return "1 dia restante";
  if (days === 0) return "Hoje";
  const overdue = Math.abs(days);
  if (overdue === 1) return "1 dia de atraso";
  return `${overdue} dias de atraso`;
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function matchesDueFilter(date: string | null, dueFilter: KanbanDueFilter) {
  if (dueFilter === "all") return true;
  if (dueFilter === "none") return !date;
  if (!date) return false;

  const target = parseISO(date);
  const today = startOfDay(new Date());

  if (dueFilter === "overdue") {
    return isBefore(target, today);
  }

  const tomorrow = endOfDay(addDays(today, 1));
  if (dueFilter === "day") {
    return isWithinInterval(target, { start: today, end: tomorrow });
  }

  const nextWeek = endOfDay(addDays(today, 7));
  if (dueFilter === "week") {
    return isWithinInterval(target, { start: today, end: nextWeek });
  }

  const nextMonth = endOfDay(addDays(today, 30));
  return isWithinInterval(target, { start: today, end: nextMonth });
}

export function filterBoardColumns(
  columns: LegalKanbanColumnWithCards[],
  filters: LegalKanbanFiltersState,
  currentUserId: string | null,
) {
  const normalizedSearch = normalizeText(filters.search);

  return columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(card.title).includes(normalizedSearch) ||
        normalizeText(card.descriptionText).includes(normalizedSearch) ||
        String(card.cardNumber).includes(normalizedSearch);

      const matchesMemberMode =
        filters.memberMode === "all" ||
        (filters.memberMode === "unassigned" && card.members.length === 0) ||
        (filters.memberMode === "assignedToMe" &&
          currentUserId != null &&
          card.members.some((member) => member.user.id === currentUserId)) ||
        (filters.memberMode === "specificMembers" &&
          filters.memberIds.length > 0 &&
          card.members.some((member) => filters.memberIds.includes(member.user.id)));

      const matchesStatus =
        filters.statuses.length === 0 || filters.statuses.includes(card.status);

      const matchesLabels =
        filters.labelIds.length === 0 ||
        card.labels.some((label) => filters.labelIds.includes(label.id));

      const matchesDue = matchesDueFilter(card.dueDate, filters.dueFilter);

      return matchesSearch && matchesMemberMode && matchesStatus && matchesLabels && matchesDue;
    }),
  }));
}

export function sortByPosition<T extends { position: number }>(items: T[]) {
  return [...items].sort((left, right) => left.position - right.position);
}

export function reorderList<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function reindexByHundreds<T extends { position: number }>(items: T[]) {
  return items.map((item, index) => ({
    ...item,
    position: (index + 1) * 100,
  }));
}

export function buildColorFromName(name: string) {
  const palette = ["#2563eb", "#7c3aed", "#ea580c", "#16a34a", "#dc2626", "#0f766e", "#c026d3", "#475569"];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export function getMemberInitials(user: LegalKanbanUser) {
  return user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function getCardsCount(columns: LegalKanbanColumnWithCards[]) {
  return columns.reduce((acc, column) => acc + column.cards.length, 0);
}

export function hasDueSoon(date: string | null) {
  if (!date) return false;
  const target = parseISO(date);
  const today = startOfDay(new Date());
  return isAfter(target, today) && isWithinInterval(target, { start: today, end: endOfDay(addDays(today, 3)) });
}

