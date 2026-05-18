import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GLOBAL_ADMIN_ROLES = ["administrator", "it", "advogado_adm"];

type Ctx = {
  admin: ReturnType<typeof createClient>;
  profileId: string;
  role: string;
};

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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `canal-${Date.now()}`;
}

async function ensureCaller(req: Request): Promise<Ctx> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Não autorizado");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anon || !service) throw new Error("Config Supabase incompleta");

  const auth = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) throw new Error("Sessão inválida");

  const admin = createClient(supabaseUrl, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile } = await admin.from("users")
    .select("id, role, status").eq("auth_user_id", user.id).single();
  if (!profile || profile.status !== "ativo") throw new Error("Acesso negado");
  return { admin, profileId: profile.id, role: profile.role as string };
}

async function getTeamRole(ctx: Ctx, teamId: string): Promise<string | null> {
  if (GLOBAL_ADMIN_ROLES.includes(ctx.role)) return "global_admin";
  const { data } = await ctx.admin.from("team_members")
    .select("role").eq("team_id", teamId).eq("user_id", ctx.profileId).maybeSingle();
  return data?.role ?? null;
}

async function requireTeamAdmin(ctx: Ctx, teamId: string) {
  const role = await getTeamRole(ctx, teamId);
  if (!role || !["owner", "admin", "global_admin"].includes(role)) {
    throw new Error("Acesso negado: requer owner/admin da equipe");
  }
}

async function getChannelTeamId(ctx: Ctx, channelId: string): Promise<string> {
  const { data, error } = await ctx.admin.from("channels")
    .select("team_id").eq("id", channelId).single();
  if (error || !data) throw new Error("Canal não encontrado");
  return data.team_id as string;
}

async function logAudit(ctx: Ctx, eventType: string, eventData: Record<string, unknown>) {
  try {
    await ctx.admin.from("audit_logs").insert({
      user_id: ctx.profileId,
      event_type: eventType,
      event_data: eventData,
    });
  } catch (_) { /* ignore */ }
}

// ----- Actions -----

async function createChannel(ctx: Ctx, payload: any) {
  const { team_id, name, topic, visibility } = payload ?? {};
  if (!team_id || !name) throw new Error("team_id e name obrigatórios");
  await requireTeamAdmin(ctx, team_id);

  let slug = slugify(name);
  const { data: collision } = await ctx.admin.from("channels")
    .select("id").eq("team_id", team_id).eq("slug", slug).maybeSingle();
  if (collision) slug = `${slug}-${Math.floor(Math.random() * 1000)}`;

  const { data: maxPos } = await ctx.admin.from("channels")
    .select("position").eq("team_id", team_id).order("position", { ascending: false }).limit(1).maybeSingle();
  const nextPos = ((maxPos?.position as number | undefined) ?? 100) + 100;

  const { data, error } = await ctx.admin.from("channels").insert({
    team_id,
    name,
    slug,
    topic: topic ?? null,
    visibility: visibility === "private" ? "private" : "public",
    is_general: false,
    position: nextPos,
    created_by_user_id: ctx.profileId,
  }).select().single();
  if (error) throw new Error(error.message);

  await logAudit(ctx, "teams.channel.created", { channel_id: data.id, team_id, slug });
  return { channel: data };
}

async function updateChannel(ctx: Ctx, payload: any) {
  const { channel_id, name, topic, visibility, position, is_archived } = payload ?? {};
  if (!channel_id) throw new Error("channel_id obrigatório");
  const teamId = await getChannelTeamId(ctx, channel_id);
  await requireTeamAdmin(ctx, teamId);

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (topic !== undefined) updates.topic = topic;
  if (visibility !== undefined) updates.visibility = visibility === "private" ? "private" : "public";
  if (position !== undefined) updates.position = position;
  if (is_archived !== undefined) updates.is_archived = !!is_archived;

  const { data, error } = await ctx.admin.from("channels")
    .update(updates).eq("id", channel_id).select().single();
  if (error) throw new Error(error.message);

  await logAudit(ctx, "teams.channel.updated", { channel_id, updates });
  return { channel: data };
}

