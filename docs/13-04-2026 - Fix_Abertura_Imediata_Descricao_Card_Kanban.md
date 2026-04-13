## Implementacao

Foi corrigido o problema em que a descricao do card nao aparecia na primeira abertura do modal apos salvar.

## Causa raiz

O editor rico mantinha uma instancia anterior e, logo apos a hidratacao correta do card no modal, voltava a emitir um estado antigo/vazio para o componente pai.

## Solucao aplicada

- Mantido o remount controlado do `LegalKanbanRichTextEditor` sempre que uma nova hidratacao oficial do card e aplicada.
- Preservada a logica de sincronizacao do estado do modal com os dados vindos do backend.
- Removida toda a instrumentacao temporaria de debug usada para identificar a causa.

## Resultado

Agora o conteudo da descricao e exibido imediatamente na primeira abertura do card, sem necessidade de abrir uma segunda vez.
