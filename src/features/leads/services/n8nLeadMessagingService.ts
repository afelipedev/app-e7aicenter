import { supabase } from "@/lib/supabase";
import type { Lead } from "../types";
import { LeadsService } from "./leadsService";

export type LeadMessageAction = "send_whatsapp" | "send_email";

export interface LeadMessagePayload {
  action: LeadMessageAction;
  lead_type: "cliente" | "parceiro";
  message: {
    content_json: Record<string, unknown>;
    content_text: string;
  };
  leads: Array<{
    id: string;
    company_name: string | null;
    cnpj: string | null;
    primary_phone: string | null;
    primary_email: string | null;
  }>;
}

/**
 * Serviço de disparo via webhook do n8n.
 * Reaproveita o mesmo endpoint dinâmico (VITE_N8N_WEBHOOK_DINAMICO) com payload por `action`.
 */
export class N8NLeadMessagingService {
  private static readonly REQUEST_TIMEOUT = 30000;

  private static normalizeWebhookUrl(rawUrl: string): string {
    return rawUrl.trim().replace(/^['"]|['"]$/g, "");
  }

  private static getWebhookUrl(): string {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_DINAMICO;
    if (!webhookUrl) {
      throw new Error(
        "VITE_N8N_WEBHOOK_DINAMICO não configurado nas variáveis de ambiente"
      );
    }
    return this.normalizeWebhookUrl(webhookUrl);
  }

  private static async post(accessToken: string, body: unknown) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.REQUEST_TIMEOUT
    );

    try {
      const response = await fetch(this.getWebhookUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          text?.trim()
            ? text.trim().slice(0, 500)
            : `Erro ${response.status}: ${response.statusText}`
        );
      }

      // aceita tanto JSON quanto texto; não depende do retorno, só confirma sucesso
      const text = await response.text().catch(() => "");
      if (!text?.trim()) return { ok: true };
      try {
        return JSON.parse(text);
      } catch {
        return { ok: true, output: text };
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  static async sendToAllActiveLeads(params: {
    action: LeadMessageAction;
    leadType: "cliente" | "parceiro";
    messageJson: Record<string, unknown>;
    messageText: string;
  }): Promise<void> {
    const { action, leadType, messageJson, messageText } = params;

    const { data: { session }, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !session) throw new Error("Usuário não autenticado");

    const leads = await LeadsService.list({ leadType, includeInactive: false, limit: 2000 });

    const leadsMapped: LeadMessagePayload["leads"] = leads.map((l: Lead) => ({
      id: l.id,
      company_name: l.company_name,
      cnpj: l.cnpj,
      primary_phone: LeadsService.getPrimaryPhone(l)?.phone || null,
      primary_email: LeadsService.getPrimaryEmail(l)?.email || null,
    }));

    const payload: LeadMessagePayload = {
      action,
      lead_type: leadType,
      message: {
        content_json: messageJson,
        content_text: messageText,
      },
      leads: leadsMapped,
    };

    await this.post(session.access_token, payload);
  }
}

