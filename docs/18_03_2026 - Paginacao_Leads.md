# Paginação na Listagem de Leads

**Data:** 18/03/2026

## Resumo

Implementada paginação na listagem de leads (clientes e parceiros), exibindo 10 leads por página, utilizando o componente de paginação do shadcn/ui.

## Alterações Realizadas

### 1. LeadsService (`src/features/leads/services/leadsService.ts`)

- **ListLeadsParams**: Adicionados parâmetros opcionais `page` e `pageSize` para paginação.
- **ListLeadsResult**: Nova interface com `{ data: Lead[], total: number }`.
- **list()**: Passa a retornar `ListLeadsResult` em vez de `Lead[]`.
  - Quando `page` e `pageSize` são informados: usa `range()` e `count: 'exact'` do Supabase para paginação server-side.
  - Quando não informados: mantém comportamento anterior com `limit` (compatível com n8nLeadMessagingService).

### 2. n8nLeadMessagingService (`src/features/leads/services/n8nLeadMessagingService.ts`)

- Atualizado para desestruturar `{ data: leads }` do retorno de `LeadsService.list()`.

### 3. LeadsTable (`src/features/leads/components/LeadsTable.tsx`)

- Estado `page` para controlar a página atual.
- Constante `PAGE_SIZE = 10` (10 leads por página).
- `useLeads` passa a receber `page` e `pageSize`.
- `useEffect` para resetar a página ao mudar `leadType` ou `search`.
- Componente **Pagination** do shadcn/ui integrado:
  - Botões Anterior/Próximo.
  - Links numerados para cada página (com ellipsis quando há muitas páginas).
  - Texto informativo: "Exibindo X - Y de Z leads".
- Paginação exibida apenas quando `totalPages > 1`.

### 4. useSetLeadActive

- Passa a receber os mesmos `listParams` (incluindo `page` e `pageSize`) para invalidar corretamente o cache após alterações.

## Comportamento

- **Clientes e Parceiros**: A paginação funciona de forma independente para cada tipo. Ao alternar entre Clientes e Parceiros, a página é resetada para 1.
- **Busca**: Ao alterar o termo de busca, a página é resetada para 1.
- **Exportação**: Exporta os leads da página atual (já filtrados por tipo e busca).
