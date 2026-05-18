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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anon) throw new Error("Config Supabase incompleta");

    // Usa cliente com auth do caller — RLS faz o filtro automaticamente.
    const client = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await client.auth.getUser();
    if (uErr || !user) throw new Error("Sessão inválida");

    const body = await req.json();
    const { query, scope, filters } = body ?? {};
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      throw new Error("query deve ter ao menos 2 caracteres");
    }

    const term = query.trim();
    const tsQuery = term.split(/\s+/).filter(Boolean).map((t) => `${t.replace(/[^\w]/g, "")}:*`).filter(Boolean).join(" & ");
    if (!tsQuery) throw new Error("query inválida");

    const limit = Math.min(Math.max(Number(filters?.limit ?? 20), 1), 100);

    // Posts
    let postsQuery = client
      .from("posts")
      .select("id, channel_id, author_user_id, title, description_text, created_at, last_activity_at, " +
              "author:users!posts_author_user_id_fkey(id, name, email)")
      .textSearch("search_tsv", tsQuery, { config: "portuguese" })
      .is("deleted_at", null)
      .limit(limit);

    if (scope?.startsWith("channel:")) {
      postsQuery = postsQuery.eq("channel_id", scope.slice(8));
    } else if (scope?.startsWith("team:")) {
      const teamId = scope.slice(5);
      const { data: chs } = await client.from("channels").select("id").eq("team_id", teamId);
      const ids = (chs ?? []).map((c) => c.id);
      if (ids.length) postsQuery = postsQuery.in("channel_id", ids);
      else postsQuery = postsQuery.eq("channel_id", "00000000-0000-0000-0000-000000000000");
    }

    if (filters?.author_id) postsQuery = postsQuery.eq("author_user_id", filters.author_id);
    if (filters?.from) postsQuery = postsQuery.gte("created_at", filters.from);
    if (filters?.to) postsQuery = postsQuery.lte("created_at", filters.to);

    // Mensagens
    let messagesQuery = client
      .from("post_messages")
      .select("id, post_id, author_user_id, content_text, created_at, " +
              "author:users!post_messages_author_user_id_fkey(id, name, email)")
      .textSearch("search_tsv", tsQuery, { config: "portuguese" })
      .is("deleted_at", null)
      .limit(limit);

    if (filters?.author_id) messagesQuery = messagesQuery.eq("author_user_id", filters.author_id);
    if (filters?.from) messagesQuery = messagesQuery.gte("created_at", filters.from);
    if (filters?.to) messagesQuery = messagesQuery.lte("created_at", filters.to);

    const [postsRes, messagesRes] = await Promise.all([postsQuery, messagesQuery]);
    if (postsRes.error) throw new Error(postsRes.error.message);
    if (messagesRes.error) throw new Error(messagesRes.error.message);

    return jsonResponse({
      data: {
        query: term,
        posts: postsRes.data ?? [],
        messages: messagesRes.data ?? [],
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    const status = message.includes("Não autorizado") || message.includes("Sessão inválida") ? 401
      : message.includes("Acesso negado") ? 403
      : message.includes("inválida") || message.includes("caracteres") || message.includes("obrigatório") ? 400
      : 500;
    return jsonResponse({ error: message }, status);
  }
});
