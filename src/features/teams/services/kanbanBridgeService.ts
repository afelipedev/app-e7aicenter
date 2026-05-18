import { supabase } from "@/lib/supabase";
import type { PostKanbanLink } from "../types";

async function invoke(action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("teams-kanban-bridge", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Erro");
  return data?.data;
}

export const kanbanBridgeService = {
  async getLinkForPost(postId: string): Promise<PostKanbanLink | null> {
    const { data, error } = await supabase
      .from("post_kanban_links").select("*").eq("post_id", postId).maybeSingle();
    if (error) throw new Error(error.message);
    return data as PostKanbanLink | null;
  },
  createCardFromPost(input: { post_id: string; board_id: string; column_id: string }) {
    return invoke("create_card_from_post", input);
  },
  unlink(post_id: string) {
    return invoke("unlink", { post_id });
  },
  mirrorComment(input: {
    direction: "post_to_card" | "card_to_post";
    post_id?: string;
    card_id?: string;
    content_text: string;
    content_json?: Record<string, unknown>;
  }) {
    return invoke("mirror_comment", input);
  },
};
