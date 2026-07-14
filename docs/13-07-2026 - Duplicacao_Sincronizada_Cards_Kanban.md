# 13/07/2026 - Duplicação sincronizada de cards no Kanban

## Objetivo

Permitir duplicar um card do kanban em outra raia do mesmo quadro, pelo menu de ações (3 pontinhos) do modal de detalhes. A cópia recebe todo o conteúdo do card original e, a partir daí, original e cópias ficam **sincronizados**: qualquer alteração em um deles atualiza os demais. Todos os cards do grupo exibem uma badge **"Duplicado"** no board.

### Regras definidas

- Um card pode ter **várias cópias** (uma por raia). Original + cópias formam um **grupo sincronizado**.
- Sincroniza: título, descrição, status, prioridade, cor de capa, datas (início, prazo, lembrete, recorrência, conclusão), membros, etiquetas, checklists e itens, comentários e anexos.
- **Não** sincroniza raia (`column_id`) nem posição — cada cópia vive na sua raia e pode ser movida livremente.
- **Excluir** um card do grupo remove **apenas** aquele card; os demais permanecem intactos.
- **Desvincular** interrompe a sincronização mantendo os cards: numa cópia, desvincula só ela; no card original, dissolve o grupo.

## Como foi implementado

A funcionalidade **reaproveita a infraestrutura de espelhamento** já existente para o "Compartilhar com Jurídico" (tabela `kanban_card_links` + triggers de sync no Postgres + edge function `kanban-card-bridge`), generalizando-a de par 1:1 para grupo 1:N.

### Banco de dados

**`supabase/migrations/20260713120000_kanban_card_duplicate_links.sql`**

- `kanban_card_links` ganhou `link_type` (`'share'` | `'duplicate'`).
- As constraints `UNIQUE(source_card_id)` / `UNIQUE(target_card_id)` — que limitavam a 1 vínculo por card — viraram **índices únicos parciais** válidos apenas para `link_type = 'share'`, preservando a semântica 1:1 do compartilhamento e liberando N cópias por card.
- Nova função `kanban_linked_peer_card_ids(card_id)` (`SETOF UUID`): resolve **todos** os pares de um card. Para duplicatas, identifica a raiz do grupo (o card original) e devolve raiz + demais cópias — é o que garante que editar a cópia B propague tanto para o original A quanto para a cópia C.
- `legal_kanban_comments` ganhou `mirror_group_id`, que agrupa um comentário e todos os seus espelhos (o antigo `mirrored_card_comment_id`, sendo um único UUID, não representa N espelhos).

**`supabase/migrations/20260713121000_kanban_multi_peer_sync.sql`**

- Todas as funções de trigger de sync passaram a iterar sobre `kanban_linked_peer_card_ids()` em vez de um único par.
- Nova trigger `BEFORE DELETE` em `legal_kanban_cards` que ativa a flag anti-sync da transação, garantindo que excluir um card do grupo não apague o conteúdo dos demais via cascade.

### Edge function `kanban-card-bridge`

- Nova action **`duplicate_card`** (`{ source_card_id, target_column_id }`): valida que a raia é do mesmo quadro, checa permissão de edição do quadro, resolve a raiz do grupo (duplicar uma cópia adiciona ao mesmo grupo, sem cadeias), cria o card espelho, copia as relações e cria o vínculo `link_type = 'duplicate'`. Registra atividades `card_duplicated` / `card_duplicated_mirror`.
- Action **`unlink`** agora aceita `link_type` opcional e lida com N vínculos por card.

### Frontend

| Arquivo | Mudança |
|---|---|
| `src/features/kanban-shared/components/DuplicateKanbanCardDialog.tsx` | **Novo.** Modal com `Select` das raias não arquivadas do quadro (usa `board.columns`, sem query extra). |
| `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx` | Itens **Duplicar** e **Desvincular cópia** no menu de 3 pontinhos + `AlertDialog` de confirmação do desvínculo. |
| `src/features/legal-kanban/pages/LegalKanbanPage.tsx` | Badge **"Duplicado"** (violeta) no `CardPreview`, ao lado das badges "Postagem" e "Compartilhado". |
| `src/features/legal-kanban/services/legalKanbanService.ts` | `hydrateCards` preenche `isDuplicate`; `getCardDetails` preenche `duplicateInfo` (`isRoot`, `peerCount`). |
| `src/features/kanban-shared/services/kanbanCardBridgeService.ts` | `duplicateCard()` e `unlink(cardId, linkType)`. |
| `src/features/legal-kanban/types.ts` | `LegalKanbanCard.isDuplicate`, `LegalKanbanCardDetails.duplicateInfo`, tipo `KanbanCardDuplicateInfo`. |

## Bugs pré-existentes corrigidos

O caminho da duplicação exercita a mesma sincronização usada pelo compartilhamento, e três defeitos vieram à tona:

1. **Anexos nunca sincronizavam.** As triggers e a `copyCardRelations` da edge function usavam a coluna `file_name`, que não existe em `legal_kanban_attachments` (a coluna é `name`). Anexar arquivo em card vinculado quebrava a trigger.
2. **Cópia duplicava conteúdo no card de origem.** Em `share_card`, o vínculo era criado **antes** de copiar as relações, então as triggers espelhavam de volta cada insert da cópia (checklists e anexos duplicavam no original). Agora a cópia acontece antes da criação do vínculo — sem par, as triggers não fazem nada.
3. **Excluir um card vinculado apagava conteúdo do par.** O cascade da exclusão disparava as triggers de DELETE de comentários/anexos/checklists/membros, que espelhavam as remoções no card vinculado. Resolvido pela trigger `BEFORE DELETE` que suprime o sync na transação.

## Verificação executada

Testes em SQL no banco (cenário isolado, cards de teste removidos ao final):

- `kanban_linked_peer_card_ids` a partir da cópia B devolve o original A **e** a cópia C.
- Editar título/prioridade na cópia B propagou para A e C; comentário criado em C e anexo criado em A espelharam nos demais cards do grupo.
- Excluir a cópia B manteve A e C intactos (comentários, anexos, checklists e membros preservados) e removeu apenas o vínculo dela.
- Desvincular a cópia C interrompeu a sincronização: edição posterior em A não propagou.

Build de produção (`npm run build`) passa; nenhum erro novo de TypeScript nos módulos alterados.
