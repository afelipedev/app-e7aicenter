-- Relatórios v2 — versionamento e revisão das RPCs de agregação.
--
-- As 4 funções originais existiam apenas no banco remoto (sem arquivo de
-- migration). Esta migration encerra o drift e aplica as correções:
--
--  * report_payroll_sped_summary — ORDER BY dentro da subquery do "Top 20"
--  * report_kanban_throughput    — novo filtro p_domain + by_board/by_domain
--                                  + lead_sample (tamanho da amostra do lead time)
--  * report_ai_center_e7 (nova)  — substitui report_ai_adoption; passa a medir
--                                  o AI Center E7 (agentes, execuções, custo,
--                                  tokens, modelo, usuário) em vez dos chats
--                                  legados
--  * report_processes_overview   — corrige success_queries ('success' nunca
--                                  existiu na base: os valores são
--                                  completed/error), descarta durações <= 0,
--                                  deriva o segmento de justiça do tribunal
--                                  (DataJud não devolve justice_segment/state)
--                                  e troca "por UF" por "por grau"

-- ---------------------------------------------------------------------------
-- 1. Folha & SPED
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_payroll_sped_summary(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_company_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_from timestamptz := coalesce(p_from, (now() - interval '12 months'))::timestamptz;
  v_to   timestamptz := (coalesce(p_to, now()::date) + 1)::timestamptz; -- inclusivo no dia final
  v_result jsonb;
begin
  with base as (
    select 'folha'::text as source, company_id, status, competency, started_at, completed_at, created_at
      from payroll_processing
     where created_at >= v_from and created_at < v_to
       and (p_company_id is null or company_id = p_company_id)
    union all
    select 'sped'::text as source, company_id, status, competency, started_at, completed_at, created_at
      from sped_processing
     where created_at >= v_from and created_at < v_to
       and (p_company_id is null or company_id = p_company_id)
  )
  select jsonb_build_object(
    'kpis', (
      select jsonb_build_object(
        'total', count(*),
        'completed', count(*) filter (where status = 'completed'),
        'errors', count(*) filter (where status = 'error'),
        'in_progress', count(*) filter (where status in ('pending','processing')),
        -- Concluídos ÷ (concluídos + com erro). Lotes ainda em andamento
        -- ficam fora do denominador para não deprimir a taxa artificialmente.
        'success_rate', case when count(*) filter (where status in ('completed','error')) > 0
              then round((count(*) filter (where status = 'completed')::numeric
                   / count(*) filter (where status in ('completed','error'))) * 100, 1)
              else 0 end,
        -- Minutos entre started_at e completed_at dos lotes concluídos.
        'avg_minutes', coalesce(round(avg(extract(epoch from (completed_at - started_at)) / 60.0)
              filter (where status = 'completed' and completed_at is not null and started_at is not null)::numeric, 1), 0),
        'avg_sample', count(*) filter (where status = 'completed' and completed_at is not null and started_at is not null)
      ) from base
    ),
    'by_month', coalesce((
      select jsonb_agg(row_to_json(t) order by t.month)
      from (
        select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
               count(*) filter (where source = 'folha') as folha,
               count(*) filter (where source = 'sped') as sped,
               count(*) filter (where status = 'completed') as concluidos,
               count(*) filter (where status = 'error') as erros
        from base group by 1
      ) t
    ), '[]'::jsonb),
    'by_status', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (select status, count(*) as count from base group by status) t
    ), '[]'::jsonb),
    'by_company', coalesce((
      select jsonb_agg(row_to_json(t) order by t.total desc)
      from (
        select coalesce(c.name, 'Sem empresa') as company,
               count(*) as total,
               count(*) filter (where b.status = 'completed') as concluidos,
               count(*) filter (where b.status = 'error') as erros
        from base b left join companies c on c.id = b.company_id
        group by coalesce(c.name, 'Sem empresa')
        order by count(*) desc   -- ordenar ANTES do limit: o "Top 20" era arbitrário
        limit 20
      ) t
    ), '[]'::jsonb),
    'sped_by_type', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (select coalesce(sped_type, 'N/D') as sped_type, count(*) as count
            from sped_processing
            where created_at >= v_from and created_at < v_to
              and (p_company_id is null or company_id = p_company_id)
            group by coalesce(sped_type, 'N/D')) t
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Quadros (kanban jurídico + gestão operacional)
-- ---------------------------------------------------------------------------
-- Assinatura muda (ganha p_domain), então a versão antiga precisa sair para
-- não gerar sobrecarga ambígua.
DROP FUNCTION IF EXISTS public.report_kanban_throughput(date, date);

