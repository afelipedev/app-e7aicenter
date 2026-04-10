# Implantacao TipTapSimpleEditor Kanban

## Objetivo

Substituir o editor atual da descricao das tarefas do Kanban juridico por uma versao mais rica baseada no conceito do `TipTap Simple Editor`, mantendo o editor da feature de leads intacto.

## O que foi implementado

- Criado um editor novo e local da feature em `src/features/legal-kanban/components/editor/LegalKanbanRichTextEditor.tsx`.
- Criado o arquivo `src/features/legal-kanban/components/editor/extensions.ts` com a configuracao das extensoes do TipTap.
- Adicionado o estilo local `src/features/legal-kanban/components/editor/legal-kanban-rich-text-editor.css`.
- Substituido o editor da secao `Descricao` no card details sheet do Kanban em `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx`.
- Mantido o contrato de persistencia atual usando `descriptionJson` e `descriptionText`.
- Adicionado suporte a:
  - headings
  - negrito
  - italico
  - sublinhado
  - listas
  - checklist
  - blockquote
  - code block
  - color highlight
  - alinhamento
  - links
  - undo/redo
  - upload de imagem inline

## Responsividade

- Toolbar adaptada para diferentes larguras.
- Em telas menores, acoes secundarias ficam agrupadas no menu `Mais`.
- Em larguras intermediarias a toolbar passa para modo compacto usando `use-mobile` e `use-window-size`.
- A area de edicao manteve altura minima estavel para nao degradar a usabilidade dentro do sheet.
- O editor passou a limitar melhor overflow horizontal para nao ultrapassar a largura do modal da tarefa.
- A secao `Comentarios e atividade` foi movida para o final do modal, abaixo de `Checklists`, eliminando a sobreposicao lateral com o editor.
- Foi adicionado um atalho `Comentarios` no topo do modal e outro item equivalente no menu `Adicionar`, ambos rolando e focando a caixa de comentario.

## Storage inline das imagens

- O bucket atual `legal-kanban-attachments` permaneceu privado para anexos do card.
- Foi criado um bucket publico separado chamado `legal-kanban-inline-images` para imagens inline do editor.
- A migration foi registrada em `supabase/migrations/20260410110000_create_legal_kanban_inline_images_bucket.sql`.
- A migration tambem foi aplicada via MCP do Supabase durante a implementacao.
- O service `src/features/legal-kanban/services/legalKanbanService.ts` passou a expor `uploadInlineImage(cardId, file)` para retornar a URL publica persistente da imagem.

## Dependencias adicionadas

- `@tiptap/extension-image`
- `@tiptap/extension-link`
- `@tiptap/extension-placeholder`
- `@tiptap/extension-task-item`
- `@tiptap/extension-task-list`
- `@tiptap/extension-text-align`
- `@tiptap/extension-underline`

## Validacoes executadas

- Build de producao com `npm run build`: concluido com sucesso.
- Lint direcionado dos arquivos novos/alterados do editor: concluido com sucesso.
- `npm run lint` global continua falhando por erros legados fora do escopo desta implementacao.

## Observacao de verificacao manual

- O dev server estava funcional em `http://localhost:8081/`.
- A validacao visual completa do fluxo do Kanban ficou bloqueada pela tela de login, sem credenciais disponiveis para acessar a area autenticada.
