/**
 * Configuração do módulo de SPEDs
 * 
 * Variáveis de ambiente necessárias:
 * - VITE_N8N_WEBHOOK_SPED: URL do webhook n8n para processamento de SPEDs
 * - VITE_SPED_S3_BUCKET: Nome do bucket S3 para SPEDs processados
 * - VITE_SPED_S3_BASE_PATH: Caminho base no S3 (padrão: sped/)
 */

export const SpedConfig = {
  /**
   * URL do webhook n8n para processamento de SPEDs
   */
  getWebhookUrl(): string {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_SPED;
    if (!webhookUrl) {
      const errorMessage = `
╔══════════════════════════════════════════════════════════════╗
║  ERRO: Variável de Ambiente Não Configurada                 ║
╠══════════════════════════════════════════════════════════════╣
║  A variável VITE_N8N_WEBHOOK_SPED não está configurada.     ║
║                                                              ║
║  SOLUÇÃO:                                                     ║
║  1. Abra o arquivo .env na raiz do projeto                  ║
║  2. Adicione a linha:                                        ║
║     VITE_N8N_WEBHOOK_SPED=https://vieiraaguiaradvogados.app.n8n.cloud/webhook/upload-sped-efd
║                                                              ║
║  3. Reinicie o servidor de desenvolvimento                  ║
║                                                              ║
║  Veja CONFIGURAR_SPED_ENV.md para mais detalhes            ║
╚══════════════════════════════════════════════════════════════╝
      `.trim();
      throw new Error(errorMessage);
    }
    return webhookUrl;
  },

  /**
   * Nome do bucket S3 para SPEDs processados
   */
  getS3Bucket(): string {
    return import.meta.env.VITE_SPED_S3_BUCKET || 'e7sped-processados';
  },

  /**
   * Caminho base no S3
   */
  getS3BasePath(): string {
    return import.meta.env.VITE_SPED_S3_BASE_PATH || 'sped/';
  },

  /**
   * Constrói o caminho completo no S3 para um arquivo SPED processado
   * Estrutura: e7sped-processados/sped/CNPJ_EMPRESA/Data_COMPETENCIA/
   * 
   * @param cnpj CNPJ da empresa (sem formatação)
   * @param competencia Competência no formato MM/AAAA
   * @param filename Nome do arquivo
   * @returns Caminho completo no S3
   */
  buildS3Path(cnpj: string, competencia: string, filename: string): string {
    // Remove formatação do CNPJ (remove pontos, barras e hífens)
    const cnpjClean = cnpj.replace(/[.\-\/]/g, '');
    
    // Formata competência para Data_COMPETENCIA (MM_AAAA)
    const competenciaFormatted = competencia.replace('/', '_');
    
    // Constrói o caminho completo
    const basePath = this.getS3BasePath().replace(/\/$/, ''); // Remove barra final se houver
    return `${basePath}/${cnpjClean}/${competenciaFormatted}/${filename}`;
  },

  /**
   * Constrói a URL completa do S3 para download
   * Assumindo que o bucket está configurado para acesso público ou via signed URL
   * 
   * @param s3Path Caminho no S3 (retornado por buildS3Path)
   * @returns URL completa do arquivo no S3
   */
  buildS3Url(s3Path: string): string {
    const bucket = this.getS3Bucket();
    // Formata a URL do S3 (ajustar conforme sua configuração de região)
    // Exemplo: https://e7sped-processados.s3.amazonaws.com/sped/...
    return `https://${bucket}.s3.amazonaws.com/${s3Path}`;
  }
};
