-- Verificar status dos usuários
SELECT email, status, role, created_at FROM public.users ORDER BY created_at;