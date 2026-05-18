import { supabase } from "@/lib/supabase";
import type { PostWithAuthor, PostMessageWithAuthor } from "../types";

export interface TeamsSearchResult {
  posts: PostWithAuthor[];
  messages: PostMessageWithAuthor[];
}

export const searchService = {
  async search(
    query: string,
    opts?: { channelId?: string; teamId?: string; limit?: number; authorId?: string; from?: string; to?: string },
  ): Promise<TeamsSearchResult> {
    const term = query.trim();
    if (term.length < 2) return { posts: [], messages: [] };

    let scope: string | undefined;
    if (opts?.channelId) scope = `channel:${opts.channelId}`;
    else if (opts?.teamId) scope = `team:${opts.teamId}`;

    const { data, error } = await supabase.functions.invoke("teams-search", {
      body: {
        query: term,
        scope,
        filters: {
          limit: opts?.limit,
          author_id: opts?.authorId,
          from: opts?.from,
          to: opts?.to,
        },
      },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Erro");

    const payload = data?.data as { posts?: PostWithAuthor[]; messages?: PostMessageWithAuthor[] } | undefined;
    return {
      posts: payload?.posts ?? [],
      messages: payload?.messages ?? [],
    };
  },
};
