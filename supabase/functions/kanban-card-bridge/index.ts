import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GLOBAL_ADMIN_ROLES = ["administrator", "it", "advogado_adm"];

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

async function copyCardRelations(
  admin: ReturnType<typeof createClient>,
  sourceCardId: string,
  targetCardId: string,
  targetBoardId: string,
) {
  const { data: members } = await admin.from("legal_kanban_card_members")
    .select("user_id").eq("card_id", sourceCardId);
  if (members?.length) {
    await admin.from("legal_kanban_card_members").insert(
      members.map((m) => ({ card_id: targetCardId, user_id: m.user_id })),
    );
  }

  const { data: cardLabels } = await admin.from("legal_kanban_card_labels")
    .select("label_id, label:legal_kanban_labels(name, color, position)")
    .eq("card_id", sourceCardId);

  for (const row of cardLabels || []) {
    const label = Array.isArray(row.label) ? row.label[0] : row.label;
    if (!label) continue;

    let { data: peerLabel } = await admin.from("legal_kanban_labels")
      .select("id").eq("board_id", targetBoardId)
      .eq("name", label.name).eq("color", label.color).maybeSingle();

    if (!peerLabel) {
      const { data: created } = await admin.from("legal_kanban_labels").insert({
        board_id: targetBoardId,
        name: label.name,
        color: label.color,
        position: label.position,
      }).select("id").single();
      peerLabel = created;
    }

    if (peerLabel?.id) {
      await admin.from("legal_kanban_card_labels").upsert({
        card_id: targetCardId,
        label_id: peerLabel.id,
      });
    }
  }

  const { data: checklists } = await admin.from("legal_kanban_checklists")
    .select("id, title, position, items:legal_kanban_checklist_items(*)")
    .eq("card_id", sourceCardId);

  for (const checklist of checklists || []) {
    const { data: newChecklist } = await admin.from("legal_kanban_checklists").insert({
      card_id: targetCardId,
      title: checklist.title,
      position: checklist.position,
    }).select("id").single();

    if (!newChecklist?.id) continue;

    const items = Array.isArray(checklist.items) ? checklist.items : [];
    if (items.length) {
      await admin.from("legal_kanban_checklist_items").insert(
        items.map((item: { content: string; position: number; is_completed: boolean; completed_at: string | null; completed_by_user_id: string | null }) => ({
          checklist_id: newChecklist.id,
          content: item.content,
          position: item.position,
          is_completed: item.is_completed,
          completed_at: item.completed_at,
          completed_by_user_id: item.completed_by_user_id,
        })),
      );
    }
  }

  const { data: attachments } = await admin.from("legal_kanban_attachments")
    .select("*").eq("card_id", sourceCardId);
  if (attachments?.length) {
    const mapped = attachments.map((att) => ({
      card_id: targetCardId,
      attachment_type: att.attachment_type,
      name: att.name,
      file_path: att.file_path,
      file_size: att.file_size,
      mime_type: att.mime_type,
      url: att.url,
      created_by_user_id: att.created_by_user_id,
    }));

    // ignoreDuplicates evita gravar em dobro caso a operação seja reprocessada
    // (índices únicos: card_id+file_path para arquivos, card_id+url para links).
    const fileRows = mapped.filter((att) => att.attachment_type === "file" && att.file_path);
    const linkRows = mapped.filter((att) => att.attachment_type === "link" && att.url);

    if (fileRows.length) {
      await admin.from("legal_kanban_attachments")
        .upsert(fileRows, { onConflict: "card_id,file_path", ignoreDuplicates: true });
    }
    if (linkRows.length) {
      await admin.from("legal_kanban_attachments")
        .upsert(linkRows, { onConflict: "card_id,url", ignoreDuplicates: true });
    }
  }

  const { data: comments } = await admin.from("legal_kanban_comments")
    .select("*").eq("card_id", sourceCardId);
  for (const comment of comments || []) {
    const mirrorGroupId = (comment.mirror_group_id as string | null) ?? (comment.id as string);

    if (!comment.mirror_group_id) {
      await admin.from("legal_kanban_comments")
        .update({ mirror_group_id: mirrorGroupId }).eq("id", comment.id);
    }

    await admin.from("legal_kanban_comments").insert({
      card_id: targetCardId,
      author_user_id: comment.author_user_id,
      content: comment.content,
      mirrored_card_comment_id: comment.id,
      mirror_group_id: mirrorGroupId,
    });
  }
}

