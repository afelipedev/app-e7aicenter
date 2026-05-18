import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function ensureCaller(req: Request) {
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

async function genEvent(admin: ReturnType<typeof createClient>, origin: string): Promise<string> {
  const event_id = crypto.randomUUID();
  await admin.from("sync_event_ledger").insert({ event_id, origin });
  return event_id;
}

async function actionCreateCardFromPost(
  admin: ReturnType<typeof createClient>,
  profileId: string,
  payload: any,
) {
  const { post_id, board_id, column_id } = payload ?? {};
  if (!post_id || !board_id || !column_id) {
    throw new Error("post_id, board_id e column_id obrigatórios");
  }

  // Bloqueia se já existe link
  const { data: existing } = await admin.from("post_kanban_links")
    .select("id, card_id").eq("post_id", post_id).maybeSingle();
  if (existing?.card_id) throw new Error("Postagem já vinculada a um card");

  const { data: post, error: postErr } = await admin.from("posts")
    .select("title, description_json, description_text, channel_id").eq("id", post_id).single();
  if (postErr || !post) throw new Error("Postagem não encontrada");

  // Próximo card_number
  const { data: maxRow } = await admin.from("legal_kanban_cards")
    .select("card_number").eq("board_id", board_id)
    .order("card_number", { ascending: false }).limit(1).maybeSingle();
  const nextCard = ((maxRow?.card_number as number | undefined) ?? 0) + 1;

  // Próxima position na coluna
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
    card_number: nextCard,
    position: nextPos,
    status: "ativo",
    priority: "media",
    created_by_user_id: profileId,
    updated_by_user_id: profileId,
  }).select().single();
  if (cardErr) throw new Error(cardErr.message);

  const { data: link, error: linkErr } = await admin.from("post_kanban_links").upsert({
    post_id, card_id: card.id, board_id, column_id,
    link_direction: "bi", created_by_user_id: profileId,
  }, { onConflict: "post_id" }).select().single();
  if (linkErr) throw new Error(linkErr.message);

  await admin.from("post_activities").insert({
    post_id, actor_user_id: profileId, activity_type: "card_linked",
    metadata: { card_id: card.id, board_id, column_id, source_event_id: event_id },
    source_event_id: event_id,
  });
  await admin.from("legal_kanban_activities").insert({
    card_id: card.id, actor_user_id: profileId, activity_type: "created_from_post",
    metadata: { post_id, source_event_id: event_id },
  });
  await admin.from("audit_logs").insert({
    user_id: profileId, event_type: "teams.post.linked_to_card",
    event_data: { post_id, card_id: card.id, board_id, column_id },
  });

  return { card, link };
}

async function actionUnlink(admin: ReturnType<typeof createClient>, profileId: string, payload: any) {
  const { post_id } = payload ?? {};
  if (!post_id) throw new Error("post_id obrigatório");
  const { data: link } = await admin.from("post_kanban_links")
    .select("id, card_id").eq("post_id", post_id).maybeSingle();
  if (!link) return { unlinked: false };

  await admin.from("post_kanban_links").delete().eq("id", link.id);
  await admin.from("post_activities").insert({
    post_id, actor_user_id: profileId, activity_type: "card_unlinked",
    metadata: { card_id: link.card_id },
  });
  await admin.from("audit_logs").insert({
    user_id: profileId, event_type: "teams.post.unlinked_from_card",
    event_data: { post_id, card_id: link.card_id },
  });
  return { unlinked: true };
}

async function actionMirrorComment(
  admin: ReturnType<typeof createClient>,
  profileId: string,
  payload: any,
) {
  // direction: 'post_to_card' (mensagem virou comentário) ou 'card_to_post' (comentário virou mensagem)
  const { direction, post_id, card_id, content_text, content_json } = payload ?? {};
  if (!direction || !content_text) throw new Error("payload incompleto");

  const event_id = await genEvent(admin, `mirror_${direction}`);

  if (direction === "post_to_card") {
    if (!card_id) throw new Error("card_id obrigatório");
    const { data, error } = await admin.from("legal_kanban_comments").insert({
      card_id,
      author_user_id: profileId,
      content: content_text,
    }).select().single();
    if (error) throw new Error(error.message);
    await admin.from("legal_kanban_activities").insert({
      card_id, actor_user_id: profileId, activity_type: "comment_mirrored_from_post",
      metadata: { source_event_id: event_id, post_id },
    });
    return { mirrored: data };
  }

  if (direction === "card_to_post") {
    if (!post_id) throw new Error("post_id obrigatório");
    const { data, error } = await admin.from("post_messages").insert({
      post_id,
      author_user_id: profileId,
      content_json: content_json ?? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: content_text }] }] },
      content_text,
    }).select().single();
    if (error) throw new Error(error.message);
    await admin.from("post_activities").insert({
      post_id, actor_user_id: profileId, activity_type: "comment_mirrored_from_card",
      metadata: { source_event_id: event_id, card_id },
    });
    return { mirrored: data };
  }

  throw new Error("direction inválido");
}

const ACTIONS: Record<string, (admin: any, profileId: string, payload: any) => Promise<unknown>> = {
  create_card_from_post: actionCreateCardFromPost,
  unlink: actionUnlink,
  mirror_comment: actionMirrorComment,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405);

  try {
    const { admin, profileId } = await ensureCaller(req);
    const body = await req.json();
    const { action, payload } = body ?? {};
    if (!action) return jsonResponse({ error: "action obrigatório" }, 400);
    const handler = ACTIONS[action];
    if (!handler) return jsonResponse({ error: `action desconhecido: ${action}` }, 400);
    const data = await handler(admin, profileId, payload);
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
