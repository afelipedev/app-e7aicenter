# 18-05-2026 - Isolamento Chat da Postagem (sem espelhar no card)

## Contexto

As mensagens enviadas no chat da postagem estavam sendo espelhadas para comentários do card do Kanban, causando mistura indevida entre dois contextos diferentes.

## O que foi ajustado

### 1) Remoção do espelhamento post -> card no envio do chat

Arquivo:
- `src/features/teams/components/post/MessageComposer.tsx`

Mudanças:
- Removida a chamada para `kanbanBridgeService.mirrorComment` com `direction: "post_to_card"`.
- O envio agora grava apenas via `messageService.sendMessage(...)`.
- Removida invalidação de query de card que só fazia sentido no fluxo de espelhamento.

### 2) Resultado funcional esperado

- Mensagens enviadas no chat da postagem ficam apenas no chat da postagem.
- Comentários do card não recebem mais mensagens vindas do chat.
- O realtime do chat permanece ativo (assinatura em `post_messages` continua via `usePostMessages`).

## Observação

Mensagens espelhadas antigas já existentes continuam no banco, mas já estão ocultas no chat da postagem pela regra de listagem aplicada anteriormente (`mirrored_card_comment_id IS NULL`).