// Cria o card cópia com os mesmos campos core do card origem, no fim da raia destino.
async function insertMirrorCard(
  admin: ReturnType<typeof createClient>,
  sourceCard: Record<string, unknown>,
  targetBoardId: string,
  targetColumnId: string,
  actorId: string,
) {
  const { data: maxPos } = await admin.from("legal_kanban_cards")
    .select("position").eq("column_id", targetColumnId)
    .order("position", { ascending: false }).limit(1).maybeSingle();
  const nextPos = ((maxPos?.position as number | undefined) ?? 0) + 100;

  const { data: mirrorCard, error } = await admin.from("legal_kanban_cards").insert({
    board_id: targetBoardId,
    column_id: targetColumnId,
    title: sourceCard.title,
    description_json: sourceCard.description_json ?? {},
    description_text: sourceCard.description_text ?? "",
    position: nextPos,
    status: sourceCard.status,
    priority: sourceCard.priority,
    cover_color: sourceCard.cover_color,
    start_date: sourceCard.start_date,
    due_date: sourceCard.due_date,
    reminder_at: sourceCard.reminder_at,
    recurrence_rule: sourceCard.recurrence_rule,
    completed_at: sourceCard.completed_at,
    created_by_user_id: actorId,
    updated_by_user_id: actorId,
  }).select().single();
  if (error) throw new Error(error.message);

  return mirrorCard;
}

async function actionShareCard(ctx: BridgeCtx, payload: Record<string, unknown>) {
  const admin = ctx.admin;
  const { source_card_id, target_board_id, target_column_id } = payload ?? {};
  if (!source_card_id || !target_board_id || !target_column_id ||
    typeof source_card_id !== "string" || typeof target_board_id !== "string" || typeof target_column_id !== "string") {
    throw new Error("source_card_id, target_board_id e target_column_id obrigatórios");
  }

  const { data: existing } = await admin.from("kanban_card_links")
    .select("id").eq("link_type", "share")
    .or(`source_card_id.eq.${source_card_id},target_card_id.eq.${source_card_id}`).maybeSingle();
  if (existing?.id) throw new Error("Card já compartilhado");

  const { data: sourceCard, error: sourceErr } = await admin.from("legal_kanban_cards")
    .select("*, board:legal_kanban_boards(id, domain)")
    .eq("id", source_card_id).single();
  if (sourceErr || !sourceCard) throw new Error("Card de origem não encontrado");

  const { data: targetBoard, error: boardErr } = await admin.from("legal_kanban_boards")
    .select("id, domain").eq("id", target_board_id).single();
  if (boardErr || !targetBoard) throw new Error("Quadro destino não encontrado");

  const sourceBoard = Array.isArray(sourceCard.board) ? sourceCard.board[0] : sourceCard.board;
  if (!sourceBoard || sourceBoard.domain === targetBoard.domain) {
    throw new Error("Compartilhamento permitido apenas entre domínios operacional e jurídico");
  }

  await assertCanEditBoard(admin, ctx, sourceCard.board_id as string);
  await assertCanEditBoard(admin, ctx, target_board_id);

  const { data: col, error: colErr } = await admin.from("legal_kanban_columns")
    .select("board_id").eq("id", target_column_id).single();
  if (colErr || !col || col.board_id !== target_board_id) throw new Error("Coluna inválida para este quadro");

  const event_id = await genEvent(admin, "kanban_card_share");

  const mirrorCard = await insertMirrorCard(admin, sourceCard, target_board_id, target_column_id, ctx.profileId);

  // Copiar as relações ANTES de criar o vínculo: com o vínculo já criado, os triggers
  // de sync espelhariam cada insert da cópia de volta para o card origem.
  await copyCardRelations(admin, source_card_id, mirrorCard.id, target_board_id);

  const linkDirection = sourceBoard.domain === "operational" ? "operational_to_legal" : "legal_to_operational";

  const { data: link, error: linkErr } = await admin.from("kanban_card_links").insert({
    source_card_id: sourceBoard.domain === "operational" ? source_card_id : mirrorCard.id,
    target_card_id: sourceBoard.domain === "operational" ? mirrorCard.id : source_card_id,
    source_board_id: sourceBoard.domain === "operational" ? sourceCard.board_id : target_board_id,
    target_board_id: sourceBoard.domain === "operational" ? target_board_id : sourceCard.board_id,
    target_column_id,
    link_direction: linkDirection,
    link_type: "share",
    created_by_user_id: ctx.profileId,
  }).select().single();
  if (linkErr) throw new Error(linkErr.message);

  await admin.from("legal_kanban_activities").insert([
    {
      card_id: source_card_id,
      actor_user_id: ctx.profileId,
      activity_type: "card_shared",
      message: "Card compartilhado com outro quadro.",
      metadata: { target_card_id: mirrorCard.id, target_board_id, source_event_id: event_id },
    },
    {
      card_id: mirrorCard.id,
      actor_user_id: ctx.profileId,
      activity_type: "card_shared_mirror",
      message: "Card espelhado a partir de compartilhamento.",
      metadata: { source_card_id, source_board_id: sourceCard.board_id, source_event_id: event_id },
    },
  ]);

  return { link, mirrorCard };
}

