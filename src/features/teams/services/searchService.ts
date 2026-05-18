import { supabase } from "@/lib/supabase";
import type { PostWithAuthor, PostMessageWithAuthor } from "../types";

export interface TeamsSearchResult {
  posts: PostWithAuthor[];
  messages: PostMessageWithAuthor[];
}

export const searchService = {
  async search(query: string, opts?: { channelId?: string; limit?: number }): Promise<TeamsSearchResult> {
    const limit = opts?.limit ?? 20;
    const term = query.trim();
    if (!term) return { posts: [], messages: [] };

    const tsQuery = term.split(/\s+/).filter(Boolean).map((t) => `${t}:*`).join(" & ");

    let postsQ = supabase
      .from("posts")
      .select("*, author:users!posts_author_user_id_fkey(id, name, email)")
      .textSearch("search_tsv", tsQuery, { type: "websearch", config: "portuguese" })
      .is("deleted_at", null)
      .limit(limit);
    if (opts?.channelId) postsQ = postsQ.eq("channel_id", opts.channelId);
    const { data: posts } = await postsQ;

    const messagesQ = supabase
      .from("post_messages")
      .select("*, author:users!post_messages_author_user_id_fkey(id, name, email)")
      .textSearch("search_tsv", tsQuery, { type: "websearch", config: "portuguese" })
      .is("deleted_at", null)
      .limit(limit);
    const { data: messages } = await messagesQ;

    return {
      posts: (posts ?? []) as PostWithAuthor[],
      messages: (messages ?? []) as PostMessageWithAuthor[],
    };
  },
};
