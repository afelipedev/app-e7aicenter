# Modal excluir anexo — quebra de linha no nome do arquivo

**Data:** 03/06/2026

## Problema

No modal de confirmação **"Excluir anexo?"** do Kanban jurídico, nomes de arquivo longos (sem espaços, com underscores) ultrapassavam a largura do `AlertDialog`, quebrando o layout visual.

## Solução

- `AlertDialogDescription`: classe `break-words` para o parágrafo respeitar a largura do modal.
- `<span>` do nome do arquivo: classe `break-all` para permitir quebra em qualquer caractere em strings longas contínuas.

## Arquivos alterados

- `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx` — modal do card do Kanban.
- `src/features/teams/components/post/PostRightSidebar.tsx` — mesmo padrão no modal de anexos de postagens (consistência).

## Como validar

1. Abrir um card do Kanban com anexo de nome longo (ex.: `QUESTIONARIO_DE_ROUBO_E_FURTO_...docx`).
2. Clicar em excluir anexo e confirmar que o nome quebra em várias linhas dentro do modal, sem overflow horizontal.
