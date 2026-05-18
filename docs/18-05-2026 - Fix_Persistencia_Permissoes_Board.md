# Correção de Persistência de Permissões no Board

## Contexto

Ao salvar no modal **Configurar Board**, os usuários selecionados em permissões não estavam sendo persistidos corretamente em alguns cenários.

## Causa raiz

No serviço de Kanban, o fluxo de atualização de membros do board usava `delete` seguido de `insert` sem validação explícita de erros nessas operações.

Com isso, em caso de falha de RLS/constraint durante a gravação dos membros, o fluxo ainda podia finalizar com sucesso no frontend (toast de sucesso), mesmo sem persistir a lista de usuários selecionada.

## O que foi implementado

- Refatoração da sincronização de membros em `legalKanbanService`:
  - Criação de `buildBoardMemberIds` para normalizar e garantir o usuário ator no conjunto.
  - Criação de `syncBoardMembers` para sincronização segura dos membros.
- Substituição da estratégia `delete -> insert` por:
  1. `upsert` dos membros selecionados (incluindo o ator como `admin`);
  2. leitura dos membros atuais;
  3. remoção apenas dos usuários que não permanecem na seleção.
- Adição de validação de erro explícita em cada etapa da sincronização de membros, com mensagens claras.

## Benefícios

- Evita falso positivo de salvamento quando a persistência de membros falha.
- Reduz risco de perda total temporária de membros por falha parcial no fluxo.
- Mantém a regra de negócio do ator/admin sempre presente no board.

## Arquivo alterado

- `src/features/legal-kanban/services/legalKanbanService.ts`
