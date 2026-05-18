import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { teamService } from "../services/teamService";

export const teamsKeys = {
  all: ["teams"] as const,
  tree: () => [...teamsKeys.all, "tree"] as const,
  team: (id: string) => [...teamsKeys.all, "team", id] as const,
  members: (teamId: string) => [...teamsKeys.all, "members", teamId] as const,
  channel: (channelId: string) => [...teamsKeys.all, "channel", channelId] as const,
  posts: (channelId: string) => [...teamsKeys.all, "posts", channelId] as const,
  post: (postId: string) => [...teamsKeys.all, "post", postId] as const,
  messages: (postId: string) => [...teamsKeys.all, "messages", postId] as const,
  notifications: () => [...teamsKeys.all, "notifications"] as const,
  favorites: () => [...teamsKeys.all, "favorites"] as const,
};

export function useTeamsTree() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: teamsKeys.tree(),
    queryFn: () => teamService.listMyTeamsTree(),
    staleTime: 60_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("teams_tree_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" },
        () => qc.invalidateQueries({ queryKey: teamsKeys.tree() }))
      .on("postgres_changes", { event: "*", schema: "public", table: "channels" },
        () => qc.invalidateQueries({ queryKey: teamsKeys.tree() }))
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" },
        () => qc.invalidateQueries({ queryKey: teamsKeys.tree() }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return query;
}
