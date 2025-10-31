# Migrações do Supabase - E7AI Center App

Este diretório contém as migrações SQL para configurar o banco de dados do E7AI Center App no Supabase.

## ✅ Status da Configuração

**CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!**

- ✅ Tabelas criadas (`companies`, `users`, `payslips`)
- ✅ Row Level Security (RLS) habilitado
- ✅ Políticas de permissão por role configuradas
- ✅ Ligação `auth.users` → `public.users` implementada
- ✅ 6 perfis de usuário definidos
- ✅ Contagem automática de holerites funcionando
- ✅ Dados iniciais inseridos
- ✅ Variáveis de ambiente configuradas

## Estrutura das Migrações

### 001_initial_setup.sql ✅
- Criação das tabelas principais (`companies`, `users`, `payslips`)
- Configuração de índices para performance
- Triggers para atualização automática de timestamps
- Sistema de contagem automática de holerites por empresa

### 002_rls_policies.sql ✅
- Habilitação do Row Level Security (RLS)
- Políticas de permissão baseadas em roles
- Controle de acesso por perfil de usuário

### 003_permissions_and_data.sql ✅
- Configuração de permissões básicas para roles `anon` e `authenticated`
- Função para criação automática de usuários
- Dados iniciais de exemplo

## Estrutura do Banco

### Tabelas Principais

#### `public.companies` ✅
- `id`: UUID (PK)
- `name`: Nome da empresa
- `cnpj`: CNPJ único
- `status`: Status (ativo/inativo)
- `payslips_count`: Contagem automática de holerites
- `created_at`, `updated_at`: Timestamps

#### `public.users` ✅
- `id`: UUID (PK)
- `auth_user_id`: Referência para `auth.users`
- `name`: Nome do usuário
- `email`: Email único
- `role`: Perfil do usuário (6 tipos)
- `company_id`: Empresa associada (opcional)
- `active`: Status ativo/inativo
- `created_at`, `updated_at`: Timestamps

#### `public.payslips` ✅
- `id`: UUID (PK)
- `company_id`: Referência para empresa
- `employee_name`: Nome do funcionário
- `amount`: Valor do holerite
- `period`: Período de referência
- `created_at`: Timestamp

## Perfis de Usuário ✅

1. **Administrador**: Acesso total
2. **TI**: Acesso total
3. **Advogado ADM**: Acesso total
4. **Advogado**: Acesso aos módulos (exceto telas admin)
5. **Contábil**: Acesso aos módulos, pode ver/adicionar empresas
6. **Financeiro**: Acesso aos módulos (exceto telas admin)

## Dados Inseridos ✅

- **5 empresas** de exemplo com diferentes status
- **41 holerites** distribuídos entre as empresas
- **Contagem automática** funcionando corretamente

## Configuração do Projeto ✅

### Variáveis de Ambiente
```env
VITE_SUPABASE_URL=https://huswezdozhadkegnptsa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Arquivos Criados
- ✅ `.env` - Variáveis de ambiente
- ✅ `.env.example` - Template das variáveis
- ✅ `supabase/migrations/` - Migrações organizadas
- ✅ `supabase/verify-setup.sql` - Script de verificação

## Verificação da Configuração

Execute o arquivo `verify-setup.sql` no SQL Editor do Supabase para verificar:
- Tabelas criadas corretamente
- RLS habilitado
- Políticas funcionando
- Dados inseridos
- Triggers ativos
- Contagem automática

## Recursos Implementados ✅

- ✅ Row Level Security (RLS)
- ✅ Políticas baseadas em roles
- ✅ Ligação automática `auth.users` → `public.users`
- ✅ Contagem automática de holerites
- ✅ Triggers para timestamps
- ✅ Índices para performance
- ✅ Dados iniciais de exemplo
- ✅ Função de criação automática de usuários
- ✅ Permissões básicas configuradas

## Próximos Passos

1. ✅ ~~Configure as variáveis de ambiente no projeto~~
2. ✅ ~~Execute as migrações no Supabase~~
3. 🔄 Teste a autenticação e autorização na aplicação
4. 🔄 Verifique as políticas de RLS em produção
5. 🔄 Implemente telas de cadastro de usuários
6. 🔄 Configure roles de usuário no sistema

## Comandos Úteis

```bash
# Verificar status do servidor
npm run dev

# Acessar aplicação
http://localhost:8085/

# Verificar logs do Supabase
# Acesse: https://huswezdozhadkegnptsa.supabase.co
```

---

**Configuração realizada com sucesso em 26/12/2024** 🎉