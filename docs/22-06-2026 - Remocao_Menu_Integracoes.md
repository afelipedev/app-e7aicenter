# Remoção do menu Integrações (PowerBI e Agenda)

**Data:** 22/06/2026

## Contexto

Os menus de Integrações, PowerBI e Agenda não são mais necessários na sidebar da aplicação.

## O que foi implementado

- Remoção do grupo **Integrações** (PowerBI e Agenda) em `AppSidebar.tsx`.
- Remoção das rotas `/integrations/powerbi` e `/integrations/calendar` em `App.tsx`.
- Exclusão das páginas não utilizadas:
  - `src/pages/integrations/PowerBI.tsx`
  - `src/pages/integrations/CalendarIntegration.tsx`

## Arquivos alterados

- `src/components/layout/AppSidebar.tsx`
- `src/App.tsx`

## Arquivos removidos

- `src/pages/integrations/PowerBI.tsx`
- `src/pages/integrations/CalendarIntegration.tsx`

## Impacto

- URLs `/integrations/powerbi` e `/integrations/calendar` passam a retornar `NotFound` via rota coringa.
- Demais módulos (Dashboard, Leads, Assistentes, Documentos, Equipes, Administração) permanecem inalterados.
