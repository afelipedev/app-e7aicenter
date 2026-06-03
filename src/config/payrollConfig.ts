/**
 * Configuração do módulo de holerites (N8N)
 * - VITE_N8N_WEBHOOK_HOLERITE: URL do webhook (opcional; usa fallback se ausente)
 */

const DEFAULT_HOLERITE_WEBHOOK =
  'https://n8n-lab-n8n.bjivvx.easypanel.host/webhook/processar-holerite';

export const PayrollConfig = {
  getWebhookUrl(): string {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_HOLERITE;
    return (webhookUrl && String(webhookUrl).trim()) || DEFAULT_HOLERITE_WEBHOOK;
  },
};
