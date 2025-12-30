import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, cache-control, accept",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

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

    // Validate that the URL is from the expected S3 bucket
    const allowedDomains = [
      "e7sped-processados.s3.amazonaws.com",
      "s3.amazonaws.com",
      "s3.us-east-1.amazonaws.com",
    ];

    const fileUrlObj = new URL(fileUrl);
    const isAllowedDomain = allowedDomains.some((domain) =>
      fileUrlObj.hostname.includes(domain)
    );

    if (!isAllowedDomain) {
      return new Response(
        JSON.stringify({ error: "Invalid file URL domain" }),
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
