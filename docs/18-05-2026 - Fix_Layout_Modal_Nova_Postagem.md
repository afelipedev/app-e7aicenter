# 18/05/2026 - Fix Layout Modal Nova Postagem

## Contexto

No modal de criação de postagem da feature de Equipes, o campo de título e o editor TipTap estavam causando estouro horizontal, ultrapassando os limites visuais do `DialogContent`.

## Objetivo

Garantir que o modal mantenha largura responsiva e contenha corretamente os elementos internos (input e editor), sem quebrar o layout.

## Implementação

- Arquivo alterado: `src/features/teams/components/channel/CreatePostDialog.tsx`
- Ajustes aplicados:
  - `DialogContent` com largura limitada ao viewport e `overflow-hidden`.
  - Estrutura interna com `min-w-0` para permitir contração correta em containers flex/grid.
  - Área de conteúdo do modal com altura máxima e `overflow-y-auto`.
  - Campo de título com `w-full min-w-0`.
  - `LegalKanbanRichTextEditor` com `className="min-w-0 max-w-full"` para respeitar os limites do modal.
  - `DialogFooter` com separação visual (`border-t`) e padding consistente.

## Resultado esperado

- O modal não estoura horizontalmente.
- O input de título permanece contido.
- A toolbar/conteúdo do TipTap respeita o espaço do modal.
- Em telas menores, o conteúdo interno passa a rolar verticalmente sem quebrar a estrutura.
