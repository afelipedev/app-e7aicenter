import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_ROLES = new Set(["administrator", "it", "advogado_adm"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      throw new Error("Configuração do Supabase incompleta");
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Sessão inválida" }, 401);
    }

    const { data: callerProfile, error: profileError } = await adminClient
      .from("users")
      .select("role, status")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !callerProfile || callerProfile.status !== "ativo") {
      return jsonResponse({ error: "Perfil de usuário inválido" }, 403);
    }

    if (!ADMIN_ROLES.has(callerProfile.role)) {
      return jsonResponse({ error: "Sem permissão para alterar e-mail" }, 403);
    }

    const body = await req.json();
    const newEmail = String(body?.newEmail ?? "").trim().toLowerCase();

    if (!newEmail || !newEmail.includes("@")) {
      return jsonResponse({ error: "E-mail inválido" }, 400);
    }

    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: true,
    });

    if (updateAuthError) {
      return jsonResponse({ error: updateAuthError.message }, 400);
    }

    const { error: updateProfileError } = await adminClient
      .from("users")
      .update({
        email: newEmail,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", user.id);

    if (updateProfileError) {
      return jsonResponse({ error: updateProfileError.message }, 400);
    }

    return jsonResponse({ data: { email: newEmail }, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return jsonResponse({ error: message }, 500);
  }
});