// Duplica o card em outra raia do mesmo quadro. Original e cópias formam um grupo
// sincronizado: a raiz do grupo é sempre o card original (source dos vínculos).
async function actionDuplicateCard(ctx: BridgeCtx, payload: Record<string, unknown>) {
  const admin = ctx.admin;
  const { source_card_id, target_column_id } = payload ?? {};
  if (!source_card_id || !target_column_id ||
    typeof source_card_id !== "string" || typeof target_column_id !== "string") {
    throw new Error("source_card_id e target_column_id obrigatórios");
  }

  const { data: sourceCard, error: sourceErr } = await admin.from("legal_kanban_cards")
    .select("*").eq("id", source_card_id).single();
  if (sourceErr || !sourceCard) throw new Error("Card de origem não encontrado");

  const boardId = sourceCard.board_id as string;

  const { data: col, error: colErr } = await admin.from("legal_kanban_columns")
    .select("board_id").eq("id", target_column_id).single();
  if (colErr || !col || col.board_id !== boardId) {
    throw new Error("Raia inválida para este quadro");
  }

  await assertCanEditBoard(admin, ctx, boardId);

  // Se o card origem já é uma cópia, a nova cópia entra no mesmo grupo (sem cadeias).
  const { data: parentLink } = await admin.from("kanban_card_links")
    .select("source_card_id").eq("link_type", "duplicate").eq("target_card_id", source_card_id).maybeSingle();
  const rootCardId = (parentLink?.source_card_id as string | undefined) ?? source_card_id;

  const event_id = await genEvent(admin, "kanban_card_duplicate");

  const mirrorCard = await insertMirrorCard(admin, sourceCard, boardId, target_column_id, ctx.profileId);

  await copyCardRelations(admin, rootCardId, mirrorCard.id, boardId);

  const { data: link, error: linkErr } = await admin.from("kanban_card_links").insert({
    source_card_id: rootCardId,
    target_card_id: mirrorCard.id,
    source_board_id: boardId,
    target_board_id: boardId,
    target_column_id,
    link_direction: "bi",
    link_type: "duplicate",
    created_by_user_id: ctx.profileId,
  }).select().single();
  if (linkErr) throw new Error(linkErr.message);

  await admin.from("legal_kanban_activities").insert([
    {
      card_id: rootCardId,
      actor_user_id: ctx.profileId,
      activity_type: "card_duplicated",
      message: "Card duplicado em outra raia.",
      metadata: { target_card_id: mirrorCard.id, target_column_id, source_event_id: event_id },
    },
    {
      card_id: mirrorCard.id,
      actor_user_id: ctx.profileId,
      activity_type: "card_duplicated_mirror",
      message: "Card criado a partir da duplicação de outro card.",
      metadata: { source_card_id: rootCardId, source_event_id: event_id },
    },
  ]);

  return { link, mirrorCard };
}

async function actionUnlink(ctx: BridgeCtx, payload: Record<string, unknown>) {
  const admin = ctx.admin;
  const { card_id, link_type } = payload ?? {};
  if (!card_id || typeof card_id !== "string") throw new Error("card_id obrigatório");

  let query = admin.from("kanban_card_links")
    .select("*")
    .or(`source_card_id.eq.${card_id},target_card_id.eq.${card_id}`);
  if (typeof link_type === "string") query = query.eq("link_type", link_type);

  const { data: links } = await query;

  if (!links?.length) return { unlinked: false };

  // Card é cópia: desvincula só ele. Card é raiz: dissolve o grupo de duplicatas.
  const asCopy = links.filter((link) => link.link_type === "duplicate" && link.target_card_id === card_id);
  const toRemove = asCopy.length ? asCopy : links;

  for (const link of toRemove) {
    await assertCanEditBoard(admin, ctx, link.source_board_id as string);
    await assertCanEditBoard(admin, ctx, link.target_board_id as string);
  }

  await admin.from("kanban_card_links").delete().in("id", toRemove.map((link) => link.id));
  return { unlinked: true, count: toRemove.length };
}

const ACTIONS: Record<string, (ctx: BridgeCtx, payload: Record<string, unknown>) => Promise<unknown>> = {
  share_card: actionShareCard,
  duplicate_card: actionDuplicateCard,
  unlink: actionUnlink,
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
