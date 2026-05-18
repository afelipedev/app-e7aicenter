import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GLOBAL_ADMIN_ROLES = ["administrator", "it", "advogado_adm"];
const MAX_MIRROR_TEXT = 20_000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type BridgeCtx = {
  admin: ReturnType<typeof createClient>;
  profileId: string;
  role: string;
};

async function ensureCaller(req: Request): Promise<BridgeCtx> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Não autorizado");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anon || !service) throw new Error("Config Supabase incompleta");

  const auth = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) throw new Error("Sessão inválida");

  const admin = createClient(supabaseUrl, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: profile } = await admin.from("users")
    .select("id, role, status").eq("auth_user_id", user.id).single();
  if (!profile || profile.status !== "ativo") throw new Error("Acesso negado");

  return { admin, profileId: profile.id, role: profile.role as string };
}

async function auditSafe(
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
  } catch (_) { /* não bloqueia fluxo principal */ }
}

async function assertCanReadChannel(
  admin: ReturnType<typeof createClient>,
  ctx: BridgeCtx,
  channelId: string,
) {
  if (GLOBAL_ADMIN_ROLES.includes(ctx.role)) return;
  const { data: ch, error } = await admin.from("channels")
    .select("id, team_id, visibility").eq("id", channelId).single();
  if (error || !ch) throw new Error("Canal não encontrado");

  const { data: tm } = await admin.from("team_members")
    .select("user_id").eq("team_id", ch.team_id).eq("user_id", ctx.profileId).maybeSingle();
  if (!tm) throw new Error("Acesso negado ao canal");

  if (ch.visibility === "public") return;

  const { data: cm } = await admin.from("channel_members")
    .select("user_id").eq("channel_id", channelId).eq("user_id", ctx.profileId).maybeSingle();
  if (!cm) throw new Error("Acesso negado ao canal");
}

async function assertCanEditBoard(
  admin: ReturnType<typeof createClient>,
  ctx: BridgeCtx,
  boardId: string,
) {
  if (GLOBAL_ADMIN_ROLES.includes(ctx.role)) return;
  const { data: m } = await admin.from("legal_kanban_board_members")
    .select("access_level").eq("board_id", boardId).eq("user_id", ctx.profileId).maybeSingle();
  if (!m || !["editor", "admin"].includes(m.access_level)) {
    throw new Error("Acesso negado ao quadro");
  }
}

async function genEvent(admin: ReturnType<typeof createClient>, origin: string): Promise<string> {
  const event_id = crypto.randomUUID();
  await admin.from("sync_event_ledger").insert({ event_id, origin });
  return event_id;
}

async function actionCreateCardFromPost(ctx: BridgeCtx, payload: Record<string, unknown>) {
  const admin = ctx.admin;
  const { post_id, board_id, column_id } = payload ?? {};
  if (!post_id || !board_id || !column_id || typeof post_id !== "string" ||
    typeof board_id !== "string" || typeof column_id !== "string") {
    throw new Error("post_id, board_id e column_id obrigatórios");
  }

  const { data: existing } = await admin.from("post_kanban_links")
    .select("id, card_id").eq("post_id", post_id).maybeSingle();
  if (existing?.card_id) throw new Error("Postagem já vinculada a um card");

  const { data: post, error: postErr } = await admin.from("posts")
    .select("title, description_json, description_text, channel_id").eq("id", post_id).single();
  if (postErr || !post) throw new Error("Postagem não encontrada");

  await assertCanReadChannel(admin, ctx, post.channel_id as string);
  await assertCanEditBoard(admin, ctx, board_id);

  const { data: col, error: colErr } = await admin.from("legal_kanban_columns")
    .select("board_id").eq("id", column_id).single();
  if (colErr || !col || col.board_id !== board_id) throw new Error("Coluna inválida para este quadro");

  const { data: maxPos } = await admin.from("legal_kanban_cards")
    .select("position").eq("column_id", column_id)
    .order("position", { ascending: false }).limit(1).maybeSingle();
  const nextPos = ((maxPos?.position as number | undefined) ?? 0) + 100;

  const event_id = await genEvent(admin, "post_to_card_create");

  const { data: card, error: cardErr } = await admin.from("legal_kanban_cards").insert({
    board_id,
    column_id,
    title: post.title,
    description_json: post.description_json ?? {},
    description_text: post.description_text ?? "",
    position: nextPos,
    status: "ativo",
    priority: "media",
    created_by_user_id: ctx.profileId,
    updated_by_user_id: ctx.profileId,
  }).select().single();
  if (cardErr) throw new Error(cardErr.message);

  const { data: link, error: linkErr } = await admin.from("post_kanban_links").upsert({
    post_id,
    card_id: card.id,
    board_id,
    column_id,
    link_direction: "bi",
    created_by_user_id: ctx.profileId,
  }, { onConflict: "post_id" }).select().single();
  if (linkErr) throw new Error(linkErr.message);

  await admin.from("post_activities").insert({
    post_id,
    actor_user_id: ctx.profileId,
    activity_type: "card_linked",
    metadata: { card_id: card.id, board_id, column_id, source_event_id: event_id },
    source_event_id: event_id,
  });
  await admin.from("legal_kanban_activities").insert({
    card_id: card.id,
    actor_user_id: ctx.profileId,
    activity_type: "created_from_post",
    message: "Card criado a partir de postagem no Teams.",
    metadata: { post_id, source_event_id: event_id },
  });
  await auditSafe(admin, ctx.profileId, "teams.post.linked_to_card", {
    post_id,
    card_id: card.id,
    board_id,
    column_id,
  });

  return { card, link };
}

