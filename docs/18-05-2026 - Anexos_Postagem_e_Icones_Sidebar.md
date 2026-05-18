# Anexos na postagem e ícones na sidebar

**Data:** 18/05/2026

## O que foi implementado

### Seção Anexos da postagem (`PostRightSidebar`)

- Área de upload por **arrastar e soltar** ou **clique** (mesmo limite de 25 MB por arquivo da criação de postagem).
- Upload via `attachmentService.uploadPostAttachment` com `channelId` e `profileId`.
- Botão de exclusão (ícone lixeira) em cada anexo.
- **Modal de confirmação** (`AlertDialog`) antes de remover o arquivo do storage e do banco.
- Invalidação das queries `["teams", "post-attachments", postId]` e `teamsKeys.post(postId)` após upload/exclusão.

### Ícones nos títulos dos cards da sidebar

| Seção | Ícone |
|-------|--------|
| Informações do Card | `Trello` |
| Anexos da postagem | `Paperclip` (já existia) |
| Atividades recentes | `Activity` |
| Comentários do Card | `MessageSquare` |

### Integração

- `PostPage` passa `channelId={post.channel_id}` para `PostRightSidebar`.

## Arquivos alterados

- `src/features/teams/components/post/PostRightSidebar.tsx`
- `src/features/teams/pages/PostPage.tsx`
