import { supabase } from "@/lib/supabase";
import type { Team, TeamMember, TeamMemberWithUser, TeamsTreeNode, Channel, TeamMemberRole } from "../types";

const TIMEOUT_MS = 15000;

function withTimeout<T>(promise: PromiseLike<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Tempo esgotado")), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v as T); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

async function invokeAdmin(action: string, payload: Record<string, unknown>) {
  const { data, error } = await withTimeout(
    supabase.functions.invoke("teams-admin-mutate", { body: { action, payload } }),
  );
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Erro desconhecido");
  return data?.data;
}

export const teamService = {
  async listMyTeamsTree(): Promise<TeamsTreeNode[]> {
    const { data: teams, error } = await withTimeout(
      supabase
        .from("teams")
        .select("*")
        .eq("is_archived", false)
        .order("name", { ascending: true }),
    );
    if (error) throw new Error(error.message);
    if (!teams?.length) return [];

    const teamIds = (teams as Team[]).map((t) => t.id);
    const [channelsRes, memberRes] = await Promise.all([
      withTimeout(
        supabase
          .from("channels")
          .select("*")
          .in("team_id", teamIds)
          .eq("is_archived", false)
          .order("is_general", { ascending: false })
          .order("position", { ascending: true })
          .order("name", { ascending: true }),
      ),
      withTimeout(
        supabase
          .from("team_members")
          .select("team_id, role, user_id")
          .in("team_id", teamIds),
      ),
    ]);
    if (channelsRes.error) throw new Error(channelsRes.error.message);
    if (memberRes.error) throw new Error(memberRes.error.message);

    const { data: { user } } = await supabase.auth.getUser();
    let myProfileId: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from("users").select("id").eq("auth_user_id", user.id).maybeSingle();
      myProfileId = profile?.id ?? null;
    }

    const channelsByTeam = new Map<string, Channel[]>();
    for (const c of (channelsRes.data ?? []) as Channel[]) {
      if (!channelsByTeam.has(c.team_id)) channelsByTeam.set(c.team_id, []);
      channelsByTeam.get(c.team_id)!.push(c);
    }
    const myRoleByTeam = new Map<string, TeamMemberRole>();
    for (const m of (memberRes.data ?? []) as TeamMember[]) {
      if (m.user_id === myProfileId) myRoleByTeam.set(m.team_id, m.role);
    }

    return (teams as Team[]).map((t) => ({
      ...t,
      channels: channelsByTeam.get(t.id) ?? [],
      member_role: myRoleByTeam.get(t.id) ?? null,
    }));
  },

  async getTeamBySlug(slug: string): Promise<Team | null> {
    const { data, error } = await withTimeout(
      supabase.from("teams").select("*").eq("slug", slug).maybeSingle(),
    );
    if (error) throw new Error(error.message);
    return data as Team | null;
  },

  async listTeamMembers(teamId: string): Promise<TeamMemberWithUser[]> {
    const { data, error } = await withTimeout(
      supabase
        .from("team_members")
        .select("*, user:users!team_members_user_id_fkey(id, name, email)")
        .eq("team_id", teamId),
    );
    if (error) throw new Error(error.message);
    return (data ?? []) as TeamMemberWithUser[];
  },

  // Mutations (Edge Function)
  createTeam(input: { name: string; description?: string; icon?: string; visibility?: "public" | "private"; initial_members?: string[] }) {
    return invokeAdmin("create_team", input);
  },
  updateTeam(input: { team_id: string; name?: string; description?: string; icon?: string; visibility?: "public" | "private"; is_archived?: boolean }) {
    return invokeAdmin("update_team", input);
  },
  deleteTeam(team_id: string) {
    return invokeAdmin("delete_team", { team_id });
  },
  addMember(input: { team_id: string; user_id: string; role?: TeamMemberRole }) {
    return invokeAdmin("add_member", input);
  },
  removeMember(input: { team_id: string; user_id: string }) {
    return invokeAdmin("remove_member", input);
  },
  updateMemberRole(input: { team_id: string; user_id: string; role: TeamMemberRole }) {
    return invokeAdmin("update_member_role", input);
  },
};
