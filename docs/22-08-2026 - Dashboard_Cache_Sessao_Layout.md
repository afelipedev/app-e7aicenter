# 22/08/2026 - Dashboard: cache por sessão e layout

## Problemas

1. Trocar de usuário na mesma aba mostrava a faixa **Precisa de atenção** (e o restante do painel) do login anterior até um F5. A query `["dashboard","home",period]` não incluía o usuário; com `staleTime` o React Query reapresentava o cache fresco sem refetch.
2. Quase todos os perfis viam **“Você foi adicionado a uma equipe”**. Não era um item hardcoded: havia `team_invite` não lido desde maio/julho para a maior parte da base, com payload sem nome da equipe — o texto ficava idêntico.
3. A coluna do gráfico alongava a linha da grade até a altura das listas da direita. O card não esticava (`items-start`), mas o espaço vazio da célula empurrava o **Acesso rápido** para baixo.

## O que mudou

- Query do home passa a ser `["dashboard","home", userId, period]`, só dispara com usuário autenticado, e usa `isPending` (não `isLoading`) para não renderizar dados de outra sessão.
- No logout, `queryClient.clear()` evita vazamento de cache (dashboard, sino, etc.).
- A faixa ignora `team_invite` legado. Notificações na RPC ficam nos últimos 21 dias (menções, cards/quadros atribuídos, aprovação, respostas).
- **Acesso rápido** sobe para a coluna esquerda, abaixo do gráfico, preenchendo o vão. Empty state do gráfico no home fica compacto.

KPIs de escritório (folha, empresas, execuções) continuam iguais entre perfis: são volume do escritório. O que muda por papel é o recorte de quais KPIs aparecem e as listas pessoais.

## Arquivos

- `src/features/dashboard/hooks/useDashboardHome.ts`
- `src/components/ClearQueryCacheOnAuthChange.tsx`
- `src/App.tsx`
- `src/features/dashboard/pages/DashboardPage.tsx`
- `src/features/reports/components/charts/ChartCard.tsx`
- `supabase/migrations/20260822013000_dashboard_attention_drop_stale_invites.sql`

RPC aplicada no projeto E7 (`huswezdozhadkegnptsa`).
