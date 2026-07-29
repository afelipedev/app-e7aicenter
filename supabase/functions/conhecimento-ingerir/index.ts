// =============================================================================
// conhecimento-ingerir -- Ingestao de documentos para RAG (AI Center E7)
// Baixa o arquivo do Storage, extrai texto (PDF/DOCX/TXT nativo; imagem via OCR
// com modelo de visao), fragmenta (~chunk), gera embeddings (1536) e grava em
// documento_fragmentos. Atualiza documentos.status.
//
// Contrato: POST { documentoId } -> { ok, fragmentos, ocrAplicado, paginas }
// =============================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "npm:unpdf";
import JSZip from "npm:jszip@3";
import { corsHeaders, jsonResponse, gerarEmbeddingsLote, ocrMistral, resolveApiKey } from "../_shared/llm.ts";

const TAM_CHUNK = 3000; // ~800 tokens
const OVERLAP = 300;
const LOTE_EMBED = 64; // textos por chamada de embeddings
const MIN_TEXTO_PDF = 40; // abaixo disso, considera PDF escaneado -> OCR

function fragmentar(texto: string): string[] {
  const limpo = texto.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!limpo) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < limpo.length) {
    const fim = Math.min(i + TAM_CHUNK, limpo.length);
    chunks.push(limpo.slice(i, fim));
    if (fim >= limpo.length) break;
    i = fim - OVERLAP;
  }
  return chunks;
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
  return xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}

// OCR de imagem: tenta Mistral (mistral-ocr-latest); fallback p/ visao gpt-4o.
async function ocrImagem(admin: any, base64: string, mime: string): Promise<string> {
  try {
    const t = await ocrMistral(admin, base64, mime, false);
    if (t && t.trim()) return t;
  } catch (_) { /* fallback abaixo */ }
  const apiKey = await resolveApiKey(admin, "openai");
  if (!apiKey) throw new Error("Nenhum provedor de OCR configurado (Mistral ou OpenAI).");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Transcreva integralmente, em pt-BR, todo o texto legivel desta imagem/documento. Retorne apenas o texto, sem comentarios." },
          { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
        ],
      }],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`OCR (visao) error: ${res.status} - ${e.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function bufferParaBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  let documentoId: string | undefined;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Nao autorizado" }, 401);
    const cli = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await cli.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Nao autorizado" }, 401);

    const body = await req.json();
    documentoId = body.documentoId;
    if (!documentoId) return jsonResponse({ error: "Parametro obrigatorio: documentoId" }, 400);

    const { data: doc } = await admin.from("documentos").select("*").eq("id", documentoId).maybeSingle();
    if (!doc) return jsonResponse({ error: "Documento nao encontrado" }, 404);

    await admin.from("documentos").update({ status: "processando", erro: null }).eq("id", documentoId);

    // 1) Download do Storage
    const dl = await admin.storage.from("agentes-conhecimento").download(doc.caminho_storage);
    if (dl.error || !dl.data) throw new Error(`Falha ao baixar arquivo: ${dl.error?.message}`);
    const buffer = await dl.data.arrayBuffer();
    const mime = doc.mime || "";

    // 2) Extracao por tipo
    let texto = "";
    let paginas = 0;
    let ocrAplicado = false;

    if (mime.includes("pdf")) {
      const r = await extrairPdf(buffer);
      texto = r.texto; paginas = r.paginas;
      // PDF escaneado (pouco/nenhum texto nativo) -> OCR via Mistral.
      if (texto.trim().length < MIN_TEXTO_PDF) {
        try {
          const ocr = await ocrMistral(admin, bufferParaBase64(buffer), mime, true);
          if (ocr && ocr.trim()) { texto = ocr; ocrAplicado = true; }
        } catch (e) {
          console.error("Falha no OCR Mistral do PDF:", e instanceof Error ? e.message : e);
        }
      }
    } else if (mime.includes("wordprocessingml") || mime.includes("msword") || doc.nome_arquivo.endsWith(".docx")) {
      texto = await extrairDocx(buffer);
    } else if (mime.startsWith("text/") || doc.nome_arquivo.endsWith(".txt")) {
      texto = new TextDecoder().decode(buffer);
    } else if (mime.startsWith("image/")) {
      texto = await ocrImagem(admin, bufferParaBase64(buffer), mime);
      ocrAplicado = true;
    } else {
      throw new Error(`Tipo de arquivo nao suportado: ${mime}`);
    }

    // 3) Fragmentacao + embeddings
    const chunks = fragmentar(texto);
    if (chunks.length === 0) {
      await admin.from("documentos").update({
        status: "concluido", paginas, ocr_aplicado: ocrAplicado,
        erro: "Nenhum texto extraido (documento vazio ou escaneado sem OCR).",
      }).eq("id", documentoId);
      return jsonResponse({ ok: true, fragmentos: 0, ocrAplicado, paginas });
    }

    // Limpa fragmentos antigos (reingestao) e insere em lotes (batch de
    // embeddings + insert em massa) para nao estourar recursos da funcao.
    await admin.from("documento_fragmentos").delete().eq("documento_id", documentoId);
    let inseridos = 0;
    for (let base = 0; base < chunks.length; base += LOTE_EMBED) {
      const lote = chunks.slice(base, base + LOTE_EMBED);
      const embeddings = await gerarEmbeddingsLote(admin, lote);
      const linhas = lote.map((conteudo, j) => ({
        documento_id: documentoId, base_id: doc.base_id, indice: base + j,
        conteudo, tokens: Math.round(conteudo.length / 4), embedding: embeddings[j],
      }));
      const { error } = await admin.from("documento_fragmentos").insert(linhas);
      if (!error) inseridos += linhas.length;
      else console.error("Erro ao inserir lote de fragmentos:", error.message);
    }

    await admin.from("documentos").update({ status: "concluido", paginas, ocr_aplicado: ocrAplicado, erro: null }).eq("id", documentoId);
    return jsonResponse({ ok: true, fragmentos: inseridos, ocrAplicado, paginas });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro na ingestao";
    console.error("Erro em conhecimento-ingerir:", msg);
    if (documentoId) await admin.from("documentos").update({ status: "erro", erro: msg }).eq("id", documentoId);
    return jsonResponse({ error: msg }, 500);
  }
});
