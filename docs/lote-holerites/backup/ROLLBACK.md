# Rollback — Workflow E7-LotePDF-Holerites (yWiDyYB7gLhFpLBq)

Snapshot tirado antes da rearquitetura assíncrona (29/06/2026).

- **Workflow ID:** `yWiDyYB7gLhFpLBq`
- **versionId (estado pré-mudança):** `7e3d700b-8f13-4e67-af1a-651e797953de`
- **activeVersionId:** `7e3d700b-8f13-4e67-af1a-651e797953de`
- **versionCounter:** 5
- **errorWorkflow já configurado:** `I0qhbP5Tnm5ek25C` (🚨 Error Handler - CPFE AI-Powered)
- **binaryMode:** separate · **timezone:** America/Sao_Paulo

## Como reverter
1. Via MCP/n8n: restaurar a versão `7e3d700b-8f13-4e67-af1a-651e797953de`
   (ferramenta `n8n_workflow_versions` / histórico de versões na UI).
2. Referência de estrutura: `docs/lote-holerites/webhook-processador-holerites.json`
   (cópia praticamente idêntica ao estado de produção pré-mudança, exceto o `acl: publicRead`
   do PDF que já foi aplicado intencionalmente).

## Estrutura original (resumo)
Webhook(responseNode) → Validar e Preparar Dados → Deduplicar Execução → É Execução Duplicada?
- [true] → Responder Execução Duplicada
- [false] → [Extract text → Preparar Texto Único → Preparar chatInput → AI Agent → Processar e Calcular
            → Formatar Dados XLSX → Converter para XLSX → Adicionar Metadados ao XLSX → Upload XLSX para S3
            → Recuperar Metadados → Preparar Resposta → **Responder Webhook**]
            , Upload PDF para S]

Resposta era **síncrona** no nó final "Responder Webhook".
