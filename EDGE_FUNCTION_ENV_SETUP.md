# Configuração de Variáveis de Ambiente para Edge Function

## ✅ Status Atual

- ✅ Edge Function `chat-completion` **CRIADA E ATIVA**
- ✅ Código da função deployado
- ⚠️ **AÇÃO NECESSÁRIA:** Configurar variáveis de ambiente (secrets)

## Variáveis Necessárias

Para que a Edge Function `chat-completion` funcione corretamente, você precisa configurar as seguintes variáveis de ambiente no Supabase Dashboard:

### Opção 1: Via Supabase Dashboard (Recomendado - Mais Fácil)

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Selecione seu projeto: `huswezdozhadkegnptsa`

2. **Configure as Variáveis de Ambiente**
   - No menu lateral, clique em **Edge Functions**
   - Clique na função **chat-completion**
   - Vá para a aba **Settings** ou **Secrets**
   - Ou acesse diretamente: **Project Settings** → **Edge Functions** → **Secrets**

3. **Adicione as seguintes variáveis (uma por vez):**

   **Nome:** `OPENAI_API_KEY`  
   **Valor:** `[SUA_CHAVE_OPENAI_AQUI]`

   **Nome:** `GEMINI_API_KEY`  
   **Valor:** `[SUA_CHAVE_GEMINI_AQUI]`

   **Nota:** As variáveis na Edge Function NÃO usam o prefixo `VITE_` (isso é apenas para variáveis do frontend).

4. **Salve as alterações**

### Opção 2: Via Supabase CLI

Se preferir usar a CLI, primeiro instale o Supabase CLI:

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Outros sistemas:**
Veja: https://github.com/supabase/cli#install-the-cli

Depois configure os secrets:

```bash
# Fazer login
supabase login

# Linkar ao projeto
supabase link --project-ref huswezdozhadkegnptsa

# Configurar secrets
supabase secrets set OPENAI_API_KEY=[SUA_CHAVE_OPENAI_AQUI]

supabase secrets set GEMINI_API_KEY=[SUA_CHAVE_GEMINI_AQUI]
```

## Variáveis já configuradas no Frontend (.env)

As seguintes variáveis já estão configuradas no arquivo `.env` do projeto:

- `VITE_OPENAI_API_KEY` - Para uso no frontend (se necessário)
- `VITE_GEMINI_API_KEY` - Para uso no frontend (se necessário)

**Importante:** 
- As variáveis com prefixo `VITE_` são para o frontend
- As variáveis sem prefixo (`OPENAI_API_KEY`, `GEMINI_API_KEY`) são para a Edge Function no Supabase

## Testando a Configuração

Após configurar os secrets:

1. Reinicie o servidor de desenvolvimento (se estiver rodando)
2. Acesse o Chat Geral na aplicação
3. Envie uma mensagem de teste
4. Verifique se a resposta é gerada corretamente

Se houver erros, verifique:
- Se os secrets foram configurados corretamente no dashboard
- Se os nomes das variáveis estão exatamente como especificado (sem espaços extras)
- Os logs da Edge Function no Supabase Dashboard para ver erros detalhados

