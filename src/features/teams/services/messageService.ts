import { supabase } from "@/lib/supabase";
import type { PostMessage, PostMessageWithAuthor, MessageReaction } from "../types";
import { extractMentionsFromDoc } from "../utils";

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
      .select("*, author:users!post_messages_author_user_id_fkey(id, name, email)")
      .eq("post_id", postId)
      .is("deleted_at", null)
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
    author_user_id: string;
    content_json: Record<string, unknown>;
    content_text: string;
  }): Promise<PostMessage> {
    const { data, error } = await withTimeout(
      supabase.from("post_messages").insert(input).select().single(),
    );
    if (error) throw new Error(error.message);

    // Persist mentions
    const mentionIds = extractMentionsFromDoc(input.content_json);
    if (mentionIds.length) {
      const rows = mentionIds.map((mentioned_user_id) => ({
        message_id: (data as PostMessage).id,
        mentioned_user_id,
      }));
      await supabase.from("message_mentions").insert(rows);
    }
    return data as PostMessage;
  },

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await withTimeout(
      supabase.from("post_messages").update({ deleted_at: new Date().toISOString() }).eq("id", messageId),
    );
    if (error) throw new Error(error.message);
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
