import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { teamsKeys } from "./useTeamsTree";
import { useCurrentProfileId } from "./useCurrentProfileId";
import type { NotificationRow } from "../types";

export function useNotifications() {
  const qc = useQueryClient();
  const { data: profileId } = useCurrentProfileId();
  const notifKey = teamsKeys.notifications(profileId);

  const query = useQuery<NotificationRow[]>({
    queryKey: notifKey,
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
        () => qc.invalidateQueries({ queryKey: notifKey }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profileId, qc, notifKey]);

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (error) throw new Error(error.message);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notifKey });
      const prev = qc.getQueryData<NotificationRow[]>(notifKey);
      const stamp = new Date().toISOString();
      qc.setQueryData<NotificationRow[]>(notifKey, (old) =>
        (old ?? []).map((n) => (n.read_at ? n : { ...n, read_at: stamp })),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(notifKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notifKey }),
  });

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.from("notifications")
        .update({ read_at: new Date().toISOString() }).eq("id", notificationId);
      if (error) throw new Error(error.message);
    },
    onMutate: async (notificationId) => {
      await qc.cancelQueries({ queryKey: notifKey });
      const prev = qc.getQueryData<NotificationRow[]>(notifKey);
      const stamp = new Date().toISOString();
      qc.setQueryData<NotificationRow[]>(notifKey, (old) =>
        (old ?? []).map((n) => (n.id === notificationId ? { ...n, read_at: stamp } : n)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(notifKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notifKey }),
  });

  const unread = (query.data ?? []).filter((n) => !n.read_at);
  return { ...query, notifications: query.data ?? [], unreadCount: unread.length, markAllRead, markRead };
}
