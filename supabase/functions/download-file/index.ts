import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, cache-control, accept",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/**
 * Segurança (anti-SSRF):
 * - Só permite baixar arquivos do bucket S3 esperado (por padrão: e7sped-processados)
 * - Aceita hostnames S3 regionais, ex.: {bucket}.s3.sa-east-1.amazonaws.com
 * - Aceita também path-style, ex.: s3.sa-east-1.amazonaws.com/{bucket}/...
 */
const allowedBuckets = new Set([
  // Bucket padrão do projeto
  "e7sped-processados",
  // Caso existam aliases/homolog, adicione aqui.
]);

function getBucketFromS3Url(url: URL): string | null {
  const hostname = url.hostname.toLowerCase();

  // virtual-hosted–style:
  //   {bucket}.s3.amazonaws.com
  //   {bucket}.s3.{region}.amazonaws.com
  const virtualHostedMatch = hostname.match(/^([a-z0-9.\-]+)\.s3(\.[a-z0-9\-]+)?\.amazonaws\.com$/i);
  if (virtualHostedMatch?.[1]) {
    return virtualHostedMatch[1];
  }

  // path-style:
  //   s3.amazonaws.com/{bucket}/...
  //   s3.{region}.amazonaws.com/{bucket}/...
  const pathStyleMatch = hostname.match(/^s3(\.[a-z0-9\-]+)?\.amazonaws\.com$/i);
  if (pathStyleMatch) {
    const pathParts = url.pathname.split("/").filter(Boolean);
    return pathParts[0] ?? null;
  }

  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the file URL from query parameters
    const url = new URL(req.url);
    const fileUrl = url.searchParams.get("url");
    const filename = url.searchParams.get("filename") || "download";

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "URL parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate that the URL is HTTPS and from the expected S3 bucket
    const fileUrlObj = new URL(fileUrl);
    if (fileUrlObj.protocol !== "https:") {
      return new Response(
        JSON.stringify({ error: "Invalid file URL protocol (HTTPS required)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const bucket = getBucketFromS3Url(fileUrlObj);
    if (!bucket || !allowedBuckets.has(bucket)) {
      return new Response(
        JSON.stringify({
          error: "Invalid file URL domain",
          details: `Bucket não permitido ou URL não é S3 válida. hostname=${fileUrlObj.hostname} bucket=${bucket ?? "null"}`,
          allowedBuckets: Array.from(allowedBuckets),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch the file from S3
    // Tentar diferentes abordagens para acessar o S3
    let fileResponse: Response;
    
    try {
      // Primeira tentativa: acesso direto (se o bucket for público)
      fileResponse = await fetch(fileUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Supabase-Edge-Function/1.0",
        },
      });

      // Se retornar 403, o bucket pode estar privado
      // Nesse caso, retornar erro informativo
      if (fileResponse.status === 403) {
        return new Response(
          JSON.stringify({
            error: "Acesso negado ao arquivo no S3. O bucket pode estar configurado como privado.",
            details: "O arquivo pode precisar de credenciais AWS ou o bucket precisa ser configurado para permitir acesso público de leitura.",
            suggestion: "Verifique as políticas do bucket S3 ou configure o bucket para permitir acesso público de leitura.",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!fileResponse.ok) {
        return new Response(
          JSON.stringify({
            error: `Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`,
          }),
          {
            status: fileResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } catch (fetchError) {
      console.error("Error fetching from S3:", fetchError);
      return new Response(
        JSON.stringify({
          error: "Erro ao acessar o arquivo no S3",
          details: fetchError instanceof Error ? fetchError.message : "Erro desconhecido",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the file content
    const fileBlob = await fileResponse.blob();
    const fileBuffer = await fileBlob.arrayBuffer();

    // Determine content type from response or file extension
    const contentType =
      fileResponse.headers.get("content-type") ||
      (filename.endsWith(".xlsx")
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : filename.endsWith(".pdf")
        ? "application/pdf"
        : "application/octet-stream");

    // Return the file with proper headers
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          filename
        )}"`,
        "Content-Length": fileBuffer.byteLength.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
