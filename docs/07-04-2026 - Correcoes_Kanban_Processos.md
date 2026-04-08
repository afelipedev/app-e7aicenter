# Correções e melhorias do Kanban de Processos

## Ajustes realizados

### 1. Correção na movimentação de cards entre raias
- Corrigido o fluxo de persistência em `src/features/legal-kanban/services/legalKanbanService.ts`.
- A atualização deixou de usar `upsert` parcial em `legal_kanban_cards`.
- Agora a reordenação atualiza os registros existentes com `update` sequencial por `id`, preservando `board_id` e eliminando o erro:
  - `null value in column "board_id" of relation "legal_kanban_cards" violates not-null constraint`

### 2. Correção na movimentação das raias
- Corrigido o fluxo de persistência da ordem das colunas em `legal_kanban_columns`.
- A atualização deixou de usar `upsert` parcial com apenas `id` e `position`.
- Agora a ordem é persistida com `update` por `id`, eliminando o erro:
  - `null value in column "board_id" of relation "legal_kanban_columns" violates not-null constraint`

### 3. Melhoria de reordenação na mesma raia
- Ajustado o cálculo do índice de destino ao mover cards dentro da mesma coluna.
- Evita deslocamentos incorretos ao arrastar um card para baixo dentro da própria raia.

### 4. Simplificação do layout
- Removido o hero card grande do topo.
- Removido o bloco com:
  - `Raias ativas`
  - `Membros elegíveis`
  - `Cards filtrados`
- Mantidos os botões:
  - `Dashboard de processos`
  - `Configurar board`
- O foco da página passou a ser:
  - ações compactas no topo
  - barra de filtros
  - board ocupando a maior área útil da tela

### 5. Melhorias de responsividade
- Reduzida a largura base das colunas.
- Reduzida a altura visual dos cards.
- Reduzidos paddings e espaçamentos gerais.
- Aumentada a área útil do board na viewport.
- Melhor equilíbrio visual para uso com sidebar aberta.

## Validações
- `npm run build` executado com sucesso.
- Lints dos arquivos alterados sem erros.
- Validação visual da página do Kanban concluída.

## Observação
- A automação de navegador não conseguiu simular o drag real com o helper nativo porque o `dnd-kit` não expõe `draggable` nativo para esse tipo de ferramenta.
- Ainda assim, a causa dos erros reportados foi corrigida diretamente no service responsável pelas mutações do Supabase.
