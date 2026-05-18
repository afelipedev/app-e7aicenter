import { supabase } from "@/lib/supabase";
import type { Channel, ChannelVisibility } from "../types";
import { slugify } from "../utils";

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

export const channelService = {
  async getChannelBySlug(teamId: string, slug: string): Promise<Channel | null> {
    const { data, error } = await withTimeout(
      supabase.from("channels").select("*").eq("team_id", teamId).eq("slug", slug).maybeSingle(),
    );
    if (error) throw new Error(error.message);
    return data as Channel | null;
  },

  async listByTeam(teamId: string): Promise<Channel[]> {
    const { data, error } = await withTimeout(
      supabase.from("channels").select("*").eq("team_id", teamId).eq("is_archived", false)
        .order("is_general", { ascending: false })
        .order("position", { ascending: true })
        .order("name", { ascending: true }),
    );
    if (error) throw new Error(error.message);
    return (data ?? []) as Channel[];
  },

  async createChannel(input: { team_id: string; name: string; topic?: string; visibility?: ChannelVisibility }): Promise<Channel> {
    const slug = slugify(input.name) || `canal-${Date.now()}`;
    const { data, error } = await withTimeout(
      supabase.from("channels").insert({
        team_id: input.team_id,
        name: input.name,
        slug,
        topic: input.topic ?? null,
        visibility: input.visibility ?? "public",
        position: 200,
      }).select().single(),
    );
    if (error) throw new Error(error.message);
    return data as Channel;
  },

  async updateChannel(channelId: string, patch: Partial<Pick<Channel, "name" | "topic" | "visibility" | "position" | "is_archived">>): Promise<Channel> {
    const { data, error } = await withTimeout(
      supabase.from("channels").update(patch).eq("id", channelId).select().single(),
    );
    if (error) throw new Error(error.message);
    return data as Channel;
  },

  async markChannelRead(channelId: string, userId: string): Promise<void> {
    await supabase.from("channel_read_state").upsert({
      channel_id: channelId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    }, { onConflict: "user_id,channel_id" });
  },
};
