# Destaque de menções no chat e comentários (Teams)

**Data:** 18/05/2026

## O que foi implementado

### Componente `MentionHighlightedText`

- Novo componente em `src/features/teams/components/MentionHighlightedText.tsx`.
- Mesma lógica visual do kanban: menções em `font-medium text-blue-600 dark:text-blue-400`.
- Suporta nomes com várias palavras (ex.: `@Advogado Padrao`) usando lista de nomes conhecidos + fallback por regex para tokens `@usuario`.

### Chat da postagem (`MessageList`)

- Respostas exibem menções destacadas em azul.
- `PostPage` repassa os candidatos de menção do canal (`postMentionCandidates`) para reconhecimento correto.

### Comentários do card (`PostRightSidebar`)

- Comentários do kanban vinculado exibem menções destacadas.
- Query de comentários passa a incluir `legal_kanban_comment_mentions` com nome do usuário.
- Lista de membros do quadro (`cardMentionCandidates`) usada como reforço para nomes compostos.

## Arquivos alterados

- `src/features/teams/components/MentionHighlightedText.tsx` (novo)
- `src/features/teams/components/post/MessageList.tsx`
- `src/features/teams/components/post/PostRightSidebar.tsx`
- `src/features/teams/pages/PostPage.tsx`

## Observação

Os campos de composição (`Textarea`) continuam como texto simples; o destaque aparece após o envio, alinhado ao fluxo do kanban legal.
