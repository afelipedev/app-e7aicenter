import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GLOBAL_ADMIN_ROLES = ["administrator", "it", "advogado_adm"];

type AuthContext = {
  admin: ReturnType<typeof createClient>;
  callerAuthUserId: string;
  callerProfileId: string;
  callerRole: string;
};

async function ensureCaller(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Não autorizado");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error("Configuração do Supabase incompleta");
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) throw new Error("Sessão inválida");

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error: profileErr } = await admin
    .from("users")
    .select("id, role, status")
    .eq("auth_user_id", user.id)
    .single();
  if (profileErr || !profile) throw new Error("Perfil não encontrado");
  if (profile.status !== "ativo") throw new Error("Acesso negado: usuário inativo");

  return { admin, callerAuthUserId: user.id, callerProfileId: profile.id, callerRole: profile.role };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `team-${Date.now()}`;
}

async function logAudit(
  admin: ReturnType<typeof createClient>,
  userId: string | null,
  eventType: string,
  eventData: Record<string, unknown>,
) {
  try {
    await admin.from("audit_logs").insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
    });
  } catch (_) { /* swallow */ }
}

async function logTeamActivity(
  admin: ReturnType<typeof createClient>,
  teamId: string,
  actorId: string | null,
  activityType: string,
  message: string | null,
  metadata: Record<string, unknown>,
) {
  await admin.from("team_activities").insert({
    team_id: teamId,
    actor_user_id: actorId,
    activity_type: activityType,
    message,
    metadata,
  });
}

function requireGlobalAdmin(ctx: AuthContext) {
  if (!GLOBAL_ADMIN_ROLES.includes(ctx.callerRole)) {
    throw new Error("Acesso negado: requer administrator/it/advogado_adm");
  }
}

async function requireTeamAdmin(admin: ReturnType<typeof createClient>, teamId: string, callerProfileId: string, callerRole: string) {
  if (GLOBAL_ADMIN_ROLES.includes(callerRole)) return;
  const { data, error } = await admin
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", callerProfileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !["owner", "admin"].includes(data.role)) {
    throw new Error("Acesso negado: requer owner/admin da equipe");
  }
}

// =========================================================================
// ACTIONS
// =========================================================================

async function actionCreateTeam(ctx: AuthContext, payload: any) {
  requireGlobalAdmin(ctx);
  const { name, description, icon, visibility, initial_members } = payload ?? {};
  if (!name || typeof name !== "string") throw new Error("name obrigatório");

  let slug = slugify(name);
  const { data: collision } = await ctx.admin.from("teams").select("id").eq("slug", slug).maybeSingle();
  if (collision) slug = `${slug}-${Math.floor(Math.random() * 1000)}`;

  const { data: team, error } = await ctx.admin.from("teams").insert({
    name,
    slug,
    description: description ?? null,
    icon: icon ?? null,
    visibility: visibility === "public" ? "public" : "private",
    created_by_user_id: ctx.callerProfileId,
  }).select().single();
  if (error) throw new Error(error.message);

  // Canal Geral
  const { data: generalChannel, error: chanErr } = await ctx.admin.from("channels").insert({
    team_id: team.id,
    name: "Geral",
    slug: "geral",
    topic: "Canal padrão da equipe",
    visibility: "public",
    is_general: true,
    position: 100,
    created_by_user_id: ctx.callerProfileId,
  }).select().single();
  if (chanErr) throw new Error(chanErr.message);

  // Criador entra como owner
  await ctx.admin.from("team_members").insert({
    team_id: team.id,
    user_id: ctx.callerProfileId,
    role: "owner",
    invited_by_user_id: ctx.callerProfileId,
  });

  // Membros iniciais (opcional)
  if (Array.isArray(initial_members) && initial_members.length) {
    const rows = initial_members
      .filter((uid: string) => uid && uid !== ctx.callerProfileId)
      .map((user_id: string) => ({
        team_id: team.id,
        user_id,
        role: "member",
        invited_by_user_id: ctx.callerProfileId,
      }));
    if (rows.length) {
      const { error: memErr } = await ctx.admin.from("team_members").insert(rows);
      if (memErr) throw new Error(memErr.message);
    }
  }

  await logTeamActivity(ctx.admin, team.id, ctx.callerProfileId, "team_created", `Equipe ${name} criada`, { slug });
  await logAudit(ctx.admin, ctx.callerProfileId, "teams.team.created", { team_id: team.id, slug });

  return { team, general_channel: generalChannel };
}

async function actionUpdateTeam(ctx: AuthContext, payload: any) {
  const { team_id, name, description, icon, visibility, is_archived } = payload ?? {};
  if (!team_id) throw new Error("team_id obrigatório");
  await requireTeamAdmin(ctx.admin, team_id, ctx.callerProfileId, ctx.callerRole);

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (icon !== undefined) updates.icon = icon;
  if (visibility !== undefined) updates.visibility = visibility === "public" ? "public" : "private";
  if (is_archived !== undefined) updates.is_archived = !!is_archived;

  const { data, error } = await ctx.admin.from("teams").update(updates).eq("id", team_id).select().single();
  if (error) throw new Error(error.message);

  await logTeamActivity(ctx.admin, team_id, ctx.callerProfileId, "team_updated", null, updates);
  await logAudit(ctx.admin, ctx.callerProfileId, "teams.team.updated", { team_id, updates });

  return { team: data };
}

