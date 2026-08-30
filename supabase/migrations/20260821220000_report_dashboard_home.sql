-- Dashboard home — recorte operacional do dia (não substitui os relatórios).
-- SECURITY DEFINER + search_path=public, no mesmo padrão de report_*_v2.
-- KPIs de escritório seguem a visibilidade já usada nos relatórios.
-- Itens pessoais (cards, favoritos, menções) usam o usuário autenticado.

CREATE OR REPLACE FUNCTION public.report_dashboard_home(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_to date := coalesce(p_to, (timezone('America/Sao_Paulo', now()))::date);
  v_from date := coalesce(p_from, v_to - 6);
  v_from_ts timestamptz;
  v_to_ts timestamptz;
  v_span int;
  v_prev_from date;
  v_prev_to date;
  v_prev_from_ts timestamptz;
  v_prev_to_ts timestamptz;
  v_series_from date;
  v_series_from_ts timestamptz;
  v_uid uuid;
  v_auth uuid;
  v_result jsonb;
BEGIN
  IF v_from > v_to THEN
    RAISE EXCEPTION 'p_from não pode ser posterior a p_to';
  END IF;

  v_from_ts := v_from::timestamptz;
  v_to_ts := (v_to + 1)::timestamptz;
  v_span := (v_to - v_from) + 1;
  v_prev_to := v_from - 1;
  v_prev_from := v_prev_to - (v_span - 1);
  v_prev_from_ts := v_prev_from::timestamptz;
  v_prev_to_ts := (v_prev_to + 1)::timestamptz;
  v_series_from := CASE WHEN v_from = v_to THEN v_to - 6 ELSE v_from END;
  v_series_from_ts := v_series_from::timestamptz;
  v_auth := auth.uid();
  v_uid := public.teams_current_user_id();

  WITH
  metric AS (
    SELECT jsonb_build_object(
      'ai_conversations', jsonb_build_object(
        'value', (SELECT count(*) FROM agente_conversas WHERE criado_em >= v_from_ts AND criado_em < v_to_ts),
        'prev',  (SELECT count(*) FROM agente_conversas WHERE criado_em >= v_prev_from_ts AND criado_em < v_prev_to_ts),
        'unit', 'count'
      ),
      'ai_executions', jsonb_build_object(
        'value', (SELECT count(*) FROM agente_execucoes WHERE iniciado_em >= v_from_ts AND iniciado_em < v_to_ts),
        'prev',  (SELECT count(*) FROM agente_execucoes WHERE iniciado_em >= v_prev_from_ts AND iniciado_em < v_prev_to_ts),
        'unit', 'count'
      ),
      'ai_error_rate', jsonb_build_object(
        'value', coalesce((
          SELECT round((count(*) FILTER (WHERE status = 'erro')::numeric / nullif(count(*), 0)) * 100, 1)
          FROM agente_execucoes WHERE iniciado_em >= v_from_ts AND iniciado_em < v_to_ts
        ), 0),
        'prev', coalesce((
          SELECT round((count(*) FILTER (WHERE status = 'erro')::numeric / nullif(count(*), 0)) * 100, 1)
          FROM agente_execucoes WHERE iniciado_em >= v_prev_from_ts AND iniciado_em < v_prev_to_ts
        ), 0),
        'unit', 'percent'
      ),
      'ai_cost', jsonb_build_object(
        'value', coalesce((
          SELECT round(sum(custo_reais)::numeric, 2)
          FROM agente_execucoes WHERE iniciado_em >= v_from_ts AND iniciado_em < v_to_ts
        ), 0),
        'prev', coalesce((
          SELECT round(sum(custo_reais)::numeric, 2)
          FROM agente_execucoes WHERE iniciado_em >= v_prev_from_ts AND iniciado_em < v_prev_to_ts
        ), 0),
        'unit', 'currency'
      ),
      'ai_active_users', jsonb_build_object(
        'value', (SELECT count(DISTINCT user_id) FROM agente_execucoes WHERE iniciado_em >= v_from_ts AND iniciado_em < v_to_ts),
        'prev',  (SELECT count(DISTINCT user_id) FROM agente_execucoes WHERE iniciado_em >= v_prev_from_ts AND iniciado_em < v_prev_to_ts),
        'unit', 'count'
      ),
      'payroll_completed', jsonb_build_object(
        'value', (SELECT count(*) FROM payroll_processing WHERE created_at >= v_from_ts AND created_at < v_to_ts AND status = 'completed'),
        'prev',  (SELECT count(*) FROM payroll_processing WHERE created_at >= v_prev_from_ts AND created_at < v_prev_to_ts AND status = 'completed'),
        'unit', 'count'
      ),
      'payroll_errors', jsonb_build_object(
        'value', (SELECT count(*) FROM payroll_processing WHERE created_at >= v_from_ts AND created_at < v_to_ts AND status = 'error'),
        'prev',  (SELECT count(*) FROM payroll_processing WHERE created_at >= v_prev_from_ts AND created_at < v_prev_to_ts AND status = 'error'),
        'unit', 'count'
      ),
      'payroll_in_progress', jsonb_build_object(
        'value', (SELECT count(*) FROM payroll_processing WHERE status IN ('pending','processing')),
        'prev',  0,
        'unit', 'count'
      ),
      'payroll_success_rate', jsonb_build_object(
        'value', coalesce((
          SELECT round((count(*) FILTER (WHERE status = 'completed')::numeric
                 / nullif(count(*) FILTER (WHERE status IN ('completed','error')), 0)) * 100, 1)
          FROM payroll_processing WHERE created_at >= v_from_ts AND created_at < v_to_ts
        ), 0),
        'prev', coalesce((
          SELECT round((count(*) FILTER (WHERE status = 'completed')::numeric
                 / nullif(count(*) FILTER (WHERE status IN ('completed','error')), 0)) * 100, 1)
          FROM payroll_processing WHERE created_at >= v_prev_from_ts AND created_at < v_prev_to_ts
        ), 0),
        'unit', 'percent'
      ),
      'sped_completed', jsonb_build_object(
        'value', (SELECT count(*) FROM sped_processing WHERE created_at >= v_from_ts AND created_at < v_to_ts AND status = 'completed'),
        'prev',  (SELECT count(*) FROM sped_processing WHERE created_at >= v_prev_from_ts AND created_at < v_prev_to_ts AND status = 'completed'),
        'unit', 'count'
      ),
      'sped_errors', jsonb_build_object(
        'value', (SELECT count(*) FROM sped_processing WHERE created_at >= v_from_ts AND created_at < v_to_ts AND status = 'error'),
        'prev',  (SELECT count(*) FROM sped_processing WHERE created_at >= v_prev_from_ts AND created_at < v_prev_to_ts AND status = 'error'),
        'unit', 'count'
      ),
      'sped_in_progress', jsonb_build_object(
        'value', (SELECT count(*) FROM sped_processing WHERE status IN ('pending','processing')),
        'prev',  0,
        'unit', 'count'
      ),
      'processes_consulted', jsonb_build_object(
        'value', (SELECT count(*) FROM process_snapshots WHERE created_at >= v_from_ts AND created_at < v_to_ts),
        'prev',  (SELECT count(*) FROM process_snapshots WHERE created_at >= v_prev_from_ts AND created_at < v_prev_to_ts),
        'unit', 'count'
      ),
      'process_queries', jsonb_build_object(
        'value', (SELECT count(*) FROM process_query_requests WHERE created_at >= v_from_ts AND created_at < v_to_ts),
        'prev',  (SELECT count(*) FROM process_query_requests WHERE created_at >= v_prev_from_ts AND created_at < v_prev_to_ts),
        'unit', 'count'
      ),
      'process_success_rate', jsonb_build_object(
        'value', coalesce((
          SELECT round((count(*) FILTER (WHERE status = 'completed')::numeric
                 / nullif(count(*) FILTER (WHERE status IN ('completed','error')), 0)) * 100, 1)
          FROM process_query_requests WHERE created_at >= v_from_ts AND created_at < v_to_ts
        ), 0),
        'prev', coalesce((
          SELECT round((count(*) FILTER (WHERE status = 'completed')::numeric
                 / nullif(count(*) FILTER (WHERE status IN ('completed','error')), 0)) * 100, 1)
          FROM process_query_requests WHERE created_at >= v_prev_from_ts AND created_at < v_prev_to_ts
        ), 0),
        'unit', 'percent'
      ),
      'kanban_active', jsonb_build_object(
        'value', (SELECT count(*) FROM legal_kanban_cards WHERE status NOT IN ('concluido','arquivado')),
        'prev',  0,
        'unit', 'count'
      ),
      'kanban_overdue', jsonb_build_object(
        'value', (
          SELECT count(*) FROM legal_kanban_cards
          WHERE due_date IS NOT NULL AND due_date < now()
            AND status NOT IN ('concluido','arquivado')
        ),
        'prev', 0,
        'unit', 'count'
      ),
      'kanban_completed', jsonb_build_object(
        'value', (SELECT count(*) FROM legal_kanban_cards WHERE completed_at >= v_from_ts AND completed_at < v_to_ts),
        'prev',  (SELECT count(*) FROM legal_kanban_cards WHERE completed_at >= v_prev_from_ts AND completed_at < v_prev_to_ts),
        'unit', 'count'
      ),
      'companies', jsonb_build_object(
        'value', (SELECT count(*) FROM companies),
        'prev',  (SELECT count(*) FROM companies WHERE created_at < v_from_ts),
        'unit', 'count'
      ),
      'leads_active', jsonb_build_object(
        'value', (SELECT count(*) FROM leads WHERE is_active = true),
        'prev',  (SELECT count(*) FROM leads WHERE is_active = true AND created_at < v_from_ts),
        'unit', 'count'
      ),
      'unread_notifications', jsonb_build_object(
        'value', (
          SELECT count(*) FROM notifications
          WHERE user_id = v_uid AND read_at IS NULL
        ),
        'prev', 0,
        'unit', 'count'
      )
    ) AS kpis
  ),
  attention AS (
    SELECT * FROM (
      SELECT
        1 AS ord,
        'kanban_overdue'::text AS kind,
        c.id::text AS item_id,
        c.title AS title,
        'Prazo ' || to_char(c.due_date AT TIME ZONE 'America/Sao_Paulo', 'DD/MM')
          || ' · ' || coalesce(b.title, 'Quadro') AS subtitle,
        CASE WHEN b.domain = 'operational'
          THEN '/gestao-operacional/quadros/' || b.slug
          ELSE '/documents/cases/quadros/' || b.slug
        END AS href,
        'warning'::text AS severity,
        c.due_date AS occurred_at
      FROM legal_kanban_cards c
      JOIN legal_kanban_boards b ON b.id = c.board_id
      JOIN legal_kanban_card_members m ON m.card_id = c.id
      WHERE v_uid IS NOT NULL
        AND m.user_id = v_uid
        AND c.due_date IS NOT NULL AND c.due_date < now()
        AND c.status NOT IN ('concluido','arquivado')

      UNION ALL

      SELECT
        2,
        'kanban_blocked',
        c.id::text,
        c.title,
        'Bloqueado · ' || coalesce(b.title, 'Quadro'),
        CASE WHEN b.domain = 'operational'
          THEN '/gestao-operacional/quadros/' || b.slug
          ELSE '/documents/cases/quadros/' || b.slug
        END,
        'warning',
        c.updated_at
      FROM legal_kanban_cards c
      JOIN legal_kanban_boards b ON b.id = c.board_id
      JOIN legal_kanban_card_members m ON m.card_id = c.id
      WHERE v_uid IS NOT NULL
        AND m.user_id = v_uid
        AND c.status = 'bloqueado'

      UNION ALL

      SELECT
        3,
        'payroll_error',
        p.id::text,
        'Folha ' || coalesce(p.competency, ''),
        coalesce(c.name, 'Empresa') || ' · erro no lote',
        '/payroll/processing/' || p.id::text,
        'critical',
        p.updated_at
      FROM payroll_processing p
      LEFT JOIN companies c ON c.id = p.company_id
      WHERE p.status = 'error'
        AND p.created_at >= v_from_ts AND p.created_at < v_to_ts

      UNION ALL

      SELECT
        4,
        'sped_error',
        p.id::text,
        'SPED ' || coalesce(p.competency, ''),
        coalesce(c.name, 'Empresa') || ' · erro no lote',
        '/documents/sped',
        'critical',
        p.updated_at
      FROM sped_processing p
      LEFT JOIN companies c ON c.id = p.company_id
      WHERE p.status = 'error'
        AND p.created_at >= v_from_ts AND p.created_at < v_to_ts

      UNION ALL

      SELECT
        5,
        'process_query_error',
        r.id::text,
        coalesce(r.search_value_label, 'Consulta processual'),
        'Falha na consulta DataJud',
        '/documents/cases/queries',
        'critical',
        r.created_at
      FROM process_query_requests r
      WHERE r.status = 'error'
        AND r.created_at >= v_from_ts AND r.created_at < v_to_ts

      UNION ALL

      SELECT
        6,
        'rag_error',
        d.id::text,
        d.nome_arquivo,
        'Falha na ingestão da base de conhecimento',
        '/ai-center-e7/conhecimento',
        'warning',
        d.atualizado_em
      FROM documentos d
      WHERE d.status = 'erro'

      UNION ALL

      SELECT
        7,
        'unread_mention',
        n.id::text,
        coalesce(n.payload->>'title', 'Menção em Equipes'),
        coalesce(n.payload->>'channel_name', 'Canal'),
        CASE
          WHEN n.payload ? 'team_slug' AND n.payload ? 'channel_slug'
            THEN '/teams/' || (n.payload->>'team_slug') || '/' || (n.payload->>'channel_slug')
          ELSE '/teams'
        END,
        'info',
        n.created_at
      FROM notifications n
      WHERE v_uid IS NOT NULL
        AND n.user_id = v_uid
        AND n.read_at IS NULL
    ) raw
    ORDER BY ord, occurred_at DESC
    LIMIT 8
  ),
  series_days AS (
    SELECT generate_series(v_series_from, v_to, interval '1 day')::date AS day
  ),
  ai_series AS (
    SELECT jsonb_agg(jsonb_build_object(
      'day', to_char(d.day, 'YYYY-MM-DD'),
      'execucoes', coalesce(e.n, 0),
      'custo', coalesce(e.custo, 0)
    ) ORDER BY d.day)
    FROM series_days d
    LEFT JOIN (
      SELECT (iniciado_em AT TIME ZONE 'America/Sao_Paulo')::date AS day,
             count(*) AS n,
             round(sum(custo_reais)::numeric, 2) AS custo
      FROM agente_execucoes
      WHERE iniciado_em >= v_series_from_ts AND iniciado_em < v_to_ts
      GROUP BY 1
    ) e ON e.day = d.day
  ),
  docs_series AS (
    SELECT jsonb_agg(jsonb_build_object(
      'day', to_char(d.day, 'YYYY-MM-DD'),
      'folha', coalesce(f.n, 0),
      'sped', coalesce(s.n, 0)
    ) ORDER BY d.day)
    FROM series_days d
    LEFT JOIN (
      SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day, count(*) AS n
      FROM payroll_processing
      WHERE created_at >= v_series_from_ts AND created_at < v_to_ts
      GROUP BY 1
    ) f ON f.day = d.day
    LEFT JOIN (
      SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day, count(*) AS n
      FROM sped_processing
      WHERE created_at >= v_series_from_ts AND created_at < v_to_ts
      GROUP BY 1
    ) s ON s.day = d.day
  ),
  kanban_series AS (
    SELECT jsonb_agg(jsonb_build_object(
      'day', to_char(d.day, 'YYYY-MM-DD'),
      'criados', coalesce(c.n, 0),
      'concluidos', coalesce(x.n, 0)
    ) ORDER BY d.day)
    FROM series_days d
    LEFT JOIN (
      SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day, count(*) AS n
      FROM legal_kanban_cards
      WHERE created_at >= v_series_from_ts AND created_at < v_to_ts
      GROUP BY 1
    ) c ON c.day = d.day
    LEFT JOIN (
      SELECT (completed_at AT TIME ZONE 'America/Sao_Paulo')::date AS day, count(*) AS n
      FROM legal_kanban_cards
      WHERE completed_at >= v_series_from_ts AND completed_at < v_to_ts
      GROUP BY 1
    ) x ON x.day = d.day
  ),
  my_cards AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'due_date', t.due_date,
      'priority', t.priority,
      'status', t.status,
      'board', t.board,
      'href', t.href
    ) ORDER BY t.due_date NULLS LAST), '[]'::jsonb) AS items
    FROM (
      SELECT
        c.id,
        c.title,
        c.due_date,
        c.priority,
        c.status,
        b.title AS board,
        CASE WHEN b.domain = 'operational'
          THEN '/gestao-operacional/quadros/' || b.slug
          ELSE '/documents/cases/quadros/' || b.slug
        END AS href
      FROM legal_kanban_cards c
      JOIN legal_kanban_boards b ON b.id = c.board_id
      JOIN legal_kanban_card_members m ON m.card_id = c.id
      WHERE v_uid IS NOT NULL
        AND m.user_id = v_uid
        AND c.status NOT IN ('concluido','arquivado')
      ORDER BY c.due_date NULLS LAST, c.updated_at DESC
      LIMIT 6
    ) t
  ),
  favorite_processes AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'cnj', t.cnj,
      'title', t.title,
      'tribunal', t.tribunal,
      'last_movement', t.last_movement,
      'href', '/documents/cases/' || t.id::text
    )), '[]'::jsonb) AS items
    FROM (
      SELECT s.id, s.cnj, s.title, s.tribunal, s.last_movement
      FROM process_user_state u
      JOIN process_snapshots s ON s.id = u.process_snapshot_id
      WHERE v_auth IS NOT NULL
        AND u.auth_user_id = v_auth
        AND u.is_favorite = true
        AND coalesce(u.is_deleted, false) = false
      ORDER BY u.updated_at DESC
      LIMIT 5
    ) t
  ),
  recent_processings AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'kind', t.kind,
      'title', t.title,
      'company', t.company,
      'status', t.status,
      'href', t.href,
      'at', t.at
    ) ORDER BY t.at DESC), '[]'::jsonb) AS items
    FROM (
      SELECT * FROM (
        SELECT
          p.id,
          'folha'::text AS kind,
          'Folha ' || coalesce(p.competency, '') AS title,
          coalesce(c.name, 'Empresa') AS company,
          p.status,
          '/payroll/processing/' || p.id::text AS href,
          p.created_at AS at
        FROM payroll_processing p
        LEFT JOIN companies c ON c.id = p.company_id
        UNION ALL
        SELECT
          p.id,
          'sped',
          'SPED ' || coalesce(p.competency, ''),
          coalesce(c.name, 'Empresa'),
          p.status,
          '/documents/sped',
          p.created_at
        FROM sped_processing p
        LEFT JOIN companies c ON c.id = p.company_id
      ) u
      ORDER BY at DESC
      LIMIT 6
    ) t
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object(
      'from', to_char(v_from, 'YYYY-MM-DD'),
      'to', to_char(v_to, 'YYYY-MM-DD'),
      'prev_from', to_char(v_prev_from, 'YYYY-MM-DD'),
      'prev_to', to_char(v_prev_to, 'YYYY-MM-DD')
    ),
    'kpis', (SELECT kpis FROM metric),
    'attention', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'kind', a.kind,
        'id', a.item_id,
        'title', a.title,
        'subtitle', a.subtitle,
        'href', a.href,
        'severity', a.severity,
        'at', a.occurred_at
      ) ORDER BY a.ord, a.occurred_at DESC)
      FROM attention a
    ), '[]'::jsonb),
    'series', jsonb_build_object(
      'ai', coalesce((SELECT * FROM ai_series), '[]'::jsonb),
      'docs', coalesce((SELECT * FROM docs_series), '[]'::jsonb),
      'kanban', coalesce((SELECT * FROM kanban_series), '[]'::jsonb)
    ),
    'my_cards', (SELECT items FROM my_cards),
    'favorite_processes', (SELECT items FROM favorite_processes),
    'recent_processings', (SELECT items FROM recent_processings)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.report_dashboard_home(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.report_dashboard_home(date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.report_dashboard_home(date, date) TO authenticated;
