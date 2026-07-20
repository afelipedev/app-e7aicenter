# 20/07/2026 - Mover Card Entre Raias

## Objetivo

Permitir mover um card de raia diretamente pelo modal de detalhes, sem precisar fechá-lo e arrastar o card no board.

## O que foi implementado

O indicador da raia atual no topo esquerdo do modal (antes um texto estático) virou um gatilho clicável. Ao clicar, abre um popover ancorado com:

- Título **Mover Card** e botão de fechar (X)
- Seletor de **Quadro**
- Seletor de **Raia destino**
- Botão **Mover**

O card é movido para o fim da raia escolhida e tanto o board quanto o modal se atualizam sem recarregar a página.

## Arquivos

- **Novo:** `src/features/legal-kanban/components/MoveKanbanCardPopover.tsx`
- **Alterado:** `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx` — o `<p>` estático da barra de topo foi substituído pelo novo componente (`board` e `currentColumn` já existiam no escopo).

## Decisões

**Movimentação restrita às raias do quadro atual.** O seletor de quadros é exibido conforme a estrutura solicitada, porém travado no quadro atual e desabilitado, com a nota *"Para mover para outro quadro, use Compartilhar."*

Motivo: `legal_kanban_labels`, `legal_kanban_custom_fields` e `board_members` são vinculados ao quadro. Mover um card entre quadros deixaria etiquetas e valores de campos personalizados órfãos. O fluxo entre quadros já é atendido pelo `ShareKanbanCardDialog`, que cria um card espelhado e sincronizado.

**Formato popover** em vez de dialog, para não empilhar dois modais e manter o card visível durante a escolha.

## Reuso — nenhuma mudança de backend

Toda a lógica já existia; a entrega é exclusivamente de UI:

- `legalKanbanService.moveCard()` — reindexa as colunas de origem e destino por centenas e registra a atividade `card_moved`.
- `useMoveLegalKanbanCard()` — já invalida as queries do board e do card no `onSettled`.

A regra de permissão que impede perfis fora de `administrator`/`advogado_adm` de mover cards para raias de `kind: "done"` continua no serviço. O componente apenas captura o erro e exibe a mensagem via `toast.error` — a checagem **não** foi duplicada no cliente.

A raia atual aparece na lista marcada como "(atual)" e desabilitada, e raias arquivadas são omitidas.

## Verificação

- `npx tsc --noEmit` — sem erros
- `npx eslint` nos arquivos alterados — sem avisos
- `npm run build` — sucesso

Validação funcional em navegador (mover entre raias, toast de sucesso, registro na aba de atividades e bloqueio da raia "Concluídos" para perfis sem permissão) permanece pendente de execução com usuário autenticado.
