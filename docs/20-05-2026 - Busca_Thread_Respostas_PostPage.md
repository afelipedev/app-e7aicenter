# Busca na conversa de respostas (PostPage)

**Data:** 20/05/2026

## O que foi implementado

- Campo de busca centralizado no cabeçalho da seção **Respostas** da página de postagem (`PostPage`).
- Busca local no texto das mensagens e no nome do autor (sem chamada ao servidor).
- Ao encontrar resultados, destaque da mensagem e **scroll automático** até ela (reuso do parâmetro `messageId` e do fluxo já existente em `MessageList`).
- Navegação entre múltiplos resultados com botões ↑/↓, contador `1/N`, **Enter** (próximo) e **Shift+Enter** (anterior).
- **Escape** ou botão **X** limpa a busca e remove o destaque.

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/features/teams/components/post/ThreadSearchBox.tsx` | Novo componente de busca na thread |
| `src/features/teams/pages/PostPage.tsx` | Integração do componente no cabeçalho de respostas |
| `src/features/teams/components/post/MessageList.tsx` | Pequeno ajuste no timing do `scrollIntoView` |

## Como usar

1. Abra uma postagem com respostas (`/teams/:team/:channel/:postId`).
2. Digite no campo **Buscar na conversa…** no topo da área de respostas.
3. A primeira ocorrência é destacada e a lista rola até ela.
4. Use ↑/↓ ou Enter para percorrer outras ocorrências.
