import { supabase } from "@/lib/supabase";
import type { PostMessage, PostMessageWithAuthor, MessageReaction } from "../types";

const TIMEOUT_MS = 15000;
function withTimeout<T>(p: PromiseLike<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Tempo esgotado")), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(t); resolve(v as T); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export const messageService = {
  async listByPost(postId: string, opts?: { before?: string; limit?: number }): Promise<PostMessageWithAuthor[]> {
    const limit = opts?.limit ?? 100;
    let query = supabase
      .from("post_messages")
      .select("*, author:users!post_messages_author_user_id_fkey(id, name, email, avatar_url)")
      .eq("post_id", postId)
      .is("deleted_at", null)
      .is("mirrored_card_comment_id", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (opts?.before) query = query.lt("created_at", opts.before);
    const { data, error } = await withTimeout(query);
    if (error) throw new Error(error.message);
    const rows = ((data ?? []) as PostMessageWithAuthor[]).reverse();

    if (!rows.length) return rows;
    const ids = rows.map((r) => r.id);
    const { data: reactions } = await supabase
      .from("message_reactions").select("*").in("message_id", ids);
    const byMsg = new Map<string, MessageReaction[]>();
    for (const r of (reactions ?? []) as MessageReaction[]) {
      if (!byMsg.has(r.message_id)) byMsg.set(r.message_id, []);
      byMsg.get(r.message_id)!.push(r);
    }
    return rows.map((m) => ({ ...m, reactions: byMsg.get(m.id) ?? [] }));
  },

  async sendMessage(input: {
    post_id: string;
    content_json: Record<string, unknown>;
    mention_user_ids?: string[];
  }): Promise<PostMessage> {
    const { data, error } = await supabase.functions.invoke("teams-message-send", {
      body: {
        post_id: input.post_id,
        content_json: input.content_json,
        mention_user_ids: input.mention_user_ids ?? [],
      },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Erro");
    return (data?.data?.message as PostMessage);
  },

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await withTimeout(
      supabase.from("post_messages").delete().eq("id", messageId),
    );
    if (error) throw new Error(error.message);

    // Propaga para o comentário espelhado, se houver
    try {
      await supabase.functions.invoke("teams-kanban-bridge", {
        body: { action: "mirror_delete_comment", payload: { post_message_id: messageId } },
      });
    } catch (e) {
      console.warn("Mirror delete post→card falhou:", (e as Error).message);
    }
  },

  async toggleReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from("message_reactions")
      .select("id")
      .eq("message_id", messageId).eq("user_id", userId).eq("emoji", emoji)
      .maybeSingle();
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
      return false;
    }
    await supabase.from("message_reactions").insert({ message_id: messageId, user_id: userId, emoji });
    return true;
  },

  async toggleMessageFavorite(messageId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from("message_favorites")
      .select("id").eq("message_id", messageId).eq("user_id", userId).maybeSingle();
    if (existing) {
      await supabase.from("message_favorites").delete().eq("id", existing.id);
      return false;
    }
    await supabase.from("message_favorites").insert({ message_id: messageId, user_id: userId });
    return true;
  },
};