async function deleteChannel(ctx: Ctx, payload: any) {
  const { channel_id } = payload ?? {};
  if (!channel_id) throw new Error("channel_id obrigatório");
  const teamId = await getChannelTeamId(ctx, channel_id);
  await requireTeamAdmin(ctx, teamId);

  const { data: ch } = await ctx.admin.from("channels")
    .select("is_general").eq("id", channel_id).single();
  if (ch?.is_general) throw new Error("Canal Geral não pode ser excluído");

  const { error } = await ctx.admin.from("channels").delete().eq("id", channel_id);
  if (error) throw new Error(error.message);

  await logAudit(ctx, "teams.channel.deleted", { channel_id });
  return { deleted: true };
}

async function addChannelMember(ctx: Ctx, payload: any) {
  const { channel_id, user_id, role } = payload ?? {};
  if (!channel_id || !user_id) throw new Error("channel_id e user_id obrigatórios");
  const teamId = await getChannelTeamId(ctx, channel_id);
  await requireTeamAdmin(ctx, teamId);

  // Usuário precisa ser membro da equipe para entrar no canal
  const { data: teamMember } = await ctx.admin.from("team_members")
    .select("id").eq("team_id", teamId).eq("user_id", user_id).maybeSingle();
  if (!teamMember) throw new Error("Usuário não é membro da equipe");

  const safeRole = role === "admin" ? "admin" : "member";
  const { data, error } = await ctx.admin.from("channel_members").upsert({
    channel_id, user_id, role: safeRole,
  }, { onConflict: "channel_id,user_id" }).select().single();
  if (error) throw new Error(error.message);

  await logAudit(ctx, "teams.channel.member_added", { channel_id, user_id, role: safeRole });
  return { member: data };
}

async function removeChannelMember(ctx: Ctx, payload: any) {
  const { channel_id, user_id } = payload ?? {};
  if (!channel_id || !user_id) throw new Error("channel_id e user_id obrigatórios");
  const teamId = await getChannelTeamId(ctx, channel_id);
  await requireTeamAdmin(ctx, teamId);

  const { error } = await ctx.admin.from("channel_members").delete()
    .eq("channel_id", channel_id).eq("user_id", user_id);
  if (error) throw new Error(error.message);

  await logAudit(ctx, "teams.channel.member_removed", { channel_id, user_id });
  return { removed: true };
}

async function reorderChannels(ctx: Ctx, payload: any) {
  const { team_id, order } = payload ?? {};
  if (!team_id || !Array.isArray(order)) throw new Error("team_id e order obrigatórios");
  await requireTeamAdmin(ctx, team_id);

  let pos = 100;
  for (const channelId of order) {
    pos += 100;
    const { error } = await ctx.admin.from("channels")
      .update({ position: pos }).eq("id", channelId).eq("team_id", team_id);
    if (error) throw new Error(error.message);
  }
  return { reordered: true };
}

const ACTIONS: Record<string, (ctx: Ctx, payload: any) => Promise<unknown>> = {
  create_channel: createChannel,
  update_channel: updateChannel,
  delete_channel: deleteChannel,
  add_member: addChannelMember,
  remove_member: removeChannelMember,
  reorder_channels: reorderChannels,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405);

  try {
    const ctx = await ensureCaller(req);
    const body = await req.json();
    const { action, payload } = body ?? {};
    if (!action) return jsonResponse({ error: "action obrigatório" }, 400);
    const handler = ACTIONS[action];
    if (!handler) return jsonResponse({ error: `action desconhecido: ${action}` }, 400);
    const data = await handler(ctx, payload);
    return jsonResponse({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    const status = message.includes("Não autorizado") || message.includes("Sessão inválida") ? 401
      : message.includes("Acesso negado") ? 403
      : message.includes("obrigatório") || message.includes("inválido") || message.includes("desconhecido")
        || message.includes("não pode") || message.includes("não é membro") ? 400
      : 500;
    return jsonResponse({ error: message }, status);
  }
});
