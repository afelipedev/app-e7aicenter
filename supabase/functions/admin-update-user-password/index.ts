import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_ROLES = ["administrator", "it", "advogado_adm"];

async function ensureAdminCaller(req: Request): Promise<{ admin: ReturnType<typeof createClient> }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Não autorizado");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error("Configuração do Supabase incompleta");
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    throw new Error("Sessão inválida");
  }

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerUser, error: callerError } = await admin
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .limit(1)
    .single();

  if (callerError || !callerUser || !ADMIN_ROLES.includes(callerUser.role)) {
    throw new Error("Acesso negado. Apenas administradores podem alterar senhas.");
  }

  return { admin };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método não permitido" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { admin } = await ensureAdminCaller(req);

    const body = await req.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: userId, newPassword" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: targetUser, error: fetchError } = await admin
      .from("users")
      .select("id, auth_user_id, email")
      .eq("id", userId)
      .limit(1)
      .single();

    if (fetchError || !targetUser) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!targetUser.auth_user_id) {
      return new Response(
        JSON.stringify({ error: "ID de autenticação não encontrado para o usuário" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(
      targetUser.auth_user_id,
      { password: newPassword }
    );

    if (authUpdateError) {
      return new Response(
        JSON.stringify({ error: `Erro ao atualizar senha: ${authUpdateError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Senha atualizada com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    const status = message.includes("Não autorizado") || message.includes("Sessão inválida")
      ? 401
      : message.includes("Acesso negado")
        ? 403
        : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
