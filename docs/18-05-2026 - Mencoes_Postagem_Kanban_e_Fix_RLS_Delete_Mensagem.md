# 18-05-2026 - Menções em Postagem/Kanban e Fix RLS Delete de Mensagem

## Contexto

Foram solicitados quatro ajustes funcionais:

1. Campo de comentário do card na sidebar da postagem com suporte a menções (`@`) igual ao modal do card no Kanban.
2. Campo de resposta do chat da postagem com suporte a menções (`@`) igual ao comentário do card.
3. Ao abrir um card pela sidebar da postagem, redirecionar para o quadro e já abrir o modal de detalhes do card automaticamente.
4. Corrigir erro `403 / RLS` ao deletar mensagem de chat (`post_messages`).

## Planejamento executado

- Reutilizar e centralizar helpers de menção para evitar duplicação.
- Aplicar UX de menção (detecção de `@`, lista de candidatos, inserção no texto) nos dois campos solicitados.
- Garantir persistência de IDs mencionados no envio de mensagens de chat.
- Ajustar o Kanban para respeitar query param `card` e abrir o modal automaticamente.
- Corrigir RLS via migration específica para `post_messages_update` preservando soft-delete.

## Implementações

### 1) Menções reutilizáveis (DRY)

Arquivo:
- `src/features/teams/utils.ts`

Adicionados helpers compartilhados:
- `extractMentionQuery`
- `replaceLastMentionWithUser`
- `collectMentionUserIdsFromText`
- `MentionCandidate`

### 2) Menções no comentário do card (sidebar da postagem)

Arquivo:
- `src/features/teams/components/post/PostRightSidebar.tsx`

Ajustes:
- Campo de comentário agora detecta `@` e abre lista de membros do board.
- Seleção de membro injeta `@Nome` no texto.
- IDs mencionados são extraídos por nome e enviados ao salvar comentário.
- Fluxo de comentário passou a usar `legalKanbanService.addComment(...)` e `legalKanbanService.deleteComment(...)` para manter comportamento consistente (incluindo espelhamento e menções).

### 3) Menções no composer do chat da postagem

Arquivo:
- `src/features/teams/components/post/MessageComposer.tsx`

Ajustes:
- Suporte a `@` com dropdown de candidatos.
- Inserção de menção no texto ao selecionar usuário.
- Extração de `mention_user_ids` no envio.

### 4) Candidatos de menção no contexto do post

Arquivo:
- `src/features/teams/pages/PostPage.tsx`

Ajustes:
- Busca de candidatos de menção do canal:
  - Canal privado: `channel_members`
  - Canal público: `team_members`
- Filtra apenas usuários ativos.
- Passa candidatos para o `MessageComposer`.

### 5) Persistência de menções no envio de mensagens

Arquivos:
- `src/features/teams/services/messageService.ts`
- `supabase/functions/teams-message-send/index.ts`

Ajustes:
- `messageService.sendMessage` agora aceita `mention_user_ids`.
- Edge Function `teams-message-send` passa a aceitar `mention_user_ids` no body.
- Menções finais passam a unir:
  - menções extraídas do `content_json` (fluxo existente), e
  - menções explícitas enviadas pelo composer.
- IDs recebidos são filtrados para usuários ativos e permitidos no contexto do post.

### 6) Abrir modal do card ao redirecionar para o Kanban

Arquivo:
- `src/features/legal-kanban/pages/LegalKanbanPage.tsx`

Ajustes:
- Leitura de `?card=<id>` via `useSearchParams`.
- Ao carregar board e existir card válido na URL, abre automaticamente o modal de detalhes.
- Ao abrir/fechar card pelo Kanban, sincroniza/remover o query param `card`.

### 7) Correção de RLS no soft-delete de mensagens

Arquivo:
- `supabase/migrations/20260518145000_fix_post_messages_soft_delete_rls.sql`

Ajuste:
- Recriada policy `post_messages_update` com `WITH CHECK` explícito para UPDATE, garantindo:
  - autor da mensagem ou admin do canal pode atualizar;
  - update continua restrito a canal legível (`channels_can_read`).

## Validação

- Lints dos arquivos alterados de frontend e serviços sem novos erros.
- Observação: o arquivo de Edge Function mantém os avisos de ambiente Deno já esperados pelo linter do workspace.

