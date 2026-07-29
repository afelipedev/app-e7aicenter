import { supabase } from "@/lib/supabase";
import type { BaseConhecimento } from "../types";

const BUCKET = "agentes-conhecimento";
const DEFAULT_TIMEOUT = 20000;

const withTimeout = <T>(promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUT): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Operacao expirou. Verifique sua conexao e tente novamente.")), timeoutMs)),
  ]);

// Remove acentos, espacos e caracteres invalidos para uma chave de Storage.
function sanitizarNomeArquivo(nome: string): string {
  const ponto = nome.lastIndexOf(".");
  const base = ponto > 0 ? nome.slice(0, ponto) : nome;
  const ext = ponto > 0 ? nome.slice(ponto + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const limpo = base
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // acentos
    .replace(/[^a-zA-Z0-9._-]+/g, "-")                 // simbolos/espacos
    .replace(/-+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 80) || "arquivo";
  return ext ? `${limpo}.${ext}` : limpo;
}

async function usuarioAtualId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuario nao autenticado");
  const { data, error } = await supabase
    .from("users").select("id").eq("auth_user_id", session.user.id).single();
  if (error || !data) throw new Error("Usuario da aplicacao nao encontrado");
  return data.id;
}

export interface DocumentoInfo {
  id: string;
  base_id: string;
  nome_arquivo: string;
  mime: string | null;
  tamanho: number | null;
  paginas: number | null;
  ocr_aplicado: boolean;
  status: "pendente" | "processando" | "concluido" | "erro";
  erro: string | null;
  criado_em: string;
}

/** Servico de bases de conhecimento (RAG) do AI Center E7. */
export const conhecimentoService = {
  async listarBases(): Promise<BaseConhecimento[]> {
    const { data, error } = await withTimeout(
      supabase.from("bases_conhecimento").select("*").order("atualizado_em", { ascending: false }),
    );
    if (error) throw error;
    return (data ?? []) as BaseConhecimento[];
  },

  async criarBase(dados: { nome: string; descricao?: string; tipo?: BaseConhecimento["tipo"]; escopo?: BaseConhecimento["escopo"] }): Promise<BaseConhecimento> {
    const criado_por = await usuarioAtualId();
    const { data, error } = await withTimeout(
      supabase.from("bases_conhecimento").insert({
        criado_por, nome: dados.nome, descricao: dados.descricao ?? null,
        tipo: dados.tipo ?? "geral", escopo: dados.escopo ?? "privado",
      }).select("*").single(),
    );
    if (error) throw error;
    return data as BaseConhecimento;
  },

  async excluirBase(id: string): Promise<void> {
    const { error } = await withTimeout(supabase.from("bases_conhecimento").delete().eq("id", id));
    if (error) throw error;
  },

  async listarDocumentos(baseId: string): Promise<DocumentoInfo[]> {
    const { data, error } = await withTimeout(
      supabase.from("documentos").select("id, base_id, nome_arquivo, mime, tamanho, paginas, ocr_aplicado, status, erro, criado_em")
        .eq("base_id", baseId).order("criado_em", { ascending: false }),
    );
    if (error) throw error;
    return (data ?? []) as DocumentoInfo[];
  },

  /** Faz upload do arquivo, cria o registro do documento e dispara a ingestao. */
  async enviarDocumento(baseId: string, arquivo: File): Promise<DocumentoInfo> {
    const userId = await usuarioAtualId();
    // Sanitiza o nome para a chave do Storage (sem acentos, espacos ou simbolos):
    // o Supabase rejeita chaves com esses caracteres (InvalidKey). O nome
    // original e preservado em nome_arquivo para exibicao.
    const seguro = sanitizarNomeArquivo(arquivo.name);
    const caminho = `${userId}/${baseId}/${Date.now()}-${seguro}`;
    const up = await supabase.storage.from(BUCKET).upload(caminho, arquivo, { upsert: false, contentType: arquivo.type });
    if (up.error) throw new Error(`Falha no upload: ${up.error.message}`);

    const { data: doc, error } = await withTimeout(
      supabase.from("documentos").insert({
        base_id: baseId, criado_por: userId, nome_arquivo: arquivo.name,
        caminho_storage: caminho, mime: arquivo.type, tamanho: arquivo.size, status: "pendente",
      }).select("id, base_id, nome_arquivo, mime, tamanho, paginas, ocr_aplicado, status, erro, criado_em").single(),
    );
    if (error) throw error;

    // Dispara a Edge Function de ingestao (nao bloqueia a UI em caso de demora).
    supabase.functions.invoke("conhecimento-ingerir", { body: { documentoId: doc.id } })
      .catch((e) => console.error("Falha ao disparar ingestao:", e));

    return doc as DocumentoInfo;
  },

  async excluirDocumento(id: string): Promise<void> {
    const { error } = await withTimeout(supabase.from("documentos").delete().eq("id", id));
    if (error) throw error;
  },
};
