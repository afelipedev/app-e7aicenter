# Implementação: Filtro de Histórico de SPEDs por Empresa e Competência

## Data
04-05-2026

## Escopo
Implementação de filtro na página ` /documents/sped `, na seção **Histórico de Processamentos (Concluídos)**, permitindo buscar por:

- Empresa
- Competência (`MM/AAAA`)

## O que foi implementado

1. Adição de estados locais para os filtros do histórico:
   - `historyCompanyFilter`
   - `historyCompetenciaFilter`

2. Adição dos campos de filtro no card de histórico:
   - Select de empresa (reutilizando lista já carregada)
   - Input de competência com máscara `MM/AAAA`
   - Botão de busca como **icon button** (sem texto)
   - Botão **Limpar**

3. Integração dos filtros com carregamento e paginação:
   - `initializeData` e `loadProcessingHistory` passam a aplicar filtros por `company_id` e `competency`
   - Mantido filtro base `status = completed`
   - Paginação continua funcionando com filtros ativos

4. Comportamento ao limpar:
   - Remove filtros e recarrega a primeira página do histórico sem filtros adicionais

## Arquivo alterado

- `src/pages/documents/Sped.tsx`

## Impacto nas funcionalidades existentes

- Fluxo de upload/processamento não foi alterado
- Download de arquivos no histórico continua inalterado
- Ajuste limitado à seção de histórico de processamentos concluídos
