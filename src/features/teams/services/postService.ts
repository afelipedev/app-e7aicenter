import { supabase } from "@/lib/supabase";
import type { Post, PostWithAuthor } from "../types";

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

export const postService = {
  async listByChannel(channelId: string, opts?: { limit?: number; offset?: number }): Promise<PostWithAuthor[]> {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;
    const { data, error } = await withTimeout(
      supabase
        .from("posts")
        .select(
          "*, author:users!posts_author_user_id_fkey(id, name, email, avatar_url), attachments:post_attachments(*), reply_count:post_messages(count)",
        )
        .eq("channel_id", channelId)
        .is("deleted_at", null)
        .order("is_pinned", { ascending: false })
        .order("last_activity_at", { ascending: false })
        .range(offset, offset + limit - 1),
    );
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown[]).map((row) => {
      const r = row as Record<string, unknown> & {
        reply_count?: Array<{ count: number }> | number;
      };
      const rc = r.reply_count;
      return {
        ...(r as object),
        reply_count: Array.isArray(rc) ? (rc[0]?.count ?? 0) : (typeof rc === "number" ? rc : 0),
      } as PostWithAuthor;
    });
  },

  async getById(postId: string): Promise<PostWithAuthor | null> {
    const { data, error } = await withTimeout(
      supabase
        .from("posts")
        .select(
          "*, author:users!posts_author_user_id_fkey(id, name, email, avatar_url), attachments:post_attachments(*)",
        )
        .eq("id", postId)
        .maybeSingle(),
    );
    if (error) throw new Error(error.message);
    return data as PostWithAuthor | null;
  },

  async create(input: {
    channel_id: string;
    author_user_id: string;
    title: string;
    description_json: Record<string, unknown>;
    description_text: string;
  }): Promise<Post> {
    const { data, error } = await withTimeout(
      supabase.from("posts").insert(input).select().single(),
    );
    if (error) throw new Error(error.message);
    return data as Post;
  },

  async update(postId: string, patch: Partial<Pick<Post, "title" | "description_json" | "description_text" | "is_pinned">>): Promise<Post> {
    const { data, error } = await withTimeout(
      supabase.from("posts").update(patch).eq("id", postId).select().single(),
    );
    if (error) throw new Error(error.message);
    return data as Post;
  },

  async softDelete(postId: string): Promise<void> {
    const { error } = await withTimeout(
      supabase.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", postId),
    );
    if (error) throw new Error(error.message);
  },

  async toggleFavorite(postId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from("post_favorites").select("id").eq("post_id", postId).eq("user_id", userId).maybeSingle();
    if (existing) {
      await supabase.from("post_favorites").delete().eq("id", existing.id);
      return false;
    }
    await supabase.from("post_favorites").insert({ post_id: postId, user_id: userId });
    return true;
  },

  async listFavorites(userId: string): Promise<PostWithAuthor[]> {
    const { data, error } = await withTimeout(
      supabase
        .from("post_favorites")
        .select("post:posts(*, author:users!posts_author_user_id_fkey(id, name, email, avatar_url))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    );
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as { post: PostWithAuthor | null }[])
      .map((row) => row.post)
      .filter((p): p is PostWithAuthor => Boolean(p));
  },
};
