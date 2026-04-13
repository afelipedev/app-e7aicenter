# 10/04/2026 — Correção da persistência da descrição (TipTap) no Kanban jurídico

## Contexto

No modal de detalhes do card, o texto editado no TipTap não permanecia salvo no banco ou era sobrescrito ao refetch da query.

## Causa

1. **Hidratação em todo refetch**: O `useEffect` dependia de `[data]`. O React Query devolve um novo objeto `data` a cada refetch (após salvar, invalidação ou foco) e o efeito reaplicava os campos do servidor no estado local. Em cenários de corrida ou ordem de eventos, a descrição local podia ser substituída por dados ainda antigos ou o fluxo ficava inconsistente.

2. **Estado possivelmente defasado no clique em Salvar**: O conteúdo do editor deve ser lido diretamente da instância TipTap no momento do `mutate`, garantindo que o JSON/texto enviados ao Supabase sejam os últimos do editor.

## Verificação no banco (Supabase MCP)

- Tabela `legal_kanban_cards` possui `description_json` (jsonb, NOT NULL) e `description_text` (text, NOT NULL). Nenhuma alteração de schema foi necessária.

## Alterações no código

- **`LegalKanbanRichTextEditor.tsx`**: `forwardRef` + `useImperativeHandle` com `getSnapshot()` retornando `{ json, plainText }`; `onChange` do editor passado por `useRef` para o callback de `onUpdate` sempre estar atualizado.
- **`LegalKanbanCardDetailsSheet.tsx`**: Hidratação do formulário apenas ao abrir o modal, ao trocar de card ou quando a query carrega pela primeira vez para o card (não em todo refetch); `handleSaveCard` usa `getSnapshot()` do editor antes de chamar `updateCard` e alinha o estado React após sucesso.

## Ajuste adicional (conteúdo no banco, mas editor vazio ao reabrir)

- **Causa**: A hidratação do formulário rodava em `useEffect` (após a pintura). Com `immediatelyRender: false`, o TipTap criava o editor com `content` ainda vazio; o `setContent` posterior nem sempre alinhava com o que o `useEditor` esperava. Além disso, `description_json` pode chegar como string ou formato não reconhecido pelo schema.
- **Correção**: `useLayoutEffect` para aplicar `description`/`descriptionText` do servidor **antes** da pintura do filho; `normalizeRichTextDoc()` em `utils.ts` (e em `mapCardBase`) para garantir `type: "doc"` e parse de string; `setContent` com `{ emitUpdate: false }` ao sincronizar o valor controlado.

## Ajuste adicional (mesmo conteúdo aparecendo em cards diferentes)

- **Causa**: Na troca de card, o modal podia reaproveitar o estado local do card anterior. O efeito de hidratação usava `cardId` novo com `data` ainda antigo, marcando a hidratação como concluída antes da resposta correta chegar. Isso fazia o editor repetir o conteúdo entre cards até recarregar a página.
- **Correção**: A hidratação agora só acontece quando `data.id === cardId`; o controle interno usa o `id` realmente carregado, não apenas o `cardId` solicitado. Também foi adicionado `key` no `LegalKanbanCardDetailsSheet` e no `LegalKanbanRichTextEditor` para forçar remontagem limpa na troca de card e evitar vazamento de estado entre instâncias.

## Ajuste definitivo (precisava abrir duas vezes)

- **Causa**: Após salvar, o `useUpdateLegalKanbanCard` apenas invalidava as queries. Ao reabrir o card imediatamente, o React Query entregava primeiro o cache anterior e só depois o refetch trazia o valor novo. Como o modal já tinha hidratado, a versão antiga permanecia visível até fechar e abrir de novo.
- **Correção**: O `onSuccess` do update agora faz `setQueryData` nas caches de `board` e `card details` com o retorno atualizado do `updateCard`, antes de invalidar para refetch. Assim o modal reabre já com a descrição recém-salva, sem depender de abrir duas vezes.

## Ajuste final (primeira abertura ainda vinha vazia)

- **Causa**: Mesmo com o cache atualizado, o modal ainda podia hidratar com uma versão anterior do mesmo card e ignorar a resposta fresca seguinte, porque a lógica só tratava troca de `cardId`. Em alguns casos, a primeira abertura mostrava a descrição vazia e a segunda já exibia o conteúdo correto.
- **Correção**: A hidratação agora considera também a **mudança da versão do servidor** (`updatedAt` + snapshot dos campos principais) para o mesmo card. Se o formulário ainda está sincronizado com a última hidratação, ele reaplica automaticamente a versão nova. Além disso, quando os detalhes do card estão atrás do snapshot do board, o modal permanece em estado de carregamento até sincronizar, evitando renderizar a versão vazia/antiga na primeira abertura.

## Arquivos tocados

- `src/features/legal-kanban/components/editor/LegalKanbanRichTextEditor.tsx`
- `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx`
- `src/features/legal-kanban/utils.ts` (`normalizeRichTextDoc`)
- `src/features/legal-kanban/services/legalKanbanService.ts` (`mapCardBase` → `normalizeRichTextDoc`)
