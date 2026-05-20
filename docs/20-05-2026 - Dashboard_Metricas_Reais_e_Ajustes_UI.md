# 20/05/2026 - Dashboard: Métricas Reais e Ajustes de UI

## Objetivo

Atualizar o dashboard principal com contadores reais, evolução mensal consistente, renomeação das ações rápidas e remoção da seção de atividades recentes mockadas.

## O que foi implementado

### 1. Validação e correção dos contadores dos cards

| Card | Antes | Depois |
|------|-------|--------|
| **Conversas IA** | Dados reais (`ChatService`) | Mantido |
| **Empresas** | Dados reais (`CompanyService`) | Mantido |
| **Documentos** | Mock (`856`, `+8%`) | Soma real de `payroll_files` + `sped_files` |
| **Processos Ativos** | Mock (`43`, `+5%`) | Monitoramentos ativos em `process_monitorings` (`deleted_at` e `paused_at` nulos) |

Novo serviço: `src/services/dashboardService.ts`

### 2. Evolução com base no último mês

Todos os quatro cards exibem evolução comparando **criações do mês atual vs. mês anterior**, no mesmo padrão já usado por Conversas IA e Empresas:

- Percentual (`+12%`, `-5%`, `0%`, `Novo` ou `—`)
- Cor verde para crescimento, vermelha para queda

Utilitário compartilhado: `src/lib/monthlyEvolution.ts`

### 3. Ações rápidas renomeadas

- **Gestão de Holerites** — *Automatizar conversão dos holerites*
- **Quadros Jurídicos** — *Acompanhar andamentos dos quadros jurídicos*
- **Relatórios** — *Acompanhar e Gerar Relatórios*

### 4. Remoção de Atividades Recentes

A seção com dados mockados foi removida de `src/pages/Dashboard.tsx`.

## Arquivos alterados

- `src/pages/Dashboard.tsx`
- `src/services/dashboardService.ts` (novo)
- `src/lib/monthlyEvolution.ts` (novo)

## Como validar

1. Acessar `/` autenticado.
2. Conferir se os quatro cards carregam valores reais (não fixos como 856/43).
3. Verificar percentuais de evolução e cores.
4. Confirmar textos das ações rápidas.
5. Confirmar ausência da seção **Atividades Recentes**.
