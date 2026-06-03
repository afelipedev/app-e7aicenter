# 03/06/2026 — Diagnóstico: lote com várias competências (só uma no Excel)

## Sintoma

Upload de 3 PDFs (ex.: 05/2023, 02/2024, 08/2024). O `processing_logs` mostra `files_count: 3`, `data.competencias` com as três competências e XLSX com nome `holerite_lote_05_2023-02_2024-08_2024_...`, mas o **Excel consolidado** traz rubricas apenas da competência mais antiga (05/2023).

## Conclusão

| Camada | Envio / comportamento |
|--------|------------------------|
| **Front + `payrollService`** | Correto: `POST` JSON com `arquivos[]`, cada item com `pdf_base64`, `competencia`, `file_id`, `filename`. |
| **Resposta N8N (metadados)** | Recebeu 3 arquivos (`total_arquivos: 3`, `competencias` completas). |
| **Workflow N8N** | Bug no nó **Processar e Calcular**: usava `$('Validar e Preparar Dados').first().json` e `competenciaFinal` única para **todas** as rubricas de **todos** os PDFs → coluna Período = só 05/2023. |

## Correção no N8N (obrigatória para Excel correto)

1. Abrir o workflow `processar-holerite` no N8N.
2. No nó **Processar e Calcular**, substituir o código pela versão em `docs/lote-holerites/webhook-processador-holerites.json` (atualizado neste repositório).
3. Lógica nova:
   - `$('Validar e Preparar Dados').all()` — um metadado por PDF.
   - Para cada saída do **AI Agent** (`$input.all()[idx]`), usar `competencia` do JSON extraído ou `meta.competencia` do arquivo correspondente.
   - Chave de deduplicação inclui competência: `competencia|codigo|nome|valor`.

4. Publicar/ativar o workflow e reprocessar um lote de teste.

## Melhorias na aplicação (implementadas)

- Ordenação do payload `arquivos[]` por competência antes do `POST` (igual ao N8N).
- Log `DEBUG` com `file_id`, `filename`, `competencia` por arquivo (sem base64).
- `validateBatchWebhookResponse`: alerta quando `data.competencia` = só a primeira do lote com `data.competencias` > 1.
- `batch_validation` persistido em `webhook_response` + aviso em **Detalhes do processamento**.

## Como validar após deploy N8N

1. Enviar 2–3 PDFs com competências distintas.
2. Abrir o XLSX: coluna **Período** deve listar cada MM/AAAA e subtotais por período.
3. Em detalhes do processamento, não deve aparecer o alerta “Revise o Excel consolidado”.

## Referências

- Contrato front: `docs/lote-holerites/frontend-ajustes-holerite.md`
- Workflow: `docs/lote-holerites/webhook-processador-holerites.json`
- Implementação upload: `docs/02-06-2026 - Upload_Lote_Holerites_Competencia_Individual.md`