CREATE OR REPLACE FUNCTION public.report_kanban_throughput(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_domain text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_from timestamptz := coalesce(p_from, (now() - interval '12 months'))::timestamptz;
  v_to   timestamptz := (coalesce(p_to, now()::date) + 1)::timestamptz;
  v_result jsonb;
begin
  with base as (
    select c.id, c.status, c.priority, c.column_id, c.created_at, c.completed_at, c.due_date,
           b.title as board_name, b.domain as board_domain
      from legal_kanban_cards c
      join legal_kanban_boards b on b.id = c.board_id
     where c.created_at >= v_from and c.created_at < v_to
       and (p_domain is null or b.domain = p_domain)
  )
  select jsonb_build_object(
    'kpis', (
      select jsonb_build_object(
        'total', count(*),
        'completed', count(*) filter (where status = 'concluido'),
        'active', count(*) filter (where status not in ('concluido','arquivado')),
        'overdue', count(*) filter (where due_date is not null and due_date < now()
                     and status not in ('concluido','arquivado')),
        'boards', count(distinct board_name),
        -- Dias entre a criação do card e sua conclusão. Só entram cards
        -- concluídos com completed_at preenchido — daí o lead_sample.
        'avg_lead_days', coalesce(round(avg(extract(epoch from (completed_at - created_at)) / 86400.0)
              filter (where status = 'concluido' and completed_at is not null)::numeric, 1), 0),
        'lead_sample', count(*) filter (where status = 'concluido' and completed_at is not null)
      ) from base
    ),
    'by_month', coalesce((
      select jsonb_agg(row_to_json(t) order by t.month)
      from (
        select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
               count(*) as criados,
               count(*) filter (where status = 'concluido') as concluidos
        from base group by 1
      ) t
    ), '[]'::jsonb),
    'by_status', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (select status, count(*) as count from base group by status) t
    ), '[]'::jsonb),
    'by_priority', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (select coalesce(priority, 'N/D') as priority, count(*) as count
            from base group by coalesce(priority, 'N/D')) t
    ), '[]'::jsonb),
    'by_domain', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (select board_domain as domain, count(*) as count from base group by board_domain) t
    ), '[]'::jsonb),
    'by_board', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (
        select board_name as board, board_domain as domain,
               count(*) as count,
               count(*) filter (where status = 'concluido') as concluidos
        from base group by board_name, board_domain
        order by count(*) desc
        limit 20
      ) t
    ), '[]'::jsonb),
    'by_assignee', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (
        select coalesce(u.name, 'Sem responsável') as assignee, count(distinct m.card_id) as count
        from legal_kanban_card_members m
        join base b on b.id = m.card_id
        left join users u on u.id = m.user_id
        group by coalesce(u.name, 'Sem responsável')
        order by count(distinct m.card_id) desc
        limit 20
      ) t
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3. AI Center E7 (substitui report_ai_adoption)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.report_ai_adoption(date, date);

