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
    return webhookUrl;
  }

  /**
   * Chama um agente n8n específico
   * @param agentId ID do agente
   * @param input Input do usuário
   * @param arquivo Arquivo opcional para anexar (formato: { nome, tipo, base64 })
   * @returns Resposta do agente
   */
  static async callAgent(
    agentId: string,
    input: string,
    arquivo?: ArquivoPayload
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
      arquivo
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
    arquivo?: ArquivoPayload
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
      } = {
        agente: agentId,
        input: input,
      };

      // Adicionar arquivo ao payload se fornecido
      if (arquivo) {
        payload.arquivo = arquivo;
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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error ||
          errorData.message ||
          `Erro ${response.status}: ${response.statusText}`;

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
            arquivo
          );
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

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
            arquivo
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
