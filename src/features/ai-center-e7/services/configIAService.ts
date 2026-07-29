import { supabase } from "@/lib/supabase";

export interface ConfigIA {
  chave: string;
  descricao: string | null;
  conteudo: string;
  atualizado_em: string;
}

/** Prompts de sistema editaveis do AI Center E7 (agentes utilitarios). */
export const configIAService = {
  async listar(): Promise<ConfigIA[]> {
    const { data, error } = await supabase
      .from("configuracoes_ia").select("chave, descricao, conteudo, atualizado_em").order("chave");
    if (error) throw error;
    return (data ?? []) as ConfigIA[];
  },

  async salvar(chave: string, conteudo: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    let atualizado_por: string | null = null;
    if (session) {
      const { data } = await supabase.from("users").select("id").eq("auth_user_id", session.user.id).maybeSingle();
      atualizado_por = data?.id ?? null;
    }
    const { error } = await supabase.from("configuracoes_ia")
      .update({ conteudo, atualizado_por, atualizado_em: new Date().toISOString() })
      .eq("chave", chave);
    if (error) throw error;
  },
};