CREATE OR REPLACE FUNCTION public.report_ai_center_e7(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_from timestamptz := coalesce(p_from, (now() - interval '12 months'))::timestamptz;
  v_to   timestamptz := (coalesce(p_to, now()::date) + 1)::timestamptz;
  v_result jsonb;
begin
  with exec as (
    select e.id, e.agente_id, e.conversa_id, e.user_id, e.status, e.modelo, e.origem,
           e.tokens_entrada, e.tokens_saida, e.custo_reais, e.iniciado_em,
           coalesce(a.nome, 'Utilitário') as agente_nome,
           coalesce(u.name, 'Sem usuário') as user_nome
      from agente_execucoes e
      left join agentes a on a.id = e.agente_id
      left join users u on u.id = e.user_id
     where e.iniciado_em >= v_from and e.iniciado_em < v_to
  )
  select jsonb_build_object(
    'kpis', (
      select jsonb_build_object(
        'total_cost', coalesce(round(sum(custo_reais)::numeric, 2), 0),
        'total_executions', count(*),
        'total_tokens', coalesce(sum(tokens_entrada + tokens_saida), 0),
        'avg_cost', coalesce(round((sum(custo_reais) / nullif(count(*), 0))::numeric, 4), 0),
        'active_agents', count(distinct agente_id) filter (where agente_id is not null),
        'active_users', count(distinct user_id),
        'total_agents', (select count(*) from agentes where excluido_em is null),
        'total_conversations', (select count(*) from agente_conversas
                                 where criado_em >= v_from and criado_em < v_to),
        'total_messages', (select count(*) from agente_mensagens
                            where criado_em >= v_from and criado_em < v_to),
        'error_rate', case when count(*) > 0
              then round((count(*) filter (where status = 'erro')::numeric / count(*)) * 100, 1)
              else 0 end
      ) from exec
    ),
    'by_month', coalesce((
      select jsonb_agg(row_to_json(t) order by t.month)
      from (
        select to_char(date_trunc('month', iniciado_em), 'YYYY-MM') as month,
               count(*) as execucoes,
               round(sum(custo_reais)::numeric, 4) as custo,
               sum(tokens_entrada + tokens_saida) as tokens
        from exec group by 1
      ) t
    ), '[]'::jsonb),
    'conversations_by_month', coalesce((
      select jsonb_agg(row_to_json(t) order by t.month)
      from (
        select to_char(date_trunc('month', criado_em), 'YYYY-MM') as month, count(*) as count
        from agente_conversas
        where criado_em >= v_from and criado_em < v_to
        group by 1
      ) t
    ), '[]'::jsonb),
    'by_agent', coalesce((
      select jsonb_agg(row_to_json(t) order by t.execucoes desc)
      from (
        select e.agente_nome as agent,
               count(*) as execucoes,
               count(distinct e.conversa_id) filter (where e.conversa_id is not null) as conversas,
               round(sum(e.custo_reais)::numeric, 4) as custo,
               sum(e.tokens_entrada + e.tokens_saida) as tokens
        from exec e
        group by e.agente_nome
        order by count(*) desc
        limit 10
      ) t
    ), '[]'::jsonb),
    'by_model', coalesce((
      select jsonb_agg(row_to_json(t) order by t.execucoes desc)
      from (
        select coalesce(modelo, 'N/D') as model,
               count(*) as execucoes,
               round(sum(custo_reais)::numeric, 4) as custo,
               sum(tokens_entrada + tokens_saida) as tokens
        from exec group by coalesce(modelo, 'N/D')
        order by count(*) desc
        limit 15
      ) t
    ), '[]'::jsonb),
    'by_user', coalesce((
      select jsonb_agg(row_to_json(t) order by t.custo desc)
      from (
        select user_nome as usuario,
               count(*) as execucoes,
               round(sum(custo_reais)::numeric, 4) as custo,
               sum(tokens_entrada + tokens_saida) as tokens
        from exec group by user_nome
        order by sum(custo_reais) desc
        limit 10
      ) t
    ), '[]'::jsonb),
    'by_origem', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (
        select coalesce(origem, 'agente') as origem,
               count(*) as count,
               round(sum(custo_reais)::numeric, 4) as custo
        from exec group by coalesce(origem, 'agente')
      ) t
    ), '[]'::jsonb),
    'users_by_role', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (select coalesce(role, 'N/D') as role, count(*) as count
            from users group by coalesce(role, 'N/D')) t
    ), '[]'::jsonb),
    'knowledge', jsonb_build_object(
      'bases', (select count(*) from bases_conhecimento),
      'documentos', (select count(*) from documentos
                      where criado_em >= v_from and criado_em < v_to),
      'fragmentos', (select count(*) from documento_fragmentos d
                      join documentos doc on doc.id = d.documento_id
                     where doc.criado_em >= v_from and doc.criado_em < v_to)
    )
  ) into v_result;

  return v_result;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Processos (DataJud/CNJ)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_processes_overview(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_from timestamptz := coalesce(p_from, (now() - interval '12 months'))::timestamptz;
  v_to   timestamptz := (coalesce(p_to, now()::date) + 1)::timestamptz;
  v_result jsonb;
begin
  with req as (
    select * from process_query_requests
     where created_at >= v_from and created_at < v_to
  ),
  snap as (
    -- O DataJud não devolve justice_segment nem UF; derivamos o segmento a
    -- partir do alias do tribunal (TJxx = estadual, TRT = trabalho, ...).
    select s.*,
           coalesce(nullif(s.justice_segment, ''),
             case
               when s.tribunal in ('STF','STJ','TST','TSE') then 'Tribunais Superiores'
               when s.tribunal = 'STM' or s.tribunal ~ '^TJM' then 'Justiça Militar'
               when s.tribunal ~ '^TRF' then 'Justiça Federal'
               when s.tribunal ~ '^TRT' then 'Justiça do Trabalho'
               when s.tribunal ~ '^TRE' then 'Justiça Eleitoral'
               when s.tribunal ~ '^TJ' then 'Justiça Estadual'
               else 'Não classificado'
             end) as segment
      from process_snapshots s
     where s.created_at >= v_from and s.created_at < v_to
  )
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'total_snapshots', (select count(*) from snap),
      'total_queries', (select count(*) from req),
      -- Segundos entre o envio da requisição ao DataJud e o retorno.
      -- Durações <= 0 são descartadas (registros gravados antes da
      -- instrumentação correta do started_at).
      'avg_response_seconds', coalesce((
          select round(avg(extract(epoch from (finished_at - started_at)))::numeric, 1)
            from req where finished_at is not null and started_at is not null
             and finished_at > started_at), 0),
      'response_sample', (select count(*) from req
          where finished_at is not null and started_at is not null and finished_at > started_at),
      'success_queries', (select count(*) from req where status = 'completed'),
      'error_queries', (select count(*) from req where status = 'error'),
      'success_rate', coalesce((
          select round((count(*) filter (where status = 'completed')::numeric
                 / nullif(count(*) filter (where status in ('completed','error')), 0)) * 100, 1)
            from req), 0),
      'distinct_tribunals', (select count(distinct nullif(tribunal, '')) from snap)
    ),
    'queries_by_month', coalesce((
      select jsonb_agg(row_to_json(t) order by t.month)
      from (select to_char(date_trunc('month', created_at), 'YYYY-MM') as month, count(*) as count
            from req group by 1) t
    ), '[]'::jsonb),
    'queries_by_kind', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (select coalesce(request_kind, 'N/D') as request_kind, count(*) as count
            from req group by coalesce(request_kind, 'N/D')) t
    ), '[]'::jsonb),
    'queries_by_status', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (select coalesce(status, 'N/D') as status, count(*) as count
            from req group by coalesce(status, 'N/D')) t
    ), '[]'::jsonb),
    'by_tribunal', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (select coalesce(nullif(tribunal, ''), 'N/D') as tribunal, count(*) as count
            from snap group by coalesce(nullif(tribunal, ''), 'N/D')
            order by count(*) desc limit 15) t
    ), '[]'::jsonb),
    'by_class', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (select coalesce(nullif(class_processual, ''), 'N/D') as class_processual, count(*) as count
            from snap group by coalesce(nullif(class_processual, ''), 'N/D')
            order by count(*) desc limit 15) t
    ), '[]'::jsonb),
    'by_segment', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (select segment as justice_segment, count(*) as count
            from snap group by segment) t
    ), '[]'::jsonb),
    'by_grade', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (select coalesce(nullif(grade, ''), 'N/D') as grade, count(*) as count
            from snap group by coalesce(nullif(grade, ''), 'N/D')) t
    ), '[]'::jsonb),
    'by_court', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (select coalesce(nullif(orgao_julgador, ''), 'N/D') as orgao_julgador, count(*) as count
            from snap group by coalesce(nullif(orgao_julgador, ''), 'N/D')
            order by count(*) desc limit 15) t
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.report_payroll_sped_summary(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_kanban_throughput(date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_ai_center_e7(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_processes_overview(date, date) TO authenticated;
