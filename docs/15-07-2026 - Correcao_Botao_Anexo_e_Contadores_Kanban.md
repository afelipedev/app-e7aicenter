# 15/07/2026 - Correção do botão de anexo e dos contadores dos cards (Kanban)

Continuação da revisão de anexos do kanban. Dois problemas reportados:

1. Os botões de "Adicionar anexo" no modal do card não abriam o seletor de arquivo.
2. Contadores de comentários e anexos nos cards precisavam de validação.

## 1. Botão de anexo sem ação

**Causa:** o conteúdo do modal do card é envolvido por um Radix `ScrollArea`
(diferente do modal de configurações do quadro, que usa um `div` com
`overflow-y-auto` e cujo upload sempre funcionou). Um `<input type="file">`
renderizado **dentro** desse `ScrollArea`/`Dialog` não abria o seletor nativo do
sistema — nem por clique direto no input, nem por `.click()` programático de um
input oculto interno.

**Correção** (`LegalKanbanCardDetailsSheet.tsx`): o `<input type="file">` foi
movido para **fora do `Dialog` e do `ScrollArea`**, renderizado como irmão no
fragmento raiz do componente (portanto no fluxo normal do documento, longe do
focus-trap e do container de scroll do Radix). Os botões "Adicionar" (seção Anexos)
e "Escolher arquivo" (painel inline) chamam `handlePickAndUpload`, que faz
`attachmentFileInputRef.current?.click()` de forma **síncrona** no próprio clique —
preservando a ativação de usuário exigida pelo navegador. O `onChange` do input
valida o tamanho (50 MB) e envia. Padrão idêntico ao upload de capa do quadro, que
comprovadamente funciona.

## 2. Contadores de comentários e anexos

**Diagnóstico:** a lógica de contagem em `hydrateCards` estava correta em si, mas
buscava **todas as linhas** de `legal_kanban_comments` e `legal_kanban_attachments`
do quadro (`select id, card_id ... in(cardIds)`) para contar no cliente. Em quadros
grandes isso estoura o **limite de linhas do PostgREST (1.000)** e as linhas
excedentes são descartadas silenciosamente — cards ficavam com contagem **subtada
ou zerada**. Havia quadros com **1.820 anexos** e **1.705 comentários**, bem acima
do limite.

**Correção:**
- Nova função no banco
  (`20260715120000_legal_kanban_card_engagement_counts.sql`):
  `legal_kanban_card_engagement_counts(p_card_ids uuid[])` retorna
  `card_id, comments_count, attachments_count` agregados no servidor
  (`SECURITY INVOKER`, respeita RLS).
- `hydrateCards` (`legalKanbanService.ts`) passa a chamar essa RPC em vez de trazer
  todas as linhas, eliminando o truncamento. Uma única ida ao servidor.

O detalhe do card (`getCardDetails`) já contava corretamente (consulta por card,
sem risco do limite), então não foi alterado.

## Validação

- `tsc --noEmit`: sem erros.
- Lint do componente alterado: sem erros novos.
- RPC testada no banco: retorna contagens corretas (ex.: card com 54 anexos).
