import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { channelService } from "../services/channelService";
import { postService } from "../services/postService";
import { teamsKeys } from "./useTeamsTree";

export function useChannelBySlug(teamId: string | undefined, channelSlug: string | undefined) {
  return useQuery({
    queryKey: ["teams", "channel-by-slug", teamId, channelSlug],
    queryFn: () => channelService.getChannelBySlug(teamId!, channelSlug!),
    enabled: !!teamId && !!channelSlug,
    staleTime: 60_000,
  });
}

export function useChannelPosts(channelId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: teamsKeys.posts(channelId ?? ""),
    queryFn: () => postService.listByChannel(channelId!),
    enabled: !!channelId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!channelId) return;
    const channel = supabase
      .channel(`channel_posts:${channelId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `channel_id=eq.${channelId}` },
        () => qc.invalidateQueries({ queryKey: teamsKeys.posts(channelId) }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channelId, qc]);

  return query;
}
