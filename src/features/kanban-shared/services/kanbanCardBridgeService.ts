import { supabase } from "@/lib/supabase";
import type { KanbanCardLinkInfo } from "@/features/legal-kanban/types";

async function invoke(action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("kanban-card-bridge", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Erro ao compartilhar card");
  return data?.data;
}

export const kanbanCardBridgeService = {
  async getLinkForCard(cardId: string): Promise<KanbanCardLinkInfo | null> {
    const { data, error } = await supabase
      .from("kanban_card_links")
      .select(
        "id, source_card_id, target_card_id, source_board_id, target_board_id, source_board:legal_kanban_boards!kanban_card_links_source_board_id_fkey(slug, domain), target_board:legal_kanban_boards!kanban_card_links_target_board_id_fkey(slug, domain)",
      )
      .or(`source_card_id.eq.${cardId},target_card_id.eq.${cardId}`)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const isSource = data.source_card_id === cardId;
    return {
      linkId: data.id,
      peerCardId: isSource ? data.target_card_id : data.source_card_id,
      peerBoardId: isSource ? data.target_board_id : data.source_board_id,
      peerBoardSlug: isSource ? data.target_board?.slug || "" : data.source_board?.slug || "",
      peerBoardDomain: isSource ? data.target_board?.domain || "legal" : data.source_board?.domain || "operational",
      isSource,
    };
  },

  shareCard(input: { source_card_id: string; target_board_id: string; target_column_id: string }) {
    return invoke("share_card", input);
  },

  unlink(card_id: string) {
    return invoke("unlink", { card_id });
  },
};
