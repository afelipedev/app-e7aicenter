# Membros: avatares na barra de ações e modal de gestão (Kanban jurídico)

**Data:** 13/04/2026

## O que foi implementado

- **Barra de ações** (ao lado do botão **Comentários**):
  - Com **membros no card**: título **Membros** (em maiúsculas pequenas), avatares circulares com iniciais (cor via `buildColorFromName`), botão **+** para abrir o modal.
  - **Sem membros**: botão redondo com ícone `UserPlus` para abrir o mesmo modal (primeira atribuição).
  - Clique em um avatar também abre o modal de gestão.

- **Modal** (`Dialog` separado do modal do card, `z-[100]`):
  - Título **Membros** e fechamento pelo X padrão do `DialogContent`.
  - Campo **Pesquisar membros** (filtra a lista de advogados).
  - Seção **Membros do cartão**: lista atual com avatar, nome, perfil e **X** para remover (mesma lógica de `handleToggleMember`).
  - Seção **Advogados**: usuários vindos de `board.members` (já restritos no serviço a `advogado` e `advogado_adm`), com linhas clicáveis para marcar/desmarcar e `Checkbox` indicando seleção.

- **Remoções**: painel inline de membros foi retirado; **Adicionar → Membros** passa a abrir o mesmo modal (`openFromAddMenu("members")`).

- Estado `membersModalOpen` é fechado ao fechar o card; `memberSearch` é limpo ao fechar o modal ou o card.

## Validação

- `npm run build` concluído com sucesso.
- `ReadLints` no arquivo do modal sem novos avisos relevantes ao diff.
