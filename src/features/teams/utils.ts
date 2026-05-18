import type { PostMessageWithAuthor } from "./types";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export interface MessageDayGroup {
  dayKey: string;
  label: string;
  messages: PostMessageWithAuthor[];
}

export function groupMessagesByDay(messages: PostMessageWithAuthor[]): MessageDayGroup[] {
  const map = new Map<string, PostMessageWithAuthor[]>();
  for (const m of messages) {
    const d = new Date(m.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([dayKey, msgs]) => {
      let label = dayKey;
      if (dayKey === todayKey) label = "Hoje";
      else if (dayKey === yKey) label = "Ontem";
      else label = new Date(dayKey + "T00:00:00").toLocaleDateString("pt-BR");
      return { dayKey, label, messages: msgs };
    });
}

export function plainTextFromTipTapDoc(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  let acc = "";
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; text?: unknown; content?: unknown };
    if (n.type === "text" && typeof n.text === "string") acc += n.text + " ";
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(doc);
  return acc.trim();
}

export function extractMentionsFromDoc(doc: unknown): string[] {
  const ids: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; attrs?: { id?: unknown }; content?: unknown };
    if (n.type === "mention" && n.attrs?.id) ids.push(String(n.attrs.id));
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(doc);
  return Array.from(new Set(ids));
}

export function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
