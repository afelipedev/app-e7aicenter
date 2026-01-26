import { supabase } from "@/lib/supabase";
import type {
  MessageTemplate,
  MessageTemplateCategory,
  MessageTemplatePlaceholder,
} from "../types";

const DEFAULT_TIMEOUT = 15000;

const withTimeout = <T,>(promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUT): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error("Operação expirou. Verifique sua conexão e tente novamente.")
          ),
        timeoutMs
      )
    ),
  ]);

export class LeadTemplatesService {
  static async listCategories(): Promise<MessageTemplateCategory[]> {
    const query = supabase
      .from("message_template_categories")
      .select("*")
      .order("is_system", { ascending: false })
      .order("name", { ascending: true });

    const { data, error } = await withTimeout(query);
    if (error) throw new Error(`Erro ao listar categorias: ${error.message}`);
    return (data || []) as MessageTemplateCategory[];
  }

  static async listPlaceholders(): Promise<MessageTemplatePlaceholder[]> {
    const query = supabase
      .from("message_template_placeholders")
      .select("*")
      .order("is_system", { ascending: false })
      .order("key", { ascending: true });

    const { data, error } = await withTimeout(query);
    if (error) throw new Error(`Erro ao listar placeholders: ${error.message}`);
    return (data || []) as MessageTemplatePlaceholder[];
  }

  static async listTemplates(params: { categoryId?: string; includeInactive?: boolean } = {}): Promise<MessageTemplate[]> {
    const { categoryId, includeInactive = false } = params;
    let query = supabase
      .from("message_templates")
      .select("*, message_template_categories(*)")
      .order("updated_at", { ascending: false });

    if (categoryId) query = query.eq("category_id", categoryId);
    if (!includeInactive) query = query.eq("is_active", true);

    const { data, error } = await withTimeout(query);
    if (error) throw new Error(`Erro ao listar templates: ${error.message}`);
    return (data || []) as MessageTemplate[];
  }

  static async getTemplateById(id: string): Promise<MessageTemplate | null> {
    const query = supabase
      .from("message_templates")
      .select("*, message_template_categories(*)")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await withTimeout(query);
    if (error) throw new Error(`Erro ao buscar template: ${error.message}`);
    return (data || null) as MessageTemplate | null;
  }

  static async upsertTemplate(input: Partial<MessageTemplate> & Pick<MessageTemplate, "title" | "content_json"> & { id?: string }): Promise<MessageTemplate> {
    const payload = {
      title: input.title,
      category_id: input.category_id ?? null,
      content_json: input.content_json,
      content_text: input.content_text ?? null,
      tags: input.tags ?? null,
      is_active: input.is_active ?? true,
    };

    if (input.id) {
      const query = supabase
        .from("message_templates")
        .update(payload)
        .eq("id", input.id)
        .select("*, message_template_categories(*)")
        .single();
      const { data, error } = await withTimeout(query);
      if (error || !data) throw new Error(`Erro ao atualizar template: ${error?.message || "sem retorno"}`);
      return data as MessageTemplate;
    }

    const query = supabase
      .from("message_templates")
      .insert(payload)
      .select("*, message_template_categories(*)")
      .single();
    const { data, error } = await withTimeout(query);
    if (error || !data) throw new Error(`Erro ao criar template: ${error?.message || "sem retorno"}`);
    return data as MessageTemplate;
  }

  static async deleteTemplate(id: string): Promise<void> {
    const query = supabase.from("message_templates").delete().eq("id", id);
    const { error } = await withTimeout(query);
    if (error) throw new Error(`Erro ao excluir template: ${error.message}`);
  }

  static async upsertCategory(input: Partial<MessageTemplateCategory> & Pick<MessageTemplateCategory, "name"> & { id?: string }): Promise<MessageTemplateCategory> {
    const payload = {
      name: input.name,
      is_system: input.is_system ?? false,
    };

    if (input.id) {
      const query = supabase
        .from("message_template_categories")
        .update(payload)
        .eq("id", input.id)
        .select()
        .single();
      const { data, error } = await withTimeout(query);
      if (error || !data) throw new Error(`Erro ao atualizar categoria: ${error?.message || "sem retorno"}`);
      return data as MessageTemplateCategory;
    }

    const query = supabase
      .from("message_template_categories")
      .insert(payload)
      .select()
      .single();
    const { data, error } = await withTimeout(query);
    if (error || !data) throw new Error(`Erro ao criar categoria: ${error?.message || "sem retorno"}`);
    return data as MessageTemplateCategory;
  }
}