async function actionDeleteTeam(ctx: AuthContext, payload: any) {
  requireGlobalAdmin(ctx);
  const { team_id } = payload ?? {};
  if (!team_id) throw new Error("team_id obrigatório");

  const { error } = await ctx.admin.from("teams").delete().eq("id", team_id);
  if (error) throw new Error(error.message);

  await logAudit(ctx.admin, ctx.callerProfileId, "teams.team.deleted", { team_id });
  return { deleted: true };
}

async function actionAddMember(ctx: AuthContext, payload: any) {
  const { team_id, user_id, role } = payload ?? {};
  if (!team_id || !user_id) throw new Error("team_id e user_id obrigatórios");
  await requireTeamAdmin(ctx.admin, team_id, ctx.callerProfileId, ctx.callerRole);

  const safeRole = ["owner", "admin", "member"].includes(role) ? role : "member";

  const { data, error } = await ctx.admin.from("team_members").upsert({
    team_id,
    user_id,
    role: safeRole,
    invited_by_user_id: ctx.callerProfileId,
  }, { onConflict: "team_id,user_id" }).select().single();
  if (error) throw new Error(error.message);

  await ctx.admin.from("notifications").insert({
    user_id,
    kind: "team_invite",
    payload: { team_id, role: safeRole, invited_by: ctx.callerProfileId },
  });
  await logTeamActivity(ctx.admin, team_id, ctx.callerProfileId, "member_added", null, { user_id, role: safeRole });
  await logAudit(ctx.admin, ctx.callerProfileId, "teams.team.member_added", { team_id, user_id, role: safeRole });

  return { member: data };
}

async function actionRemoveMember(ctx: AuthContext, payload: any) {
  const { team_id, user_id } = payload ?? {};
  if (!team_id || !user_id) throw new Error("team_id e user_id obrigatórios");
  await requireTeamAdmin(ctx.admin, team_id, ctx.callerProfileId, ctx.callerRole);

  const { error } = await ctx.admin.from("team_members").delete()
    .eq("team_id", team_id).eq("user_id", user_id);
  if (error) throw new Error(error.message);

  await logTeamActivity(ctx.admin, team_id, ctx.callerProfileId, "member_removed", null, { user_id });
  await logAudit(ctx.admin, ctx.callerProfileId, "teams.team.member_removed", { team_id, user_id });
  return { removed: true };
}

async function actionUpdateMemberRole(ctx: AuthContext, payload: any) {
  const { team_id, user_id, role } = payload ?? {};
  if (!team_id || !user_id || !role) throw new Error("team_id, user_id, role obrigatórios");
  if (!["owner", "admin", "member"].includes(role)) throw new Error("role inválido");

  // somente owner ou global admin pode alterar role
  if (!GLOBAL_ADMIN_ROLES.includes(ctx.callerRole)) {
    const { data } = await ctx.admin.from("team_members").select("role")
      .eq("team_id", team_id).eq("user_id", ctx.callerProfileId).maybeSingle();
    if (!data || data.role !== "owner") {
      throw new Error("Acesso negado: somente owner pode alterar roles");
    }
  }

  const { data, error } = await ctx.admin.from("team_members").update({ role })
    .eq("team_id", team_id).eq("user_id", user_id).select().single();
  if (error) throw new Error(error.message);

  await logTeamActivity(ctx.admin, team_id, ctx.callerProfileId, "member_role_changed", null, { user_id, role });
  await logAudit(ctx.admin, ctx.callerProfileId, "teams.team.member_role_changed", { team_id, user_id, role });
  return { member: data };
}

// =========================================================================
// HANDLER
// =========================================================================

const ACTIONS: Record<string, (ctx: AuthContext, payload: any) => Promise<unknown>> = {
  create_team: actionCreateTeam,
  update_team: actionUpdateTeam,
  delete_team: actionDeleteTeam,
  add_member: actionAddMember,
  remove_member: actionRemoveMember,
  update_member_role: actionUpdateMemberRole,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405);

  try {
    const ctx = await ensureCaller(req);
    const body = await req.json();
    const { action, payload } = body ?? {};
    if (!action || typeof action !== "string") {
      return jsonResponse({ error: "action obrigatório" }, 400);
    }
    const handler = ACTIONS[action];
    if (!handler) return jsonResponse({ error: `action desconhecido: ${action}` }, 400);

    const data = await handler(ctx, payload);
    return jsonResponse({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    const status = message.includes("Não autorizado") || message.includes("Sessão inválida")
      ? 401
      : message.includes("Acesso negado")
        ? 403
        : message.includes("obrigatório") || message.includes("inválido") || message.includes("desconhecido")
          ? 400
          : 500;
    return jsonResponse({ error: message }, status);
  }
});
