// =============================================================================
// extrair-texto -- Extrai texto de um arquivo enviado no chat do agente.
// Usado para anexos do chat (nao vai para RAG). PDF/DOCX/TXT nativo; PDF
// escaneado e imagem via OCR (Mistral, fallback visao).
//
// Contrato: POST { nome, mime, base64 } -> { texto, ocrAplicado, paginas }
// =============================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "npm:unpdf";
import JSZip from "npm:jszip@3";
import { corsHeaders, jsonResponse, ocrMistral, resolveApiKey } from "../_shared/llm.ts";

const MIN_TEXTO_PDF = 40;
const LIMITE_TEXTO = 120000; // ~30k tokens de contexto no maximo

function base64ParaBuffer(b64: string): Uint8Array {
  const limpo = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(limpo);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function extrairPdf(buffer: ArrayBuffer): Promise<{ texto: string; paginas: number }> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { texto: Array.isArray(text) ? text.join("\n\n") : String(text ?? ""), paginas: totalPages ?? 0 };
}

async function extrairDocx(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const arq = zip.file("word/document.xml");
  if (!arq) return "";
  const xml = await arq.async("string");
  return xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab[^>]*\/>/g, "\t").replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

async function ocrImagem(admin: any, base64: string, mime: string): Promise<string> {
  try {
    const t = await ocrMistral(admin, base64, mime, false);
    if (t && t.trim()) return t;
  } catch (_) { /* fallback */ }
  const apiKey = await resolveApiKey(admin, "openai");
  if (!apiKey) return "";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o", max_tokens: 4000, messages: [{ role: "user", content: [
      { type: "text", text: "Transcreva integralmente, em pt-BR, todo o texto legivel. Retorne apenas o texto." },
      { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
    ] }] }),
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Nao autorizado" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cli = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: authErr } = await cli.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Nao autorizado" }, 401);

    const { nome, mime, base64 } = await req.json();
    if (!base64) return jsonResponse({ error: "Parametro obrigatorio: base64" }, 400);
    const bytes = base64ParaBuffer(base64);
    const buffer = bytes.buffer;
    const tipo = String(mime || "");
    const b64puro = base64.includes(",") ? base64.split(",")[1] : base64;

    let texto = "";
    let paginas = 0;
    let ocrAplicado = false;

    if (tipo.includes("pdf") || String(nome).endsWith(".pdf")) {
      const r = await extrairPdf(buffer);
      texto = r.texto; paginas = r.paginas;
      if (texto.trim().length < MIN_TEXTO_PDF) {
        try { const ocr = await ocrMistral(admin, b64puro, "application/pdf", true); if (ocr?.trim()) { texto = ocr; ocrAplicado = true; } } catch (_) { /* ignora */ }
      }
    } else if (tipo.includes("wordprocessingml") || tipo.includes("msword") || String(nome).endsWith(".docx")) {
      texto = await extrairDocx(buffer);
    } else if (tipo.startsWith("text/") || String(nome).endsWith(".txt")) {
      texto = new TextDecoder().decode(buffer);
    } else if (tipo.startsWith("image/")) {
      texto = await ocrImagem(admin, b64puro, tipo); ocrAplicado = true;
    } else {
      return jsonResponse({ error: `Tipo de arquivo nao suportado: ${tipo}` }, 400);
    }

    return jsonResponse({ texto: texto.slice(0, LIMITE_TEXTO), ocrAplicado, paginas });
  } catch (error) {
    console.error("Erro em extrair-texto:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro ao extrair texto" }, 500);
  }
});
