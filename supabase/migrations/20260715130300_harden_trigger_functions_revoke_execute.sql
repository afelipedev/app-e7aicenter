-- Funções de trigger não devem ser invocáveis como RPC (/rest/v1/rpc). Triggers
-- disparam independentemente do privilégio EXECUTE, então revogar é seguro e
-- silencia os avisos do advisor (security_definer_function_executable) sem afetar
-- o funcionamento.
REVOKE EXECUTE ON FUNCTION public.users_guard_privileged_columns() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.kanban_enforce_created_by_and_limit() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.kanban_enforce_author_and_limit() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.audit_users_privileged_change() FROM anon, authenticated, public;

-- is_active_administrator() é chamada pelo trigger (SECURITY INVOKER) rodando como
-- 'authenticated', então mantém EXECUTE para authenticated; revoga só de anon/public.
REVOKE EXECUTE ON FUNCTION public.is_active_administrator() FROM anon, public;
