# 09/04/2026 — Modal Kanban: alinhamento dos indicadores de datas

## Alteração

No bloco “Datas programadas neste card” (`LegalKanbanCardDetailsSheet`), os indicadores (pontos coloridos e ícone de lembrete) passaram a alinhar com o texto usando **`items-center`** no `inline-flex` de cada linha, em vez de `items-baseline` com **`translate-y-0.5`** nos indicadores — o deslocamento vertical extra fazia os pontos ficarem fora do eixo visual do texto.

## Arquivo

- `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx`
