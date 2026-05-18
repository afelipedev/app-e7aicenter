import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useCurrentProfileId() {
  return useQuery({
    queryKey: ["teams", "current-profile-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("users").select("id").eq("auth_user_id", user.id).maybeSingle();
      return data?.id ?? null;
    },
    staleTime: 5 * 60_000,
  });
}
