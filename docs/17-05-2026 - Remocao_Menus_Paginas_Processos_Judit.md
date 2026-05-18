## Objetivo

Remover do módulo de `Documentos & Processos > Processos` os itens legados ligados à integração com a API Judit:

- `Consultas Históricas`
- `Monitoramentos`
- `Consumo API`

Também remover as rotas e páginas correspondentes para evitar acesso por URL direta.

## Planejamento executado

Features impactadas e ordem de execução:

1. Navegação global (`sidebar`) para retirar menus não suportados.
2. Roteamento principal (`App.tsx`) para eliminar rotas públicas internas do módulo.
3. Constantes de rotas da feature (`processRoutes`) para remover endpoints legados.
4. Dashboard de Processos para evitar links quebrados e manter UX consistente.
5. Remoção física das páginas descontinuadas.

## Implementação

- Atualizado `src/components/layout/AppSidebar.tsx`:
  - Removidos os menus `Consultas Históricas`, `Monitoramentos` e `Consumo API`.
  - Removidos ícones não utilizados após a limpeza.

- Atualizado `src/App.tsx`:
  - Removidos imports de:
    - `ProcessHistoryPage`
    - `ProcessMonitoringPage`
    - `ProcessApiConsumptionPage`
  - Removidas rotas:
    - `/documents/cases/history`
    - `/documents/cases/monitoring`
    - `/documents/cases/api-consumption`

- Atualizado `src/features/processes/constants.ts`:
  - Removidas chaves de rota:
    - `history`
    - `monitoring`
    - `apiConsumption`

- Atualizado `src/features/processes/pages/ProcessesDashboardPage.tsx`:
  - Removidos atalhos e CTAs para páginas descontinuadas.
  - Ajustado texto de contexto para refletir os fluxos ativos (`consultas` e `kanban`).
  - Seção de indicadores simplificada para não apontar para rotas removidas.

- Arquivos removidos:
  - `src/features/processes/pages/ProcessHistoryPage.tsx`
  - `src/features/processes/pages/ProcessMonitoringPage.tsx`
  - `src/features/processes/pages/ProcessApiConsumptionPage.tsx`

## Resultado

O módulo de Processos deixa de expor menus, rotas e páginas relacionadas às áreas removidas, sem links quebrados na navegação principal e no dashboard da feature.
