# 29/06/2026 - Correção do Download de PDF do Holerite (S3) e Revisão de Segurança

## Contexto

Na página de detalhes da empresa (`/companies/:companyId/payrolls`), o botão de
visualizar/baixar o **PDF** do holerite (ícone na tabela "Histórico de Processamentos")
apresentava o erro **"Arquivo não disponível — O arquivo PDF não está disponível para download"**.

Além disso, foi solicitada uma revisão de segurança quanto à exposição de
`apikey` e `Authorization` nos headers das requisições no navegador.

---

## 1. Diagnóstico (causa raiz)

O fluxo `handleDownloadPDF` buscava os arquivos do processamento e procurava por
`payroll_files.s3_url`. Investigação (via SQL/MCP e leitura do workflow N8N):

- **`s3_url` está `null` em 100% dos registros** de `payroll_files`.
- O `webhook_response` do N8N retorna **`urls.pdf: null`** — havia ainda um bug de lógica
  em [`payrollService.ts`](../src/services/payrollService.ts) (a URL do PDF só era persistida
  quando o RPC `receive_processing_result` **falhava**).
- Porém o workflow do N8N **realmente faz upload do PDF original para o S3**, com uma
  **chave determinística** (ver [`webhook-processador-holerites.json`](lote-holerites/webhook-processador-holerites.json)):

  ```
  e7-holerite/{slug(company_name)}/{ano}/{MM_AAAA}/{file_id}.pdf
  slug = company_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  ```

- **Descoberta decisiva** (validada com `HEAD`/`GET` no bucket real `e7pdf-holerite`):
  - **Excel** → HTTP **200** (objeto público).
  - **PDF** → HTTP **403** (objeto **privado**, pois o nó subia com `acl: private`).

Ou seja: a URL podia ser reconstruída, mas o objeto PDF era privado e bloqueava o download direto.

---

## 2. Alterações no Frontend

### `src/services/payrollService.ts`
- Novo helper **`PayrollService.buildHoleritePdfUrl(companyName, competencia, fileId)`**:
  reconstrói a URL do PDF no S3 replicando **exatamente** a lógica de chave do N8N
  (slug da empresa, ano, `MM_AAAA`, `file_id`). Constante `HOLERITE_S3_BUCKET_URL`.

### `src/pages/PayrollManagement.tsx`
- `handleDownloadPDF` reescrito: para cada arquivo do processamento, resolve a URL do PDF
  usando `s3_url` legado quando existir, senão **`buildHoleritePdfUrl`**, e baixa via
  `PayrollService.downloadFile` (mesmo fluxo seguro por blob do Excel). Suporta lote
  (baixa múltiplos PDFs) e exibe mensagens de erro claras.

---

## 3. Alteração no N8N (decisão do cliente)

Para permitir o download direto do PDF (mantendo a URL determinística), o objeto precisa ser
**publicamente legível** — assim como o Excel já é. O nó **"Upload PDF para S3"** foi ajustado
no export do workflow:

```diff
- "acl": "private"
+ "acl": "publicRead"
```

> ⚠️ **Risco de segurança aceito pelo cliente:** tornar os PDFs públicos expõe holerites
> (dado sensível) a qualquer pessoa que conheça/adivinhe a URL no bucket. A alternativa segura
> (Edge Function com assinatura AWS SigV4, mantendo o objeto privado) foi apresentada e **não**
> foi a escolhida.

### Ações necessárias para efetivar (fora deste repositório)
1. **Aplicar a mudança no N8N em produção**: importar/editar o workflow no ambiente N8N e
   republicar (a alteração no JSON aqui é apenas a fonte/documentação).
2. **PDFs já existentes continuam privados (403).** A mudança só vale para **novos uploads**.
   Para holerites antigos ficarem baixáveis, alterar o ACL retroativamente na AWS
   (ex.: `aws s3 cp --recursive --acl public-read` no prefixo `e7-holerite/` do bucket
   `e7pdf-holerite`, ou via console S3) **ou** reprocessar os lotes.

---

## 4. Revisão de Segurança (headers `apikey` / `Authorization`)

**Conclusão: não há vazamento de credencial sensível.** Comportamento padrão e seguro do Supabase:

- `apikey` = **anon/publishable key**, projetada para ser pública (protegida por RLS).
- `Authorization: Bearer <JWT>` = token do usuário logado (curta duração).
- **Nenhum `service_role`** no bundle do cliente — [`supabase.ts`](../src/lib/supabase.ts) usa só a
  anon key e bloqueia `supabaseAdmin` no browser via Proxy.
- **RLS verificada** nas tabelas `payroll_files` e `payroll_processing`: políticas de
  SELECT/INSERT/UPDATE/DELETE restritas a usuários autenticados **donos da empresa**
  (`companies.created_by = auth.uid()`) ou com papéis `administrator/it/advogado_adm/contabil`.
  Não há políticas permissivas (`USING (true)`).

### Endurecimento aplicado
- Removido o `console.log('Supabase configuration loaded', ...)` em
  [`src/lib/supabase.ts`](../src/lib/supabase.ts) (logava URL/config no console do navegador).

---

## Arquivos alterados

- [`src/services/payrollService.ts`](../src/services/payrollService.ts) — helper `buildHoleritePdfUrl`.
- [`src/pages/PayrollManagement.tsx`](../src/pages/PayrollManagement.tsx) — `handleDownloadPDF`.
- [`src/lib/supabase.ts`](../src/lib/supabase.ts) — remoção do log de configuração.
- [`docs/lote-holerites/webhook-processador-holerites.json`](lote-holerites/webhook-processador-holerites.json) — `acl: publicRead` no upload do PDF.

## Validação
- URL reconstruída conferida contra a chave real do S3 (formato bate com o objeto existente).
- Lint sem novos erros (permanecem apenas warnings/erros `no-explicit-any` pré-existentes).
