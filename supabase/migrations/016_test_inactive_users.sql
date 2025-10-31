-- Verificar usuários existentes e criar um usuário inativo para teste
SELECT email, status, role FROM public.users;

-- Atualizar um usuário existente para status inativo para teste
UPDATE public.users 
SET status = 'inativo', updated_at = NOW()
WHERE email = 'andre@e7ai.com.br';