import { supabase } from "@/lib/supabase";
import type { Channel, ChannelVisibility, ChannelMemberRole } from "../types";

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

async function invokeChannelMutate(action: string, payload: Record<string, unknown>) {
  const { data, error } = await withTimeout(
    supabase.functions.invoke("teams-channel-mutate", { body: { action, payload } }),
  );
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Erro");
  return data?.data;
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
    const result = await invokeChannelMutate("create_channel", input);
    return (result as { channel: Channel }).channel;
  },

  async updateChannel(channelId: string, patch: Partial<Pick<Channel, "name" | "topic" | "visibility" | "position" | "is_archived">>): Promise<Channel> {
    const result = await invokeChannelMutate("update_channel", { channel_id: channelId, ...patch });
    return (result as { channel: Channel }).channel;
  },

  async deleteChannel(channelId: string): Promise<void> {
    await invokeChannelMutate("delete_channel", { channel_id: channelId });
  },

  async addChannelMember(input: { channel_id: string; user_id: string; role?: ChannelMemberRole }) {
    return invokeChannelMutate("add_member", input);
  },

  async removeChannelMember(input: { channel_id: string; user_id: string }) {
    return invokeChannelMutate("remove_member", input);
  },

  async reorderChannels(input: { team_id: string; order: string[] }) {
    return invokeChannelMutate("reorder_channels", input);
  },

  async markChannelRead(channelId: string, userId: string): Promise<void> {
    await supabase.from("channel_read_state").upsert({
      channel_id: channelId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    }, { onConflict: "user_id,channel_id" });
  },
};
