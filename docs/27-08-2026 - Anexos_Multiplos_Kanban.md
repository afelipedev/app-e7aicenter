# 27/08/2026 - Anexos Múltiplos e Correção Integer no Kanban

Correção do erro intermitente ao anexar arquivos no modal do card e suporte a envio de vários arquivos de uma vez.

## Problemas

1. **`invalid input syntax for type integer`** ao anexar arquivos (intermitente).
2. O seletor de arquivos do modal só aceitava **um arquivo por vez**.

## Causa do erro de integer

O trigger `kanban_enforce_created_by_and_limit` (BEFORE INSERT em anexos e cards) fazia:

```sql
v_count := COALESCE(current_setting('app.kanban_insert_count', true), '0')::int + 1;
```

`current_setting(..., true)` devolve `NULL` quando a variável não existe, mas em conexões pooled do Supabase pode devolver **string vazia** (`''`). `COALESCE` não trata string vazia, e `''::int` gera exatamente `invalid input syntax for type integer`. O mesmo padrão existia em `kanban_enforce_author_and_limit` (comentários).

## Alterações

### Banco (`20260827140000_fix_kanban_insert_count_integer_cast.sql`)

- Lê o GUC com `NULLIF(btrim(...), '')`.
- Só faz `::int` se o valor for numérico (`^[0-9]+$`); caso contrário, zera o contador.

Aplicado no projeto remoto via MCP.

### Upload (`legalKanbanService.ts`)

- Path único por arquivo (`UUID + nome sanitizado`), para não colidir ao enviar vários no mesmo milissegundo.
- `file_size` só é gravado se for um número finito.
- `contentType` / `mime_type` usam `application/octet-stream` quando o browser não informa o tipo.
- Se o INSERT no banco falhar depois do Storage, o objeto enviado é removido (evita arquivo órfão).

### UI (`LegalKanbanCardDetailsSheet.tsx`)

- `<input type="file" multiple>` — o usuário pode selecionar vários arquivos de uma vez.
- Envio sequencial; toasts de sucesso parcial se alguns falharem.
- Limite de 20 arquivos por seleção (`LEGAL_KANBAN_ATTACHMENT_MAX_FILES`).
- Botões: "Escolher arquivos" / "Adicionar".
- Os arquivos são copiados para um array **antes** de resetar o input. `FileList` é uma coleção live: `input.value = ""` esvaziava a lista e o upload saía sem toast.

## Como validar

1. Abrir um card do kanban → Anexos → Adicionar.
2. Selecionar **vários** arquivos permitidos (pdf, docx, imagens, etc.) e confirmar que todos aparecem na lista.
3. Tentar um arquivo > 50 MB: deve recusar só esse, sem bloquear os demais.
4. Anexar arquivos novamente: não deve mais aparecer `invalid input syntax for type integer`.
