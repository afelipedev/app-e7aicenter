import { supabase } from "@/lib/supabase";
import { getAgentById, type AIAgent } from "@/config/aiAgents";

export interface N8NAgentResponse {
  output: string;
  error?: string;
}

export interface N8NAgentError {
  message: string;
  code?: string;
  status?: number;
}

export interface ArquivoPayload {
  nome: string;
  tipo: string;
  base64: string; // Base64 SEM o prefixo "data:..."
}

/**
 * Serviço para comunicação com agentes n8n
 */
export class N8NAgentService {
  private static readonly REQUEST_TIMEOUT = 30000; // 30 segundos
  private static readonly MAX_RETRIES = 2;

  private static normalizeWebhookUrl(rawUrl: string): string {
    // remove espaços e aspas comuns de .env (ex: "https://..." ou 'https://...')
    return rawUrl.trim().replace(/^['"]|['"]$/g, "");
  }

  private static async readBody(response: Response): Promise<{
    text: string;
    json: unknown | null;
  }> {
    const text = await response.text().catch(() => "");
    const trimmed = text.trim();
    if (!trimmed) return { text, json: null };

    try {
      return { text, json: JSON.parse(trimmed) as unknown };
    } catch {
      return { text, json: null };
    }
  }

  /**
   * Obtém a URL do webhook dinâmico do n8n
   */
  private static getWebhookUrl(): string {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_DINAMICO;
    if (!webhookUrl) {
      throw new Error(
        "VITE_N8N_WEBHOOK_DINAMICO não configurado nas variáveis de ambiente"
      );
    }
    return this.normalizeWebhookUrl(webhookUrl);
  }

  /**
   * Chama um agente n8n específico
   * @param agentId ID do agente
   * @param input Input do usuário
   * @param arquivo Arquivo opcional para anexar (formato: { nome, tipo, base64 })
   * @param sessionId ID da sessão/conversa para memória do agente
   * @returns Resposta do agente
   */
  static async callAgent(
    agentId: string,
    input: string,
    arquivo?: ArquivoPayload,
    sessionId?: string
  ): Promise<N8NAgentResponse> {
    // Obter informações do agente para validar que existe
    const agent = getAgentById(agentId);
    if (!agent) {
      throw new Error(`Agente não encontrado: ${agentId}`);
    }

    // Obter token de autenticação
    const { data: { session }, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Usuário não autenticado");
    }

    // Obter webhook dinâmico
    const webhookUrl = this.getWebhookUrl();

    // Fazer chamada para o webhook n8n dinâmico
    return this.callWebhook(
      webhookUrl,
      agentId,
      input,
      session.access_token,
      0,
      arquivo,
      sessionId
    );
  }

  /**
   * Faz a chamada HTTP para o webhook n8n com retry logic
   */
  private static async callWebhook(
    webhookUrl: string,
    agentId: string,
    input: string,
    accessToken: string,
    retryCount: number,
    arquivo?: ArquivoPayload,
    sessionId?: string
  ): Promise<N8NAgentResponse> {
    try {
      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT
      );

      // Construir payload no formato esperado pelo n8n
      const payload: {
        agente: string;
        input: string;
        arquivo?: ArquivoPayload;
        sessionId?: string;
      } = {
        agente: agentId,
        input: input,
      };

      // Adicionar arquivo ao payload se fornecido
      if (arquivo) {
        payload.arquivo = arquivo;
      }

      // Adicionar sessionId ao payload se fornecido
      if (sessionId) {
        payload.sessionId = sessionId;
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const { text, json } = await this.readBody(response);
        const jsonObj: Record<string, unknown> | null =
          json && typeof json === "object" && json !== null
            ? (json as Record<string, unknown>)
            : null;

        const errorMessageFromBody =
          (typeof jsonObj?.error === "string" && jsonObj.error) ||
          (typeof jsonObj?.message === "string" && jsonObj.message) ||
          (text?.trim() ? text.trim().slice(0, 500) : "");

        const errorMessage =
          errorMessageFromBody || `Erro ${response.status}: ${response.statusText}`;

        // Retry em caso de erro 5xx ou timeout
        if (
          (response.status >= 500 || response.status === 408) &&
          retryCount < this.MAX_RETRIES
        ) {
          // Esperar antes de retry (backoff exponencial)
          await this.delay(1000 * Math.pow(2, retryCount));
          return this.callWebhook(
            webhookUrl,
            agentId,
            input,
            accessToken,
            retryCount + 1,
            arquivo,
            sessionId
          );
        }

        throw new Error(errorMessage);
      }

      // 204 = sem conteúdo (muito comum quando o workflow não retorna nada)
      if (response.status === 204) {
        throw new Error(
          "O webhook do n8n respondeu 204 (sem conteúdo). Configure o workflow para retornar JSON (ex: nó 'Respond to Webhook')."
        );
      }

      const { text, json } = await this.readBody(response);
      const trimmed = text.trim();

      if (!trimmed) {
        throw new Error(
          "O webhook do n8n respondeu com corpo vazio. Verifique se o workflow está retornando uma resposta (JSON) no final."
        );
      }

      // Se o endpoint devolveu HTML (ex: página de erro/proxy), não faz sentido jogar no chat.
      if (/^</.test(trimmed) && /<html[\s>]/i.test(trimmed)) {
        throw new Error(
          "O webhook do n8n retornou HTML (não JSON). Verifique se a URL do webhook está correta e se o endpoint está acessível."
        );
      }

      const data = json ?? trimmed;

      // Verificar se a resposta tem o formato esperado
      if (typeof data === "string") {
        return { output: data };
      }

      if (data.output !== undefined) {
        return { output: data.output };
      }

      if (data.response !== undefined) {
        return { output: data.response };
      }

      // Se não tiver formato esperado, tentar converter para string
      return { output: JSON.stringify(data, null, 2) };
    } catch (error) {
      // Tratar erro de timeout
      if (error instanceof Error && error.name === "AbortError") {
        // Retry em caso de timeout
        if (retryCount < this.MAX_RETRIES) {
          await this.delay(1000 * Math.pow(2, retryCount));
          return this.callWebhook(
            webhookUrl,
            agentId,
            input,
            accessToken,
            retryCount + 1,
            arquivo,
            sessionId
          );
        }
        throw new Error(
          "Tempo de espera esgotado. O agente está demorando muito para responder."
        );
      }

      // Re-throw outros erros
      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Erro desconhecido ao chamar o agente");
    }
  }

  /**
   * Delay helper para retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Valida se um agente existe
   */
  static validateAgent(agentId: string): boolean {
    return getAgentById(agentId) !== undefined;
  }
}
