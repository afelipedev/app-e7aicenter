import { supabase } from "@/lib/supabase";
import type { ApiConsumptionData, ApiConsumptionQueryParams } from "../types";

const REQUEST_TIMEOUT = 60000;

const getFunctionUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL não configurado para consultar a Edge Function da Judit.");
  }

  return `${supabaseUrl}/functions/v1/judit-consumption-report`;
};

const readBody = async (response: Response) => {
  const text = await response.text().catch(() => "");
  const trimmed = text.trim();

  if (!trimmed) {
    return { text, json: null as unknown | null };
  }

  try {
    return { text, json: JSON.parse(trimmed) as unknown };
  } catch {
    return { text, json: null as unknown | null };
  }
};

export class JuditConsumptionService {
  static async getConsumptionReport(params: ApiConsumptionQueryParams): Promise<ApiConsumptionData> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Usuário não autenticado para consultar o consumo da Judit.");
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(getFunctionUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      const { text, json } = await readBody(response);
      if (!response.ok) {
        const payload = json && typeof json === "object" && json !== null ? (json as Record<string, unknown>) : null;
        const errorMessage =
          (typeof payload?.error === "string" && payload.error) ||
          (typeof payload?.message === "string" && payload.message) ||
          text ||
          "Falha ao consultar o relatório de consumo da Judit.";

        throw new Error(errorMessage);
      }

      return (json ?? {}) as ApiConsumptionData;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("A consulta do consumo da Judit excedeu o tempo limite. Tente novamente.");
      }

      throw error instanceof Error ? error : new Error("Erro desconhecido ao consultar a Judit.");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
}
