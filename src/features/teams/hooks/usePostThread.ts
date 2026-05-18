import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { postService } from "../services/postService";
import { messageService } from "../services/messageService";
import type { PostMessageWithAuthor } from "../types";
import { teamsKeys } from "./useTeamsTree";

export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: teamsKeys.post(postId ?? ""),
    queryFn: () => postService.getById(postId!),
    enabled: !!postId,
    staleTime: 30_000,
  });
}

export function usePostMessages(postId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery<PostMessageWithAuthor[]>({
    queryKey: teamsKeys.messages(postId ?? ""),
    queryFn: () => messageService.listByPost(postId!),
    enabled: !!postId,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!postId) return;
    const channel = supabase
      .channel(`post:${postId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "post_messages", filter: `post_id=eq.${postId}` },
        () => setTimeout(() => qc.invalidateQueries({ queryKey: teamsKeys.messages(postId) }), 100),
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "post_messages", filter: `post_id=eq.${postId}` },
        () => qc.invalidateQueries({ queryKey: teamsKeys.messages(postId) }),
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => qc.invalidateQueries({ queryKey: teamsKeys.messages(postId) }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId, qc]);

  const messages = useMemo(() => query.data ?? [], [query.data]);

  const refetch = useCallback(() => {
    if (postId) qc.invalidateQueries({ queryKey: teamsKeys.messages(postId) });
  }, [postId, qc]);

  return { ...query, messages, refetch };
}
