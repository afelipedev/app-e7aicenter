import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { teamsKeys } from "./useTeamsTree";
import { useCurrentProfileId } from "./useCurrentProfileId";
import type { NotificationRow } from "../types";

export function useNotifications() {
  const qc = useQueryClient();
  const { data: profileId } = useCurrentProfileId();

  const query = useQuery<NotificationRow[]>({
    queryKey: teamsKeys.notifications(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications").select("*")
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as NotificationRow[];
    },
    enabled: !!profileId,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!profileId) return;
    const channel = supabase
      .channel(`notifications:${profileId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profileId}` },
        () => qc.invalidateQueries({ queryKey: teamsKeys.notifications() }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profileId, qc]);

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamsKeys.notifications() }),
  });

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.from("notifications")
        .update({ read_at: new Date().toISOString() }).eq("id", notificationId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamsKeys.notifications() }),
  });

  const unread = (query.data ?? []).filter((n) => !n.read_at);
  return { ...query, notifications: query.data ?? [], unreadCount: unread.length, markAllRead, markRead };
}
