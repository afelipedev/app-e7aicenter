## Implementação

Foram aplicados ajustes visuais finos na tela de monitoramentos para aproximar a experiência da linguagem já utilizada nas telas de detalhes e dashboard de processos.

## O que foi ajustado

- Refinamento do topo da página com melhor hierarquia visual, espaçamento e tipografia.
- Redesign dos cards de indicadores com cantos maiores, ícones destacados e leitura numérica mais forte.
- Ajustes de spacing, bordas, sombras e cores nos blocos de monitoramento processual, monitoramento documental e feed de alertas.
- Melhoria da densidade tipográfica nas listagens para facilitar escaneabilidade.
- Conversão das ações `Favoritar` e `Ativar/Desativar monitoramento` em icon buttons com tooltip e `aria-label`.

## Arquivo alterado

- `src/features/processes/pages/ProcessMonitoringPage.tsx`

## Validação

- `ReadLints` sem erros no arquivo alterado.

## Observação

As ações de monitoramento documental permaneceram como botões com texto, já que a solicitação pediu alteração específica para os botões de favoritar e monitoramento processual.
