import { supabase } from "@/lib/supabase";
import type {
  Lead,
  LeadEmail,
  LeadPhone,
  LeadType,
  LeadWithContactsInput,
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

function ensureSinglePrimary<T extends { is_primary: boolean }>(items: T[]): T[] {
  const primaryIndex = items.findIndex((i) => i.is_primary);
  if (primaryIndex === -1) {
    // se existe pelo menos 1 item, define o primeiro como principal
    if (items.length > 0) {
      return items.map((i, idx) => ({ ...i, is_primary: idx === 0 }));
    }
    return items;
  }
  return items.map((i, idx) => ({ ...i, is_primary: idx === primaryIndex }));
}

export interface ListLeadsParams {
  leadType?: Exclude<LeadType, null>;
  search?: string;
  includeInactive?: boolean;
  limit?: number;
}

export class LeadsService {
  static async list(params: ListLeadsParams = {}): Promise<Lead[]> {
    const { leadType, search, includeInactive = false, limit = 200 } = params;

    let query = supabase
      .from("leads")
      .select("*, lead_phones(*), lead_emails(*)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }
    if (leadType) {
      query = query.eq("lead_type", leadType);
    }
    if (search && search.trim()) {
      const s = search.trim();
      // busca simples (nome/cnpj). KISS: sem trigram por enquanto.
      query = query.or(`company_name.ilike.%${s}%,cnpj.ilike.%${s}%`);
    }

    const { data, error } = await withTimeout(query);
    if (error) throw new Error(`Erro ao listar leads: ${error.message}`);
    return (data || []) as Lead[];
  }

  static async getById(id: string): Promise<Lead | null> {
    const query = supabase
      .from("leads")
      .select("*, lead_phones(*), lead_emails(*)")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await withTimeout(query);
    if (error) throw new Error(`Erro ao buscar lead: ${error.message}`);
    return (data || null) as Lead | null;
  }

  static async create(input: LeadWithContactsInput): Promise<Lead> {
    const phones = ensureSinglePrimary(input.phones || []).map((p) => ({
      phone: p.phone,
      is_primary: p.is_primary,
    }));
    const emails = ensureSinglePrimary(input.emails || []).map((e) => ({
      email: e.email,
      is_primary: e.is_primary,
    }));

    const insertLeadQuery = supabase
      .from("leads")
      .insert(input.lead)
      .select()
      .single();

    const { data: lead, error: leadError } = await withTimeout(insertLeadQuery);
    if (leadError || !lead) {
      throw new Error(`Erro ao criar lead: ${leadError?.message || "sem retorno"}`);
    }

    try {
      if (phones.length > 0) {
        const phonesInsertQuery = supabase.from("lead_phones").insert(
          phones.map((p) => ({
            lead_id: lead.id,
            ...p,
          }))
        );
        const { error } = await withTimeout(phonesInsertQuery);
        if (error) throw new Error(`Erro ao salvar telefones: ${error.message}`);
      }

      if (emails.length > 0) {
        const emailsInsertQuery = supabase.from("lead_emails").insert(
          emails.map((e) => ({
            lead_id: lead.id,
            ...e,
          }))
        );
        const { error } = await withTimeout(emailsInsertQuery);
        if (error) throw new Error(`Erro ao salvar emails: ${error.message}`);
      }
    } catch (err) {
      // best-effort rollback do lead criado
      await supabase.from("leads").delete().eq("id", lead.id);
      throw err instanceof Error ? err : new Error("Erro ao criar lead");
    }

    const refreshed = await this.getById(lead.id);
    if (!refreshed) throw new Error("Erro ao criar lead: falha ao recarregar");
    return refreshed;
  }

  static async update(id: string, input: LeadWithContactsInput): Promise<Lead> {
    const phones = ensureSinglePrimary(input.phones || []).map((p) => ({
      phone: p.phone,
      is_primary: p.is_primary,
    }));
    const emails = ensureSinglePrimary(input.emails || []).map((e) => ({
      email: e.email,
      is_primary: e.is_primary,
    }));

    const updateLeadQuery = supabase
      .from("leads")
      .update(input.lead)
      .eq("id", id)
      .select()
      .single();

    const { error: leadError } = await withTimeout(updateLeadQuery);
    if (leadError) throw new Error(`Erro ao atualizar lead: ${leadError.message}`);

    // KISS: regrava contatos (delete + insert)
    const deletePhonesQuery = supabase.from("lead_phones").delete().eq("lead_id", id);
    const deleteEmailsQuery = supabase.from("lead_emails").delete().eq("lead_id", id);
    const [{ error: delPhonesErr }, { error: delEmailsErr }] = await Promise.all([
      withTimeout(deletePhonesQuery),
      withTimeout(deleteEmailsQuery),
    ]);
    if (delPhonesErr) throw new Error(`Erro ao atualizar telefones: ${delPhonesErr.message}`);
    if (delEmailsErr) throw new Error(`Erro ao atualizar emails: ${delEmailsErr.message}`);

    if (phones.length > 0) {
      const phonesInsertQuery = supabase.from("lead_phones").insert(
        phones.map((p) => ({
          lead_id: id,
          ...p,
        }))
      );
      const { error } = await withTimeout(phonesInsertQuery);
      if (error) throw new Error(`Erro ao salvar telefones: ${error.message}`);
    }

    if (emails.length > 0) {
      const emailsInsertQuery = supabase.from("lead_emails").insert(
        emails.map((e) => ({
          lead_id: id,
          ...e,
        }))
      );
      const { error } = await withTimeout(emailsInsertQuery);
      if (error) throw new Error(`Erro ao salvar emails: ${error.message}`);
    }

    const refreshed = await this.getById(id);
    if (!refreshed) throw new Error("Erro ao atualizar lead: falha ao recarregar");
    return refreshed;
  }

  static async setActive(id: string, isActive: boolean): Promise<void> {
    const query = supabase
      .from("leads")
      .update({ is_active: isActive })
      .eq("id", id);

    const { error } = await withTimeout(query);
    if (error) throw new Error(`Erro ao atualizar status do lead: ${error.message}`);
  }

  static getPrimaryPhone(lead: Pick<Lead, "lead_phones">): LeadPhone | null {
    const phones = lead.lead_phones || [];
    return phones.find((p) => p.is_primary) || phones[0] || null;
  }

  static getPrimaryEmail(lead: Pick<Lead, "lead_emails">): LeadEmail | null {
    const emails = lead.lead_emails || [];
    return emails.find((e) => e.is_primary) || emails[0] || null;
  }
}

