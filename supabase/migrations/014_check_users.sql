-- Verificar usuários existentes e seus roles
DO $$
DECLARE
    user_record RECORD;
BEGIN
    RAISE NOTICE 'Usuários existentes na tabela public.users:';
    
    FOR user_record IN 
        SELECT id, name, email, role, status 
        FROM public.users 
        ORDER BY created_at DESC
    LOOP
        RAISE NOTICE 'ID: %, Nome: %, Email: %, Role: %, Status: %', 
            user_record.id, user_record.name, user_record.email, user_record.role, user_record.status;
    END LOOP;
    
    RAISE NOTICE 'Roles únicos encontrados:';
    FOR user_record IN 
        SELECT DISTINCT role 
        FROM public.users 
        ORDER BY role
    LOOP
        RAISE NOTICE 'Role: %', user_record.role;
    END LOOP;
END $$;