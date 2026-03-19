import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_ROLES = ["administrator", "it", "advogado_adm"];

async function ensureAdminCaller(req: Request): Promise<{ admin: ReturnType<typeof createClient>; userId: string }> {
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
    throw new Error("Acesso negado. Apenas administradores podem criar usuários.");
  }

  return { admin, userId: user.id };
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
    const { name, email, password, role, status } = body;

    if (!name || !email || !password || !role) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: name, email, password, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingUsers, error: checkError } = await admin
      .from("users")
      .select("id, email")
      .eq("email", email)
      .limit(1);

    if (checkError) {
      return new Response(
        JSON.stringify({ error: `Erro ao verificar email: ${checkError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingUsers && existingUsers.length > 0) {
      return new Response(
        JSON.stringify({ error: "Email já está registrado", code: "EMAIL_ALREADY_EXISTS" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError || !authData.user) {
      const message = authError?.message ?? "Erro ao criar usuário de autenticação";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profileData = {
      auth_user_id: authData.user.id,
      email,
      name,
      role,
      status: status || "ativo",
      first_access_completed: true,
      first_access_at: new Date().toISOString(),
    };

    const { data: insertData, error: insertError } = await admin
      .from("users")
      .insert(profileData)
      .select();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: `Falha ao criar perfil: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!insertData || insertData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Falha ao criar perfil do usuário", code: "INSERT_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ data: insertData[0], error: null }),
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
