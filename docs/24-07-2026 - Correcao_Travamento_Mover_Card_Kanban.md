# 24/07/2026 — Correção do travamento em "Movendo..." (mover card entre raias)

## Problema relatado

No modal de detalhes do card do Kanban, ao usar o componente de troca de raia e clicar em **Mover**, o botão às vezes ficava travado indefinidamente em "Movendo...".

## Causa raiz

`legalKanbanService.moveCard()` reindexava **todas** as posições da raia de origem e da raia de destino, uma linha por vez (`updateRowsSequentially` = 1 requisição HTTP por card).

Dados de produção no momento da análise:

| Raia | Cards |
|------|-------|
| Concluídos | **1.040** (1.032 arquivados + 8 concluídos) |
| Demais raias | 1 a 15 |

Ou seja, qualquer movimentação envolvendo a raia **Concluídos** disparava ~1.040 UPDATEs sequenciais, cada um acionando ainda os triggers `update_updated_at_column` e `trg_kanban_sync_linked_card_core`. O resultado prático é a UI presa em "Movendo..." por minutos — daí o "às vezes" (só acontecia quando Concluídos participava do movimento).

Fatores agravantes encontrados:

1. **Nenhuma chamada do serviço tinha timeout.** Se qualquer requisição travasse (queda de rede, `supabase.auth.getSession()` bloqueado durante refresh de token), a promise nunca resolvia e o botão ficava eternamente pendente.
2. O `update` do card não verificava erro nem se alguma linha foi realmente afetada — RLS podendo bloquear silenciosamente com toast de sucesso.
3. O reindex incluía cards **arquivados**, que nem aparecem na raia.
4. `destinationIndex` era calculado sobre a lista não filtrada (`board.columns[].cards`), divergindo da ordem exibida.
5. Raia "Concluídos" aparecia selecionável para perfis sem permissão; o erro só surgia após o clique em Mover.

## O que foi alterado

### `src/features/legal-kanban/services/legalKanbanService.ts`

- **`moveCard()` reescrito**: em vez de reindexar raias inteiras, calcula a posição do card entre os dois vizinhos (`resolvePositionBetween`, com gap de 100) e faz **uma única** requisição de UPDATE. A reindexação só acontece no caso raro de não haver espaço entre os vizinhos — e apenas na raia de destino, sem cards arquivados.
- Passou a validar `error` e retorno vazio do UPDATE (`.select("id").maybeSingle()`), lançando erro claro quando o card não é encontrado ou a permissão bloqueia a alteração.
- Adicionado `withTimeout` (15s, mesmo padrão de `chatService` e `teams/*Service`) em: `getCurrentPublicUser` (inclusive no `auth.getSession()`), `updateRowsSequentially`, consultas e updates de `moveCard`, `moveCardToColumn` e `logActivity`.
- `moveCardToColumn()`: substituída a leitura de todos os cards da raia por `order + limit 1` para obter a maior posição.
- `logActivity()`: falha de auditoria não derruba mais a operação do usuário (log via `console.warn`).

### `src/features/legal-kanban/components/MoveKanbanCardPopover.tsx`

- Guarda contra clique duplo / movimentação concorrente.
- `destinationIndex` passa a desconsiderar cards arquivados.
- O popover fecha imediatamente ao confirmar e o **estado "Movendo..." migrou para o botão-gatilho** (com spinner), já que o painel do card remonta após a invalidação e antes o feedback se perdia.
- Raias do tipo `done` ficam desabilitadas com o rótulo "(sem permissão)" para perfis que não são Administrador/Advogado Administrativo.

### `src/features/legal-kanban/pages/LegalKanbanPage.tsx`

- `destinationIndex` do drag-and-drop passou a ser calculado sobre `filteredColumns` (lista efetivamente renderizada), ficando consistente com o cálculo do serviço.

## Impacto

- Mover um card de/para "Concluídos": de ~1.040 requisições sequenciais para **1 requisição**.
- Nenhum estado de carregamento pode mais ficar preso: toda chamada expira em 15s com mensagem ao usuário.
- Falhas silenciosas de RLS agora viram erro visível em vez de toast de sucesso.

## Segunda parte: carga do quadro (cards arquivados sob demanda)

`getBoardData()` carregava e hidratava **todos** os cards do quadro, incluindo os arquivados, que a UI descartava depois. No quadro "Jurídico VAA": 1.123 cards carregados para exibir 91 — e isso se repetia em cada refetch, inclusive no disparado logo após mover um card.

### `legalKanbanService.ts`

- `getBoardContext()` passou a filtrar `status <> 'arquivado'` na consulta de cards. A coluna é `NOT NULL DEFAULT 'ativo'`, então nenhum card fica de fora por comparação com NULL.
- Novo `getArchivedItems(boardId)`: retorna os cards arquivados (de raias visíveis, já hidratados) e as raias arquivadas com a contagem de cards. Roda apenas quando a central "Itens Arquivados" é aberta.

### `useLegalKanbanBoard.ts`

- Novo `useLegalKanbanArchivedItems(boardId, enabled)`, com `enabled` amarrado ao `open` do diálogo.
- A chave `[prefix, "board", boardId, "archived"]` fica sob o prefixo `board` de propósito: as mutações de card/raia já invalidam `boardPrefix()`, então arquivar, desarquivar e excluir continuam atualizando a lista sem código novo de invalidação.

### `LegalKanbanArchivedItemsDialog.tsx`

- Passou a consumir a query dedicada; recebe `boardId` em vez do `LegalKanbanBoardData` inteiro.
- Estado "Carregando itens arquivados..." nas duas abas.
- O contador da aba "Raias" mostra "N card(s) na raia" (antes dizia "arquivado(s)", mas contava todos os cards da raia arquivada).

### Impacto na movimentação de cards

Nenhuma regressão — o caminho ficou mais leve e consistente:

- `moveCard()` já calcula posições ignorando arquivados (`.neq("status","arquivado")`), exatamente o mesmo conjunto que o quadro agora carrega.
- O refetch do quadro após cada movimentação passa de 1.123 para 91 cards (-92%), com a hidratação (membros, etiquetas, RPC de engajamento) proporcionalmente menor.
- Menos risco no truncamento de ~1.000 linhas do PostgREST, que já havia motivado o batching em `fetchCardLabelRows`/`hydrateCards`.
- `ShareKanbanCardDialog` usa apenas as raias de `getBoardData`, então só se beneficia.

### Mudança de comportamento conhecida

Recarregar a página com `?card=<id-de-card-arquivado>` não reabre mais o modal automaticamente, porque o guard usa a lista de cards do quadro. Abrir o card pela central de Itens Arquivados continua funcionando normalmente.

## Verificação

- `npx tsc --noEmit -p tsconfig.app.json` — sem novos erros (6 erros pré-existentes do arquivo foram eliminados).
- `npx eslint` nos arquivos alterados — sem novos problemas (48 → 47, restantes são `no-explicit-any` pré-existentes).
- `npm run build` — sucesso.
