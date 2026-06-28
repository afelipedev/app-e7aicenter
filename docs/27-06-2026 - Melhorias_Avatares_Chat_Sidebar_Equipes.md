# 27/06/2026 - Melhorias: Avatares, Chat IA, Sidebar Processos e Layout Equipes

Implementação de quatro melhorias/correções na plataforma E7AI Center.

---

## 1. Avatares dos membros nos Kanbans (foto de perfil + fallback de iniciais)

Antes os membros eram sempre exibidos apenas com as iniciais. Agora, quando o
usuário possui foto de perfil (`users.avatar_url`), ela é exibida; caso
contrário, mantém-se o avatar de iniciais com cor derivada do nome.

**Arquivos:**
- `src/features/legal-kanban/components/MemberAvatar.tsx` — **novo** componente reutilizável (foto ou iniciais).
- `src/features/legal-kanban/types.ts` — `LegalKanbanUser.avatarUrl`.
- `src/features/legal-kanban/services/legalKanbanService.ts` — `mapUser` agora mapeia `avatar_url`; selects de usuário incluem `avatar_url`.
- `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx` — 4 pontos de avatar migrados para `MemberAvatar`.
- `src/features/legal-kanban/pages/LegalKanbanPage.tsx` — avatares dos cartões migrados para `MemberAvatar`.

---

## 2. Melhorias no chat dos Assistentes de IA

- **Copiar mensagem enviada:** o botão de copiar passou a aparecer também nas mensagens do usuário (antes só nas do assistente).
- **Renderização de Markdown:** textos com negrito, itálico, títulos, listas, código etc. agora são renderizados corretamente (antes apareciam como `**texto**`). Novo componente `MarkdownContent` usando `markdown-it` (HTML desabilitado para evitar XSS) + plugin `@tailwindcss/typography` (`prose`).
- **Avatar do usuário:** exibe a foto de perfil de quem fez a pergunta (fallback para o ícone).
- **Título da conversa:** ao enviar a primeira pergunta, o título do chat passa a ser os **primeiros 40 caracteres** da pergunta (antes ficava como "Nova conversa").

**Arquivos:**
- `src/components/assistants/MarkdownContent.tsx` — **novo**.
- `src/components/assistants/ChatMessage.tsx` — markdown, copiar em ambos os lados, avatar do usuário.
- `src/services/chatService.ts` — fallback de título client-side ajustado para 40 caracteres.
- `supabase/functions/chat-completion/index.ts` — define o título no fluxo principal (Edge Function), pois é onde a mensagem do usuário é persistida. **Deploy realizado (version 8).**
- `tailwind.config.ts` — registro do plugin `@tailwindcss/typography`.
- `package.json` — `markdown-it` declarado como dependência explícita.

> Observação: chats antigos já criados mantêm o título anterior; a regra vale para novas conversas.

---

## 3. Correção do submenu "Processos" na sidebar

O submenu **Dashboard** (`/documents/cases`) sempre aparecia selecionado porque
sua URL é prefixo das URLs irmãs (`/documents/cases/quadros`, `.../queries`),
e o `NavLink` por padrão considera rotas-filhas como ativas.

**Correção:** em `src/components/layout/AppSidebar.tsx`, quando a URL de um
submenu é prefixo de um irmão, aplica-se `end` ao `NavLink` (correspondência
exata), evitando o destaque indevido.

---

## 4. Layout da página Equipes (/teams) padronizado e estendido

A página `/teams` estava centralizada (`container mx-auto`) e as demais com
larguras máximas (`max-w-*`). Padronizado para largura total, como as outras
páginas (o padding já é fornecido pelo `main` do `AppLayout`), mantendo a
responsividade dos grids/listas internas.

**Arquivos:**
- `src/features/teams/pages/TeamsHomePage.tsx`
- `src/features/teams/pages/ChannelPage.tsx`
- `src/features/teams/pages/FavoritesPage.tsx`
- `src/features/teams/pages/PostPage.tsx`

---

## Validação

- `npx tsc --noEmit` — sem erros.
- `npm run build` — sucesso.
- Edge Function `chat-completion` redeployada (version 8).
