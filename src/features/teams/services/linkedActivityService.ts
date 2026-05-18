import { supabase } from "@/lib/supabase";

export interface LinkedActivityRow {
  id: string;
  activity_type: string;
  message: string | null;
  created_at: string;
  source: "post" | "kanban";
}

const EXCLUDED_ACTIVITY_TYPES = new Set([
  "comment_mirrored_from_post",
  "comment_mirrored_from_card",
  "comment_added",
]);

const RECENT_ACTIVITIES_LIMIT = 5;

/** Mensagens padrão em pt-BR quando `message` está vazio ou é o próprio tipo técnico. */
const ACTIVITY_TYPE_LABELS_PT: Record<string, string> = {
  card_linked: "Card vinculado à postagem.",
  card_unlinked: "Card desvinculado da postagem.",
  created_from_post: "Card criado a partir de postagem no Teams.",
  attachment_added: "Anexo adicionado.",
  attachment_removed: "Anexo removido.",
  card_comment_added: "Novo comentário no card.",
  status_changed: "Status do card alterado.",
  priority_changed: "Prioridade do card alterada.",
  members_updated: "Membros do card atualizados.",
  card_updated: "Card atualizado.",
  card_created: "Card criado.",
  card_moved: "Card movido entre raias.",
  checklist_added: "Checklist adicionada ao card.",
  checklist_deleted: "Checklist removida do card.",
  labels_updated: "Etiquetas do card atualizadas.",
};

export function formatActivityMessage(activityType: string, message: string | null): string {
  const trimmed = message?.trim() ?? "";
  if (trimmed && trimmed !== activityType) return trimmed;
  return ACTIVITY_TYPE_LABELS_PT[activityType] ?? (trimmed || activityType.replaceAll("_", " "));
}

function isMirrorRow(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const m = metadata as Record<string, unknown>;
  return m.teams_sync === true || m.teams_sync === "true";
}

function mapRow(
  row: { id: string; activity_type: string; message: string | null; created_at: string; metadata?: unknown },
  source: "post" | "kanban",
): (LinkedActivityRow & { metadata?: unknown }) | null {
  if (EXCLUDED_ACTIVITY_TYPES.has(row.activity_type)) return null;
  if (isMirrorRow(row.metadata)) return null;
  return {
    id: row.id,
    activity_type: row.activity_type,
    message: row.message,
    created_at: row.created_at,
    source,
    metadata: row.metadata,
  };
}

function dedupeKey(row: LinkedActivityRow & { metadata?: unknown }): string {
  if (row.metadata && typeof row.metadata === "object") {
    const m = row.metadata as Record<string, unknown>;
    const eventId = m.source_event_id;
    if (typeof eventId === "string" && eventId.length > 0) return `event:${eventId}`;
  }
  return `${row.source}:${row.id}`;
}

function mergeAndSort(
  rows: Array<LinkedActivityRow & { metadata?: unknown }>,
): LinkedActivityRow[] {
  const seen = new Set<string>();
  const unique: LinkedActivityRow[] = [];

  const sorted = [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  for (const row of sorted) {
    const key = dedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({
      id: row.id,
      activity_type: row.activity_type,
      message: formatActivityMessage(row.activity_type, row.message),
      created_at: row.created_at,
      source: row.source,
    });
    if (unique.length >= RECENT_ACTIVITIES_LIMIT) break;
  }

  return unique;
}

export const linkedActivityService = {
  limit: RECENT_ACTIVITIES_LIMIT,

  async listForPostAndCard(postId: string, cardId: string | null): Promise<LinkedActivityRow[]> {
    const [postRes, kanbanRes] = await Promise.all([
      supabase
        .from("post_activities")
        .select("id, activity_type, message, created_at, metadata")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(RECENT_ACTIVITIES_LIMIT * 3),
      cardId
        ? supabase
            .from("legal_kanban_activities")
            .select("id, activity_type, message, created_at, metadata")
            .eq("card_id", cardId)
            .order("created_at", { ascending: false })
            .limit(RECENT_ACTIVITIES_LIMIT * 3)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (postRes.error) throw new Error(postRes.error.message);
    if (kanbanRes.error) throw new Error(kanbanRes.error.message);

    const merged: Array<LinkedActivityRow & { metadata?: unknown }> = [];
    for (const row of postRes.data ?? []) {
      const mapped = mapRow(row, "post");
      if (mapped) merged.push(mapped);
    }
    for (const row of kanbanRes.data ?? []) {
      const mapped = mapRow(row, "kanban");
      if (mapped) merged.push(mapped);
    }

    return mergeAndSort(merged);
  },
};
