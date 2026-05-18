import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TEXT_LEN = 20_000;
const MAX_JSON_BYTES = 200_000;
const RATE_LIMIT_PER_MIN = 30;

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

/**
 * Remove nós potencialmente perigosos do JSON do TipTap.
 * Permite apenas tipos conhecidos.
 */
const ALLOWED_NODE_TYPES = new Set([
  "doc", "paragraph", "text", "hardBreak", "heading", "bulletList", "orderedList",
  "listItem", "taskList", "taskItem", "blockquote", "codeBlock", "horizontalRule",
  "image", "mention",
]);
const ALLOWED_MARKS = new Set([
  "bold", "italic", "underline", "strike", "code", "link", "highlight", "textStyle",
]);

function sanitizeDoc(node: unknown): unknown {
  if (!node || typeof node !== "object") return null;
  const n = node as { type?: unknown; content?: unknown; marks?: unknown; attrs?: unknown; text?: unknown };
  if (typeof n.type !== "string" || !ALLOWED_NODE_TYPES.has(n.type)) return null;

  const out: Record<string, unknown> = { type: n.type };

  if (typeof n.text === "string") out.text = n.text.slice(0, MAX_TEXT_LEN);

  if (n.attrs && typeof n.attrs === "object") {
    const attrs = n.attrs as Record<string, unknown>;
    const cleanAttrs: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
        cleanAttrs[k] = v;
      }
    }
    if (n.type === "link" && typeof cleanAttrs.href === "string") {
      // bloqueia javascript:
      if (/^javascript:/i.test(cleanAttrs.href)) delete cleanAttrs.href;
    }
    out.attrs = cleanAttrs;
  }

  if (Array.isArray(n.marks)) {
    out.marks = n.marks
      .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
      .filter((m) => typeof m.type === "string" && ALLOWED_MARKS.has(m.type as string))
      .map((m) => {
        const cleanMark: Record<string, unknown> = { type: m.type };
        if (m.attrs && typeof m.attrs === "object") {
          const attrs = m.attrs as Record<string, unknown>;
          if (m.type === "link" && typeof attrs.href === "string" && /^javascript:/i.test(attrs.href)) {
            return cleanMark;
          }
          cleanMark.attrs = attrs;
        }
        return cleanMark;
      });
  }

  if (Array.isArray(n.content)) {
    out.content = n.content.map(sanitizeDoc).filter((x): x is Record<string, unknown> => x !== null);
  }

  return out;
}

function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; text?: unknown; content?: unknown };
  let acc = "";
  if (n.type === "text" && typeof n.text === "string") acc += n.text + " ";
  if (Array.isArray(n.content)) for (const c of n.content) acc += extractText(c);
  return acc;
}

function extractMentions(node: unknown): string[] {
  const ids: string[] = [];
  const walk = (x: unknown) => {
    if (!x || typeof x !== "object") return;
    const v = x as { type?: string; attrs?: { id?: unknown }; content?: unknown };
    if (v.type === "mention" && v.attrs?.id) ids.push(String(v.attrs.id));
    if (Array.isArray(v.content)) v.content.forEach(walk);
  };
  walk(node);
  return Array.from(new Set(ids));
}

async function checkRateLimit(ctx: Ctx) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await ctx.admin.from("post_messages")
    .select("id", { count: "exact", head: true })
    .eq("author_user_id", ctx.profileId)
    .gte("created_at", since);
  if ((count ?? 0) >= RATE_LIMIT_PER_MIN) {
    throw new Error("Rate limit excedido: aguarde antes de enviar mais mensagens");
  }
}

async function canReadPost(ctx: Ctx, postId: string): Promise<{ channelId: string; teamId: string } | null> {
  const { data: post } = await ctx.admin.from("posts")
    .select("channel_id").eq("id", postId).is("deleted_at", null).single();
  if (!post) return null;

  const { data: channel } = await ctx.admin.from("channels")
    .select("team_id, visibility, is_archived").eq("id", post.channel_id).single();
  if (!channel || channel.is_archived) return null;

  // Global admin sempre pode
  const GLOBAL_ADMIN_ROLES = ["administrator", "it", "advogado_adm"];
  if (GLOBAL_ADMIN_ROLES.includes(ctx.role)) {
    return { channelId: post.channel_id as string, teamId: channel.team_id as string };
  }

  const { data: tm } = await ctx.admin.from("team_members")
    .select("id").eq("team_id", channel.team_id).eq("user_id", ctx.profileId).maybeSingle();
  if (!tm) return null;

  if (channel.visibility === "private") {
    const { data: cm } = await ctx.admin.from("channel_members")
      .select("id").eq("channel_id", post.channel_id).eq("user_id", ctx.profileId).maybeSingle();
    if (!cm) return null;
  }
  return { channelId: post.channel_id as string, teamId: channel.team_id as string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405);

  try {
    const ctx = await ensureCaller(req);
    const body = await req.json();
    const { post_id, content_json } = body ?? {};
    if (!post_id || !content_json) throw new Error("post_id e content_json obrigatórios");

    const access = await canReadPost(ctx, post_id);
    if (!access) throw new Error("Acesso negado: não pode escrever neste post");

    await checkRateLimit(ctx);

    const sanitized = sanitizeDoc(content_json);
    if (!sanitized) throw new Error("content_json inválido");

    const jsonString = JSON.stringify(sanitized);
    if (jsonString.length > MAX_JSON_BYTES) throw new Error("Mensagem muito grande");

    const text = extractText(sanitized).trim().slice(0, MAX_TEXT_LEN);
    if (!text.length) throw new Error("Mensagem vazia");

    const { data: message, error } = await ctx.admin.from("post_messages").insert({
      post_id,
      author_user_id: ctx.profileId,
      content_json: sanitized,
      content_text: text,
    }).select().single();
    if (error) throw new Error(error.message);

    // mentions
    const mentions = extractMentions(sanitized);
    if (mentions.length) {
      const rows = mentions.map((mentioned_user_id) => ({
        message_id: message.id,
        mentioned_user_id,
      }));
      await ctx.admin.from("message_mentions").insert(rows);
    }

    return jsonResponse({ data: { message }, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    const status = message.includes("Não autorizado") || message.includes("Sessão inválida") ? 401
      : message.includes("Acesso negado") ? 403
      : message.includes("Rate limit") ? 429
      : message.includes("obrigatório") || message.includes("inválido")
        || message.includes("vazia") || message.includes("muito grande") ? 400
      : 500;
    return jsonResponse({ error: message }, status);
  }
});
