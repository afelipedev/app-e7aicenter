# Implementação: Filtro de Histórico de Holerites por Empresa e Competência

## Data
04-05-2026

## Escopo
Implementação de filtro na página ` /documents/payroll `, na seção **Histórico de Processamentos (Concluídos)**, permitindo buscar por:

- Empresa
- Competência (`MM/AAAA`)

## O que foi implementado

1. Adição de estados locais para filtros do histórico:
   - `historyCompanyFilter`
   - `historyCompetenciaFilter`

2. Adição de campos de filtro na interface da seção de histórico:
   - Select de empresa (reutilizando a lista de empresas já carregada na página)
   - Input de competência com máscara `MM/AAAA`
   - Botão **Buscar**
   - Botão **Limpar**

3. Integração dos filtros com a busca paginada existente:
   - `loadProcessingHistory` agora aplica `company_id` e `competency` quando informados
   - Mantida a restrição de histórico para `status = completed`

4. Fluxo de limpeza:
   - O botão **Limpar** remove os filtros e recarrega o histórico sem filtros adicionais

## Arquivo alterado

- `src/pages/documents/Payroll.tsx`

## Impacto nas funcionalidades existentes

- Nenhuma funcionalidade existente de upload/processamento foi alterada
- Paginação e downloads do histórico permanecem funcionando
- Filtro atua apenas no bloco de histórico de processamentos concluídos
