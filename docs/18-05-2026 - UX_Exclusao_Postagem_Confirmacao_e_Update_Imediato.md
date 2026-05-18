# 18-05-2026 - UX Exclusao Postagem Confirmacao e Update Imediato

## Objetivo

Melhorar o fluxo de exclusão de postagem para:

- não depender de refresh manual da tela;
- exigir confirmação explícita antes de excluir;
- disponibilizar ação de exclusão também no card da postagem.

## Implementações

### 1) PostPage com confirmação + navegação automática

Arquivo: `src/features/teams/pages/PostPage.tsx`

- Adicionado `AlertDialog` para confirmar exclusão da postagem.
- Botão de lixeira agora abre modal, não exclui direto.
- Após sucesso na exclusão:
  - remove cache da postagem;
  - remove item do cache da lista do canal (quando disponível);
  - invalida favoritos/lista;
  - navega automaticamente para o canal (`/teams/:teamSlug/:channelSlug`).

Resultado: usuário não fica preso na página da postagem removida e vê atualização imediata.

### 2) Card da postagem com botão de excluir + confirmação

Arquivo: `src/features/teams/components/channel/PostList.tsx`

- Incluído botão de ícone (`Trash2`) no card da postagem.
- Botão abre modal de confirmação (`AlertDialog`).
- Implementada remoção otimista no React Query:
  - item sai da lista imediatamente;
  - rollback automático em caso de erro.
- Invalidação de queries relevantes após sucesso (`posts` do canal e `favorites`).

Resultado: exclusão no card atualiza o frontend instantaneamente sem refresh.

## Regras de permissão no frontend

- O botão de excluir no card e na página continua visível para o autor da postagem (`author_user_id === profileId`), mantendo o comportamento atual do módulo.

## Validação

- Lints executados nos arquivos alterados sem erros.
