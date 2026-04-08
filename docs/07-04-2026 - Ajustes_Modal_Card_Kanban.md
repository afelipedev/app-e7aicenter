# Ajustes no modal do card do Kanban

## O que foi implementado

- Substituição do painel lateral (`Sheet`) por **Dialog centralizado** na tela (`LegalKanbanCardDetailsSheet.tsx`), com largura máxima ~1080px e altura limitada à viewport.
- **Topo do modal:** nome da **raia** em destaque (estilo faixa legível) e ações **Salvar** e **Fechar**.
- Linha do título: **circle check** para concluir/reabrir o card e campo de **título** ao lado.
- Linha de ações logo abaixo do título (conforme especificação):
  - **Adicionar** (menu com: etiquetas, datas, checklists, membros, anexo, campos personalizados) — cada opção abre o fluxo correspondente.
  - **Etiquetas**, **Datas** e **Checklist** como botões com **Popover** (menus flutuantes) para não “quebrar” o layout do modal.
  - **Membros**, **anexo** e **campos personalizados** ficam no menu **Adicionar** e abrem um **painel inline** compacto abaixo da barra de ações.
- **Datas:** calendário (`Calendar`) + opções de data de início, entrega, recorrência e lembrete.
- Coluna direita: **Comentários e atividade** com rolagem independente; botão **Ocultar detalhes** recolhe a coluna e exibe **Mostrar comentários e atividade** para reabrir.
- Conteúdo principal (esquerda): resumo de etiquetas, descrição (TipTap), anexos e listas de checklist.

## Ajustes complementares

- Correção da quebra de texto do título dos cards no board para evitar overflow horizontal.

## Validação

- `ReadLints` sem erros no arquivo ajustado.
- `npm run build` executado com sucesso após a refatoração.

## Observações

- O comportamento de dados e mutations permanece o mesmo; mudou principalmente a camada de UI (Dialog, Popovers e grid estável).
