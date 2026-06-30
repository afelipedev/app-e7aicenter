import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * payroll-processing-callback
 *
 * Recebe callbacks do workflow n8n de processamento de holerites em lote para atualizar
 * o progresso/status em `payroll_processing` de forma assíncrona (sem o browser segurar a conexão).
 *
 * Autenticação: header `x-callback-secret` == env PAYROLL_CALLBACK_SECRET (segredo compartilhado
 * com o n8n). verify_jwt está desabilitado porque o chamador é o n8n (servidor), não um usuário.
 *
 * Reusa a RPC existente `receive_processing_result` (migration 034) que atualiza
 * payroll_processing + payroll_files + processing_logs atomicamente.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-callback-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const VALID_STATUS = new Set(["pending", "processing", "completed", "error"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Validação por segredo compartilhado
  const expectedSecret = Deno.env.get("PAYROLL_CALLBACK_SECRET");
  if (!expectedSecret) {
    return json({ error: "Server misconfigured: PAYROLL_CALLBACK_SECRET not set" }, 500);
  }
  const providedSecret =
    req.headers.get("x-callback-secret") ?? req.headers.get("X-Callback-Secret");
  if (providedSecret !== expectedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const processingId = String(payload.processing_id ?? "").trim();
  const status = String(payload.status ?? "").trim();

  if (!processingId) return json({ error: "processing_id is required" }, 400);
  if (!VALID_STATUS.has(status)) {
    return json({ error: `Invalid status: ${status}` }, 400);
  }

  const progress =
    payload.progress === undefined || payload.progress === null
      ? null
      : Math.max(0, Math.min(100, Number(payload.progress)));

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const num = (v: unknown) => (v === undefined || v === null ? null : Number(v));
  const filesTotal = num(payload.files_total);
  const filesDone = num(payload.files_done);

  if (status === "processing") {
    // Atualização de progresso: MONOTÔNICA e NÃO-DESTRUTIVA.
    // Os callbacks de progresso do n8n (OCR/XLSX) chegam sem ordem garantida e poderiam
    // sobrescrever um estado terminal ou anular o result_file_url. A RPC guardada nunca
    // regride o progresso nem toca linhas já completed/error.
    const { error: progErr } = await supabase.rpc("update_processing_progress", {
      p_id: processingId,
      p_progress: progress,
      p_files_total: filesTotal,
      p_files_done: filesDone,
    });
    if (progErr) {
      return json({ error: "progress update failed", details: progErr.message }, 500);
    }
    return json({ ok: true, processing_id: processingId, status, progress });
  }

  // Estados terminais (completed/error): autoritativos — usam a RPC que também
  // propaga para payroll_files + processing_logs.
  const { error: rpcError } = await supabase.rpc("receive_processing_result", {
    p_processing_id: processingId,
    p_status: status,
    p_progress: progress,
    p_result_file_url: (payload.result_file_url as string) ?? null,
    p_extracted_data: (payload.extracted_data as unknown) ?? null,
    p_error_message: (payload.error_message as string) ?? null,
    p_webhook_response: (payload.webhook_response as unknown) ?? null,
  });

  if (rpcError) {
    return json({ error: "RPC failed", details: rpcError.message }, 500);
  }

  // Mantém os contadores "arquivo X de Y" também no estado final
  if (filesTotal !== null || filesDone !== null) {
    const update: Record<string, number> = {};
    if (filesTotal !== null && !Number.isNaN(filesTotal)) update.files_total = filesTotal;
    if (filesDone !== null && !Number.isNaN(filesDone)) update.files_done = filesDone;
    if (Object.keys(update).length > 0) {
      await supabase.from("payroll_processing").update(update).eq("id", processingId);
    }
  }

  return json({ ok: true, processing_id: processingId, status, progress });
});
