# 23/06/2026 - Gestao_Operacional_Kanban

## Resumo

Implementação do módulo **Gestão Operacional** como segundo domínio de quadros kanban, reutilizando a infraestrutura `legal_kanban_*` com separação por coluna `domain`, rotas dedicadas, controle de acesso e compartilhamento bidirecional de cards com os quadros jurídicos.

## Rotas

| Rota | Descrição | Acesso |
|------|-----------|--------|
| `/gestao-operacional/quadros` | Listagem de quadros operacionais | `operational_kanban` |
| `/gestao-operacional/quadros/:boardSlug` | Board kanban operacional | `operational_kanban` |
| `/documents/cases/quadros` | Quadros jurídicos (inalterado) | Membros do quadro |

## Permissões

Nova permissão `operational_kanban` atribuída aos roles:

- `administrator`
- `it`
- `advogado_adm`

Sidebar e rotas filtram por essa permissão.

## Banco de dados

### Migrations aplicadas

1. `20260623100000_add_kanban_board_domain.sql` — coluna `domain` em `legal_kanban_boards` + RLS por domínio
2. `20260623110000_create_kanban_card_links.sql` — tabela `kanban_card_links` + helpers anti-loop
3. `20260623120000_kanban_card_link_sync_triggers.sql` — triggers de sync bidirecional
4. `20260623130000_fix_kanban_sync_comment_columns.sql` — correção sync de comentários (`content`)

### Domínios

- `legal` — quadros em `/documents/cases/quadros` (comportamento existente)
- `operational` — quadros em `/gestao-operacional/quadros` (somente board managers globais via RLS)

## Frontend

### Estrutura nova

- `src/features/kanban-shared/` — config, context, bridge service, dialog de compartilhamento
- `src/features/operational-kanban/pages/` — wrappers com `KanbanModuleProvider domain="operational"`

### Parametrização

Componentes existentes (`LegalBoardsHomePage`, `LegalKanbanPage`, hooks, service) passam a usar `KanbanModuleProvider` com config por domínio (paths, query keys, colunas default, textos).

## Compartilhamento Operacional ↔ Jurídico

### Edge Function

`kanban-card-bridge` com actions:

- `share_card` — cria card espelho + vínculo em `kanban_card_links`
- `unlink` — remove vínculo

### Fluxo UI

1. No card operacional → menu **Compartilhar com Jurídico**
2. Selecionar quadro jurídico + raia destino
3. Card espelhado criado; badge **Compartilhado** nos cards

### Sync automático (bidirecional)

| Sincroniza | Não sincroniza |
|------------|----------------|
| Título, descrição, status, prioridade, datas | Movimentação de raia/coluna |
| Comentários | Campos customizados por board |
| Anexos | `process_snapshot_id` |
| Checklists + itens | |
| Membros | |
| Etiquetas (match name+color) | |

Anti-loop via session flag `app.kanban_link_sync`.

## Testes manuais sugeridos

- [ ] Usuário `advogado` não vê menu Gestão Operacional
- [ ] `administrator`/`it`/`advogado_adm` acessam e criam quadros operacionais
- [ ] Listagem jurídica não exibe quadros `domain=operational`
- [ ] Compartilhar card operacional → jurídico na raia escolhida
- [ ] Editar título/comentário reflete no espelho
- [ ] Mover card de raia **não** move espelho
- [ ] Desvincular interrompe badge e link
