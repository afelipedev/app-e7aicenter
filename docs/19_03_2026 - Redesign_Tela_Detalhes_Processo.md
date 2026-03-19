# Redesign da Tela de Detalhes do Processo

## Objetivo

Redesenhar a tela `documents/cases/proc-010` para aproximar a experiência visual do layout de referência, melhorar a leitura das informações processuais e manter comportamento responsivo em diferentes tamanhos de tela.

## O que foi implementado

- `ProcessDetailsPage`
  - Cabeçalho reestruturado com título longo, CNJ, grau do processo e ações no topo direito.
  - Adicionados icon buttons para:
    - atualizar processo
    - ativar/desativar monitoramento
    - excluir processo
  - Faixa principal com cards horizontais divididos por `divider` para:
    - tribunal
    - valor da causa
    - data de distribuição
    - partes
    - status
  - Card de `Partes` com popover inferior contendo:
    - polo ativo
    - polo passivo
    - outras partes
    - ação `Ver todas as partes envolvidas`
  - Navegação programática para a aba `Informações`, posicionando a tela na seção `Outras partes`.
  - Segunda linha com cards para:
    - órgão julgador
    - classe processual
  - Tabs redesenhadas com estilo mais próximo de abas horizontais de detalhe.
  - Aba `Movimentação processual` refeita com:
    - agrupamento mensal
    - accordion por mês
    - timeline vertical para as movimentações
  - Aba `Informações` refeita com:
    - seção `Dados do processo`
    - seção `Partes do processo`
    - cards específicos para polo ativo, polo passivo e outras partes
  - Aba `Processos relacionados` ajustada para exibir número do processo, grau e classe em layout tabular.
  - Aba `JUDIT IA` reorganizada em bloco lateral informativo + cards de resumo.

- `types.ts`
  - Suporte a novos metadados do detalhe do processo:
    - tribunal de origem
    - comarca
    - cidade
    - estado
    - segmento da justiça
    - fase
    - juiz/relator
    - aviso descritivo da IA
  - Enriquecimento do tipo de partes com:
    - `role`
    - `counsel`
    - `groupLabel`
  - Enriquecimento de processos relacionados com `grade` e `classProcessual`.
  - Inclusão do status `Ativo`.

- `processesMockData.ts`
  - Mock de `proc-010` atualizado com dados compatíveis com o redesign solicitado.
  - Inclusão de:
    - 6 partes agrupadas
    - movimentações em mais de um mês
    - processo relacionado
    - detalhes complementares para a aba `Informações`
    - conteúdos de apoio para `JUDIT IA`

- `ProcessStatusBadge`
  - Novo tratamento visual para o status `Ativo`.

## Responsividade

- Cards principais empilham no mobile e viram distribuição horizontal com divisores em telas maiores.
- Tabs mantidas com `overflow-x-auto` para evitar quebra irregular.
- Seções de dados e partes usam `grid` adaptativa para mobile, tablet e desktop.
- Listas de anexos e relacionados continuam funcionais em telas pequenas.

## Validação realizada

- `npm run build`

## Observações

- O build passou com sucesso após as alterações.
- `npm run lint` continua falhando por problemas preexistentes em vários arquivos fora do escopo desta implementação.
- A validação visual pelo servidor do próprio worktree ficou bloqueada por ausência de `.env` local do Supabase, então a confirmação final em navegador depende de ambiente com variáveis configuradas.
