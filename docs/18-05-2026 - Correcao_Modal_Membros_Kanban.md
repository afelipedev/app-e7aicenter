# 18-05-2026 - Correção Modal de Membros no Kanban

## Contexto

No modal de adição de membros do card do Kanban, a interface estava exibindo textos fixos relacionados a "Advogado/Advogados", mesmo quando os usuários possuíam outros perfis. Também havia warning de acessibilidade/HTML inválido por conta de `button` aninhado em `button`.

## O que foi implementado

1. Ajuste de label da seção de seleção:
   - Alterado de `Advogados` para `Membros`.

2. Ajuste de texto de estado vazio:
   - Alterado de `Nenhum advogado encontrado com a pesquisa.` para `Nenhum membro encontrado com a pesquisa.`.

3. Exibição correta do perfil do usuário:
   - Criado mapeamento centralizado de perfis (`ROLE_LABELS`) no `LegalKanbanCardDetailsSheet`.
   - Substituída a lógica fixa que sempre caía em "Advogado" por `getRoleDisplayName(...)` para:
     - `administrator` -> Administrador
     - `it` -> TI
     - `advogado_adm` -> Advogado administrador
     - `advogado` -> Advogado
     - `contabil` -> Contábil
     - `financeiro` -> Financeiro
   - Aplicado tanto na lista de membros já vinculados ao card quanto na lista de membros disponíveis para seleção.

4. Correção do warning `validateDOMNesting(...): <button> cannot appear as a descendant of <button>`:
   - Substituídos wrappers clicáveis de `<button>` para `<div role="button">` nos pontos onde havia `Checkbox` interno (componente Radix que renderiza botão).
   - Adicionado suporte de teclado (`Enter` e `Space`) para manter acessibilidade.
   - Incluídos `aria-disabled`, `tabIndex` e estado visual de desabilitado quando aplicável.

## Arquivo alterado

- `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx`

## Resultado esperado

- O modal exibe "Membros" no cabeçalho da seção.
- Cada usuário mostra seu perfil real.
- Não ocorre mais warning de `button` dentro de `button` nos pontos corrigidos.
