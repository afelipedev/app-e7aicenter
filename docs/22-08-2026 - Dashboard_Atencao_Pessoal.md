# 22/08/2026 - Dashboard: Precisa de atenção pessoal

## Problema

A faixa **Precisa de atenção** mostrava o mesmo card genérico **“Menção em Equipes / Canal”** para qualquer usuário e perfil.

Causa na RPC `report_dashboard_home`: o CTE `attention` lia `payload->>'title'`, campo que não existe nas notificações reais (`post_title`, `card_title`, `channel_name`). Qualquer notificação não lida caía no fallback `'Menção em Equipes'`. O kind `post_created` é broadcast para todos os membros do canal, então a lista ficava igual para todo mundo.

## O que mudou

A faixa lista só o que é do usuário autenticado (`teams_current_user_id()`):

1. Cards atrasados atribuídos a ele
2. Cards bloqueados atribuídos a ele
3. Notificações não lidas pessoais: menções (post, mensagem, comentário de card), card/quadro atribuído, card aguardando aprovação, resposta em postagem dele, convite de equipe

Fora da faixa (já cobertos pelos KPIs): erros de folha, SPED, DataJud e RAG. `post_created` (nova postagem no canal) também fica de fora — é broadcast, não atribuição.

Títulos e hrefs seguem o mesmo padrão do sino (`NotificationsBell`).

## Arquivos

- `supabase/migrations/20260822001500_dashboard_attention_user_notifications.sql` — `CREATE OR REPLACE` da RPC
- `src/features/dashboard/constants.ts` — rótulos e allowlist de kinds pessoais
- `src/features/dashboard/components/DashboardAttentionList.tsx` — ícones por kind + filtro do legado
- `src/features/dashboard/types.ts` — kinds de notificação
- `src/features/dashboard/pages/DashboardPage.tsx` — subtítulo da seção

## Aplicar no projeto E7

O MCP desta sessão aponta para outro projeto. Aplicar no SQL Editor do projeto `huswezdozhadkegnptsa` (ou `supabase db push` se o CLI estiver linkado ao E7):

`supabase/migrations/20260822001500_dashboard_attention_user_notifications.sql`

Até a RPC ser aplicada, o front já oculta o item genérico `unread_mention`. Depois da RPC, a lista passa a trazer menções e atribuições reais.

## Recorte Hoje / 7 / 30 dias

Não filtra esta seção. Atenção = estado atual pessoal. O recorte continua valendo para KPIs, gráfico e listas de volume.
