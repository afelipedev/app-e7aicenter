# Correção: Criação Automática de Usuários

## Problema Identificado

Quando um novo usuário era criado na tabela `auth.users`, o usuário não era automaticamente criado na tabela `public.users`, causando inconsistências no sistema.

## Causa do Problema

1. **Problemas de Permissão**: A função `handle_new_user()` original não tinha as permissões adequadas
2. **Falha no Acesso aos Metadados**: O acesso ao `raw_user_meta_data` podia falhar silenciosamente
3. **Falta de Tratamento de Erros**: Não havia logs ou tratamento adequado de erros
4. **Função Não Defensiva**: A função não lidava com casos onde os metadados não existiam

## Solução Implementada

### 1. Arquivo de Correção: `004_fix_user_creation.sql`

**Principais melhorias:**

- ✅ **Remoção Segura**: Remove trigger e função existentes com tratamento de erros
- ✅ **Função Robusta**: Nova função `handle_new_user()` com tratamento completo de erros
- ✅ **Logs de Debug**: Adiciona logs detalhados para facilitar o diagnóstico
- ✅ **Fallbacks Inteligentes**: Usa valores padrão quando metadados não estão disponíveis
- ✅ **Validação de Roles**: Valida e corrige roles inválidas automaticamente
- ✅ **Criação Manual**: Função `create_user_manually()` para casos especiais
- ✅ **Sincronização**: Função `sync_existing_auth_users()` para usuários existentes

### 2. Características da Nova Função

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- Executa com privilégios do proprietário
SET search_path = public  -- Define schema padrão
```

**Tratamento de Dados:**
- **Email**: Obrigatório, extraído diretamente de `NEW.email`
- **Nome**: Extraído dos metadados com múltiplos fallbacks
- **Role**: Validada contra roles permitidas, padrão 'advogado'
- **Verificação**: Evita duplicação verificando se usuário já existe

**Fallbacks para Nome:**
1. `raw_user_meta_data->>'name'`
2. `raw_user_meta_data->>'full_name'`
3. `raw_user_meta_data->>'display_name'`
4. Parte do email antes do '@'
5. 'Usuário' (último recurso)

**Roles Válidas:**
- `administrador`
- `ti`
- `advogado_adm`
- `advogado` (padrão)
- `contabil`
- `financeiro`

### 3. Funções Auxiliares

#### `create_user_manually()`
Para criar usuários manualmente quando necessário:
```sql
SELECT public.create_user_manually(
    user_id uuid,
    user_email text,
    user_name text DEFAULT NULL,
    user_role text DEFAULT 'advogado'
);
```

#### `sync_existing_auth_users()`
Para sincronizar usuários que já existem em `auth.users`:
```sql
SELECT public.sync_existing_auth_users();
```

### 4. Arquivo de Teste: `005_test_user_creation.sql`

Executa testes automáticos para verificar:
- ✅ Existência do trigger e função
- ✅ Criação automática via trigger
- ✅ Criação manual via função
- ✅ Sincronização de contagens
- ✅ Logs detalhados do processo

## Como Usar

### Para Novos Usuários
A criação automática agora funciona automaticamente quando um usuário é registrado via Supabase Auth.

### Para Usuários Existentes
Execute a sincronização:
```sql
SELECT public.sync_existing_auth_users();
```

### Para Criar Usuário Manualmente
```sql
SELECT public.create_user_manually(
    'uuid-do-usuario',
    'email@exemplo.com',
    'Nome do Usuário',
    'advogado'
);
```

## Verificação

Para verificar se tudo está funcionando:

```sql
-- Contar usuários
SELECT 
    (SELECT COUNT(*) FROM auth.users) as auth_users,
    (SELECT COUNT(*) FROM public.users) as public_users;

-- Verificar trigger
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Verificar função
SELECT * FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';
```

## Status da Correção

✅ **Aplicado com Sucesso**: A correção foi aplicada no Supabase
✅ **Testado**: Testes automáticos executados
✅ **Documentado**: Documentação completa criada
✅ **Sincronizado**: Usuários existentes sincronizados

## Próximos Passos

1. **Monitorar Logs**: Verificar logs do Supabase para confirmar funcionamento
2. **Testar Registro**: Criar novos usuários via interface de registro
3. **Verificar Dados**: Confirmar que dados estão sendo criados corretamente

## Suporte

Se ainda houver problemas:
1. Verifique os logs do Supabase
2. Execute o script de teste novamente
3. Use a função de criação manual como alternativa
4. Verifique as permissões do banco de dados