async function actionUnlink(ctx: BridgeCtx, payload: Record<string, unknown>) {
  const admin = ctx.admin;
  const post_id = payload?.post_id;
  if (!post_id || typeof post_id !== "string") throw new Error("post_id obrigatório");

  const { data: post } = await admin.from("posts").select("channel_id").eq("id", post_id).maybeSingle();
  if (!post) throw new Error("Postagem não encontrada");
  await assertCanReadChannel(admin, ctx, post.channel_id as string);

  const { data: link } = await admin.from("post_kanban_links")
    .select("id, card_id, board_id").eq("post_id", post_id).maybeSingle();
  if (!link?.card_id) return { unlinked: false };

  let boardId = link.board_id as string | null;
  if (!boardId) {
    const { data: cardRow } = await admin.from("legal_kanban_cards")
      .select("board_id").eq("id", link.card_id).maybeSingle();
    boardId = cardRow?.board_id ?? null;
  }
  if (!boardId) throw new Error("Vínculo inválido: quadro obrigatório");
  await assertCanEditBoard(admin, ctx, boardId);

  await admin.from("post_kanban_links").delete().eq("id", link.id);
  await admin.from("post_activities").insert({
    post_id,
    actor_user_id: ctx.profileId,
    activity_type: "card_unlinked",
    metadata: { card_id: link.card_id },
  });
  await auditSafe(admin, ctx.profileId, "teams.post.unlinked_from_card", {
    post_id,
    card_id: link.card_id,
  });
  return { unlinked: true };
}

async function actionMirrorComment(ctx: BridgeCtx, payload: Record<string, unknown>) {
  const admin = ctx.admin;
  const direction = payload?.direction as string | undefined;
  let content_text = typeof payload?.content_text === "string" ? payload.content_text : "";
  if (content_text.length > MAX_MIRROR_TEXT) {
    content_text = content_text.slice(0, MAX_MIRROR_TEXT);
  }

  if (!direction || !content_text) throw new Error("payload incompleto");

  const event_id = await genEvent(admin, `mirror_${direction}`);

  if (direction === "post_to_card") {
    const card_id = payload?.card_id;
    if (!card_id || typeof card_id !== "string") throw new Error("card_id obrigatório");

    const { data: card, error: cErr } = await admin.from("legal_kanban_cards")
      .select("board_id").eq("id", card_id).single();
    if (cErr || !card) throw new Error("Card não encontrado");
    await assertCanEditBoard(admin, ctx, card.board_id as string);

    const { data, error } = await admin.from("legal_kanban_comments").insert({
      card_id,
      author_user_id: ctx.profileId,
      content: content_text,
    }).select().single();
    if (error) throw new Error(error.message);

    const post_id = typeof payload?.post_id === "string" ? payload.post_id : undefined;
    await admin.from("legal_kanban_activities").insert({
      card_id,
      actor_user_id: ctx.profileId,
      activity_type: "comment_mirrored_from_post",
      message: "Comentário espelhado a partir do Teams.",
      metadata: { source_event_id: event_id, post_id },
    });
    return { mirrored: data };
  }

  if (direction === "card_to_post") {
    const post_id = payload?.post_id;
    if (!post_id || typeof post_id !== "string") throw new Error("post_id obrigatório");

    const { data: post, error: pErr } = await admin.from("posts")
      .select("channel_id").eq("id", post_id).single();
    if (pErr || !post) throw new Error("Postagem não encontrada");
    await assertCanReadChannel(admin, ctx, post.channel_id as string);

    const content_json = payload?.content_json && typeof payload.content_json === "object"
      ? payload.content_json as Record<string, unknown>
      : { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: content_text }] }] };

    const { data, error } = await admin.from("post_messages").insert({
      post_id,
      author_user_id: ctx.profileId,
      content_json,
      content_text,
    }).select().single();
    if (error) throw new Error(error.message);

    const card_id = typeof payload?.card_id === "string" ? payload.card_id : undefined;
    await admin.from("post_activities").insert({
      post_id,
      actor_user_id: ctx.profileId,
      activity_type: "comment_mirrored_from_card",
      metadata: { source_event_id: event_id, card_id },
    });
    return { mirrored: data };
  }

  throw new Error("direction inválido");
}

const ACTIONS: Record<string, (ctx: BridgeCtx, payload: Record<string, unknown>) => Promise<unknown>> = {
  create_card_from_post: actionCreateCardFromPost,
  unlink: actionUnlink,
  mirror_comment: actionMirrorComment,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405);

  try {
    const ctx = await ensureCaller(req);
    const body = await req.json();
    const { action, payload } = body ?? {};
    if (!action || typeof action !== "string") return jsonResponse({ error: "action obrigatório" }, 400);
    const handler = ACTIONS[action];
    if (!handler) return jsonResponse({ error: `action desconhecido: ${action}` }, 400);
    const data = await handler(ctx, payload ?? {});
    return jsonResponse({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    const status = message.includes("Não autorizado") || message.includes("Sessão inválida") ? 401
      : message.includes("Acesso negado") ? 403
      : message.includes("obrigatório") || message.includes("inválido") || message.includes("desconhecido") ? 400
      : 500;
    return jsonResponse({ error: message }, status);
  }
});
