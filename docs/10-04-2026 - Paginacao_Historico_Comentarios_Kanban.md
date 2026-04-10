# 10/04/2026 — Paginação do histórico de comentários e atividades (Kanban)

## Objetivo

No painel do card (`LegalKanbanCardDetailsSheet`), o bloco **Comentários e atividade** passou a exibir o histórico unificado com paginação local.

## Comportamento

- **5 itens por página**, do **mais recente para o mais antigo** (a ordenação já existia no `useMemo` do `timeline`; apenas fatiamos a lista para exibição).
- Cada linha mostra o tipo (**Comentário** ou **Atividade**) e a **data e hora** no formato local `dd/MM/yyyy · HH:mm` (`formatKanbanDatetimeLocal`), com `datetime` ISO no elemento `<time>` para acessibilidade.
- Controles **Anterior / Próximo**, números de página e reticências quando há mais de 7 páginas (mesmo padrão de outras telas do projeto).
- Resumo textual: página atual, total de páginas e total de registros.
- Ao **trocar de card**, a página do histórico volta para **1**.
- Após **adicionar um comentário**, a página volta para **1** para exibir o item mais recente.

## Arquivos

- `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx` — estado `timelinePage`, fatia `paginatedTimeline`, UI de paginação e data/hora.

## Banco de dados

Nenhuma alteração de schema ou migração; a paginação é feita no cliente sobre os dados já retornados por `getCardDetails`.
