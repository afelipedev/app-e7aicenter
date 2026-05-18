# 18-05-2026 - Ajuste Chat da Postagem (Mensagens Nativas + Delete Direto)

## Contexto

O componente de chat da postagem estava exibindo entradas que não são respostas nativas do chat (itens espelhados do card do Kanban), e a exclusão de mensagem fazia `PATCH` em `post_messages`, gerando erro de RLS (`403`) em alguns ambientes.

## O que foi implementado

### 1) Chat da postagem exibe apenas respostas nativas

Arquivo:
- `src/features/teams/services/messageService.ts`

Ajuste:
- Na listagem de mensagens (`listByPost`), foi adicionado filtro:
  - `.is("mirrored_card_comment_id", null)`

Efeito:
- O chat passa a mostrar somente mensagens próprias da conversa da postagem.
- Mensagens espelhadas de comentário do card deixam de aparecer no painel de respostas.

### 2) Exclusão de mensagem sem PATCH (evita 403 da policy de UPDATE)

Arquivo:
- `src/features/teams/services/messageService.ts`

Ajuste:
- O método `deleteMessage` passou de soft-delete por `UPDATE deleted_at` para `DELETE` direto:
  - `supabase.from("post_messages").delete().eq("id", messageId)`

Efeito:
- Elimina o erro de `PATCH ... 403 new row violates row-level security policy`.
- Fluxo de propagação (`mirror_delete_comment`) continua sendo executado após exclusão.

## Resultado esperado

- O bloco de respostas do chat da postagem não mistura mais conteúdos espelhados do card.
- Excluir mensagem não dispara mais tentativa de `PATCH` em `post_messages`.
