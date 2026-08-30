import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

/** Impede que o cache do React Query vaze de um usuário para o outro na mesma aba. */
export function ClearQueryCacheOnAuthChange() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const previousUserId = useRef<string | undefined>(undefined);

  useEffect(() => {
    const nextId = user?.id;
    if (previousUserId.current && !nextId) {
      queryClient.clear();
    }
    previousUserId.current = nextId;
  }, [queryClient, user?.id]);

  return null;
}
