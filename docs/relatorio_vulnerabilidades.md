# Relatório de Segurança — e7aicenter.vercel.app

**Data:** 03/07/2026  
**Alvo:** https://e7aicenter.vercel.app  
**Stack:** React + Vite (Lovable.dev) · Supabase · n8n · AWS S3  
**Classificação:** Pentest — Caixa Cinza (Gray Box)  

---

## Sumário Executivo

Foram encontradas **13 vulnerabilidades**, sendo **5 de alta gravidade**, **3 de média** e **5 de baixa**. A criticidade mais relevante está na exposição de chaves e URLs internas diretamente no frontend, permitindo que um atacante mapeie toda a infraestrutura sem necessidade de autenticação.

---

## 🔴 Alta

### V001 — Supabase Anon Key Hardcoded no Frontend

**Localização:** `assets/index-f-MnB0_c.js`  
**Gravidade:** Alta  
**CVSS:** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N)

**Descrição:** A chave anon do Supabase está hardcoded no JavaScript do frontend. Embora a anon key seja projetada para ser pública, ela permite acessar a API REST do Supabase e enumerar as tabelas existentes no banco sem autenticação.

**Chave encontrada:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1c3dlemRvemhhZGtlZ25wdHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODA0OTIsImV4cCI6MjA3NzA1NjQ5Mn0.zXnmBnHrEXj63kygqaJ14XtMeFh4D8CeWm4KBFEuH1w
```

**Tabelas enumeráveis via anon key:** `users`, `companies`, `leads`, `teams`, `channels`, `posts`, `audit_logs`, `notifications`

**Impacto:** Um atacante consegue descobrir toda a estrutura do banco de dados sem autenticação. Embora o RLS (Row Level Security) esteja filtrando os dados corretamente (retornando `[]` vazio), a simples existência das tabelas é informação valiosa para planejamento de ataques.

**Evidência:**
```bash
# Sem token de auth, apenas com anon key
curl -H "apikey: {anon_key}" https://huswezdozhadkegnptsa.supabase.co/rest/v1/users
# Resposta: 200 OK [] (tabela existe mas RLS filtra)
```

**Recomendação:** 
- Revisar as RLS policies para que também bloqueiem o acesso a tabelas não autorizadas (retornar 404 em vez de 200 vazio)
- Utilizar `Supabase` apenas server-side ou com proxy intermediário
- Configurar o Supabase para não expor o schema via REST API pública

---

### V002 — n8n Interno Exposto

**Localização:** `https://n8n-lab-n8n.bjivvx.easypanel.host`  
**Gravidade:** Alta  
**CVSS:** 8.2 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:L)

**Descrição:** O host e os webhooks do n8n (plataforma de automação low-code) estão hardcoded no frontend, permitindo que qualquer pessoa descubra e invoque endpoints de automação interna.

**Webhooks expostos:**
| Endpoint | Status | Descrição |
|---|---|---|
| `/webhook/processar-holerite` | ✅ 200 POST | Processamento de holerites |
| `/webhook/upload-sped-efd` | ✅ 200 POST | Upload de arquivos SPED EFD |
| `/webhook/agente-juridico-dinamico` | ⚠️ 400 POST | Agente jurídico |
| `/webhook/processar-lote-folha` | ❌ 404 POST | Lote de folha |

**Impacto:** Um atacante pode:
- Invocar webhooks para processar dados indevidamente
- Causar negação de serviço enviando payloads maliciosos
- Explorar vulnerabilidades de Server-Side Request Forgery (SSRF) caso os webhooks acessem recursos internos

**Evidência:**
```bash
curl -X POST https://n8n-lab-n8n.bjivvx.easypanel.host/webhook/processar-holerite \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Resposta: 200 OK
```

**Recomendação:**
- Remover as URLs do n8n do frontend — as automações devem ser chamadas via backend próprio
- Adicionar autenticação nos webhooks (API key ou token)
- Restringir o acesso ao n8n por IP ou VPN
- Utilizar um proxy reverso com rate limiting

---

### V003 — Campos Vulneráveis na Tabela Users (Escalação de Privilégio)

**Localização:** Tabela `users` do Supabase (schema `public`)  
**Gravidade:** 🔴 Crítica  
**CVSS:** 8.8 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H)

**Descrição:** A tabela `users` não possui RLS policies restritivas para operações de UPDATE/PATCH. Um usuário autenticado pode modificar **qualquer campo do seu próprio registro**, incluindo `role`, `status` e `first_access_completed`, via requisição PATCH direta à API REST do Supabase.

**Evidência prática — Escalação de privilégio (role → admin):**
```bash
# Usuário comum altera próprio role para admin
curl -X PATCH "https://huswezdozhadkegnptsa.supabase.co/rest/v1/users?auth_user_id=eq.c1c690a2-dc0d-4fae-9ae9-e83426adc432" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
# Resposta: 204 No Content (alterado com sucesso)
```

**Evidência prática — Bypass de primeiro acesso:**
```bash
# Usuário altera flag first_access_completed
curl -X PATCH "https://huswezdozhadkegnptsa.supabase.co/rest/v1/users?auth_user_id=eq.c1c690a2-dc0d-4fae-9ae9-e83426adc432" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{"first_access_completed": true}'
# Resposta: 204 No Content (flag burlada)
```

**Campos alteráveis da tabela `users` (sem qualquer RLS restritiva):**
```json
{
  "id": "UUID (gerado automaticamente)",
  "auth_user_id": "UUID (referência auth.users)",
  "name": "string — alterável",
  "email": "string — alterável",
  "role": "string — **alterável** (advogado → admin)",
  "status": "string — **alterável** (inativo → ativo)",
  "first_access_completed": "boolean — **alterável**",
  "phone": "string — alterável",
  "avatar_url": "string — alterável"
}
```

**Impacto:**
- Qualquer usuário pode se tornar **admin** e acessar todas as funcionalidades administrativas
- Usuários inativos podem reativar a própria conta
- Flags de controle como `first_access_completed` podem ser manipuladas
- Um atacante com acesso a um token válido consegue controle total sobre seu perfil

**Recomendação:**
- **Implementar RLS policy imediatamente** para a operação UPDATE:
  ```sql
  CREATE POLICY "users_update_self_restricted" ON users
    FOR UPDATE
    USING (auth.uid() = auth_user_id)
    WITH CHECK (
      auth.uid() = auth_user_id
      AND role = (SELECT role FROM users WHERE auth_user_id = auth.uid())
      AND status = (SELECT status FROM users WHERE auth_user_id = auth.uid())
      AND first_access_completed IS NOT DISTINCT FROM (
        SELECT first_access_completed FROM users WHERE auth_user_id = auth.uid()
      )
    );
  ```
- Criar uma RPC function (SECURITY DEFINER) para operações específicas que precisam alterar esses campos
- Nunca confiar em flags client-side para controle de acesso
- Auditoria de alterações em campos sensíveis

---

## 🟡 Média

### V004 — Rotas Administrativas Expostas

**Localização:** `https://e7aicenter.vercel.app/admin/*`  
**Gravidade:** Média  
**CVSS:** 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)

**Descrição:** As rotas `/admin/settings`, `/admin/users`, `/admin/teams` estão acessíveis na aplicação SPA. Embora o conteúdo seja renderizado apenas para usuários autorizados (controle via frontend), as rotas são publicamente conhecidas.

**Rotas expostas:**
- `/admin` — Dashboard admin
- `/admin/settings` — Configurações
- `/admin/users` — Gerenciamento de usuários
- `/admin/teams/:teamId` — Times

**Recomendação:**
- Renomear as rotas admin para paths não óbvios
- Implementar verificação de role no backend antes de renderizar dados sensíveis
- Adicionar logging de tentativas de acesso não autorizado

---

### V005 — CORS Totalmente Aberto

**Localização:** `https://e7aicenter.vercel.app`  
**Gravidade:** Média  
**CVSS:** 4.7 (AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N)

**Descrição:** O servidor retorna `Access-Control-Allow-Origin: *` em todas as respostas, permitindo que qualquer site externo faça requisições cross-origin.

**Evidência:**
```
access-control-allow-origin: *
```

**Impacto:** Um atacante pode criar um site malicioso que se passa pelo e7aicenter e capturar tokens de sessão, dados de usuários ou realizar ataques de CSRF.

**Recomendação:**
- Configurar CORS para aceitar apenas origins conhecidas:
  ```
  Access-Control-Allow-Origin: https://e7aicenter.vercel.app
  ```
- Utilizar Vercel `vercel.json` ou `next.config.js` para configurar CORS

---

### V006 — Supabase Edge Functions Chamadas Diretamente do Frontend

**Localização:** `https://huswezdozhadkegnptsa.supabase.co/functions/v1/*`  
**Gravidade:** Média  
**CVSS:** 5.0 (AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:N)

**Descrição:** As Edge Functions do Supabase são chamadas diretamente do navegador, com a URL hardcoded no frontend.

**Endpoints expostos:**
- `/functions/v1/chat-completion`
- `/functions/v1/download-file`

**Evidência:**
```javascript
// Extraído do JS do frontend
fetch("https://huswezdozhadkegnptsa.supabase.co/functions/v1/chat-completion", ...)
```

**Recomendação:**
- Centralizar chamadas às Edge Functions através de um backend intermediário
- Adicionar autenticação JWT com validação no servidor
- Implementar rate limiting nas funções

---

## 🟢 Baixa

### V007 — Buckets AWS S3 com Nomes Conhecidos

**Localização:** AWS S3 (sa-east-1 e us-east-1)  
**Gravidade:** Baixa  
**CVSS:** 3.7 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)

**Descrição:** Os nomes dos buckets S3 estão hardcoded no frontend, permitindo que um atacante tente enumerar arquivos.

**Buckets expostos:**
```
https://e7pdf-holerite.s3.sa-east-1.amazonaws.com
https://e7sped-processados.s3.amazonaws.com
```

**Recomendação:**
- Remover URLs de S3 do frontend
- Utilizar URLs pré-assinadas (presigned URLs) com expiração curta
- Configurar políticas de bucket para negar listagem pública

---

### V008 — SPA Catch-All Expõe Paths Sensíveis

**Localização:** `https://e7aicenter.vercel.app/*`  
**Gravidade:** Baixa  
**CVSS:** 2.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)

**Descrição:** O Vercel serve o mesmo HTML do SPA para todas as rotas desconhecidas, incluindo paths sensíveis como `/.well-known/` e `/api/`. Todas retornam HTTP 200, impossibilitando distinguir rotas reais de falsas.

**Paths que retornam 200 (SPA fallback):**
```
/.well-known/jwks.json
/api/broadcast
/functions/v1/download-file
```

**Recomendação:**
- Configurar o `vercel.json` para retornar 404 para paths que não existem de fato
- Separar rotas de API (`/api/*`) para um subdomínio ou função serverless

---

### V009 — UUID do Projeto Lovable Vazado

**Localização:** Meta tag `og:title` no HTML  
**Gravidade:** Baixa  
**CVSS:** 1.0 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)

**Descrição:** O meta tag `og:title` contém o UUID do projeto Lovable (`ad4568a7-7fc1-47ce-9793-2e1db33dbd44`), expondo informação de infraestrutura.

**Recomendação:**
- Substituir o `og:title` por um título descritivo real
- Revisar tags HTML geradas automaticamente

---

### V010 — Informações de Build Expostas via Cache Vercel

**Localização:** Headers HTTP  
**Gravidade:** Baixa  
**CVSS:** 1.0 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)

**Descrição:** Headers `x-vercel-id` e `x-vercel-cache` expõem informações sobre a infraestrutura de deploy.

**Headers expostos:**
```
x-vercel-id: gru1::xyz-1234567890
x-vercel-cache: HIT
```

**Recomendação:**
- Utilizar Vercel Firewall para remover headers internos
- Habilitar opção "Remove Vercel headers" nas configurações do projeto

---

### V011 — `auth_user_id` Exposto Permite Correlação de Contas

**Localização:** Tabela `users` do Supabase — coluna `auth_user_id`  
**Gravidade:** Média  
**CVSS:** 5.3 (AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N)

**Descrição:** A coluna `auth_user_id` na tabela pública `users` expõe o UUID interno do `auth.users` do Supabase. Qualquer usuário autenticado pode listar todos os `auth_user_id` da tabela.

**Evidência:**
```bash
curl "https://huswezdozhadkegnptsa.supabase.co/rest/v1/users?select=auth_user_id,email,role" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
# Retorna a lista de UUIDs de auth.users, emails e roles
```

**Impacto:** Um atacante consegue mapear a relação entre contas do sistema e UUIDs internos de autenticação, facilitando ataques direcionados.

**Recomendação:**
- Remover a coluna `auth_user_id` das queries públicas (SELECT)
- Utilizar o próprio `id` da tabela como referência, sem expor o UUID do auth.users

---

### V012 — Webhooks n8n sem Autenticação

**Localização:** `https://n8n-lab-n8n.bjivvx.easypanel.host/webhook/*`  
**Gravidade:** Alta  
**CVSS:** 8.2 (AV:N/AC:L/PR:N/UI:N/S:U:C/I:L/A:L)

**Descrição:** Os webhooks do n8n aceitam requisições POST sem qualquer token de autenticação, API key ou validação de origem. Qualquer pessoa na internet pode invocar as automações.

**Evidência:**
```bash
# Sem token, sem auth, qualquer payload funciona
curl -X POST https://n8n-lab-n8n.bjivvx.easypanel.host/webhook/processar-holerite \
  -H "Content-Type: application/json" \
  -d '{"cpf":"123.456.789-00","periodo":"2026-06"}'
# Resposta: 200 OK
```

**Impacto:**
- Processamento indevido de dados (folhas, holerites, SPED)
- Exfiltração de dados se os webhooks retornarem informações
- DoS enviando requisições em massa
- Possível SSRF se os webhooks acessarem recursos internos

**Recomendação:**
- Adicionar autenticação nos webhooks (n8n suporta `Header Auth` ou `Query Auth`)
- Utilizar API key via header customizado
- Restringir por IP ou Cloudflare WAF
- Auditoria de todas as chamadas recebidas

---

### V013 — Ausência de Canal para Reporte de Vulnerabilidades

**Localização:** `https://e7aicenter.vercel.app/.well-known/security.txt`  
**Gravidade:** Baixa  
**CVSS:** 1.0 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N)

**Descrição:** O endpoint `/.well-known/security.txt` não existe. Este arquivo é um padrão do IETF (RFC 9116) para fornecer um canal de contato para pesquisadores de segurança reportarem vulnerabilidades.

**Evidência:**
```bash
curl https://e7aicenter.vercel.app/.well-known/security.txt
# Resposta: 200 (HTML do SPA) — arquivo não configurado
```

**Impacto:** Pesquisadores de segurança não têm um canal oficial para reportar vulnerabilidades, aumentando o risco de descobertas não serem comunicadas.

**Recomendação:**
- Criar o arquivo `public/.well-known/security.txt`:
  ```
  Contact: mailto:seguranca@e7aivieira.com.br
  Encryption: https://keybase.io/e7aivieira/pgp_keys.asc
  Preferred-Languages: pt-BR, en
  Policy: https://e7aicenter.vercel.app/security-policy
  Expires: 2027-07-03T00:00:00.000Z
  ```

---

## Anexos

### A. Tabelas do Banco de Dados (Supabase)

| Tabela | Acessível via Anon Key | Dados Expostos |
|---|---|---|
| `users` | ✅ Sim | `id`, `auth_user_id`, `name`, `email`, `role`, `status`, `first_access_completed`, `phone`, `avatar_url`, `created_at`, `updated_at`, `last_access` |
| `companies` | ✅ Sim | N/A (vazia) |
| `leads` | ✅ Sim | N/A (vazia) |
| `teams` | ✅ Sim | N/A (vazia) |
| `channels` | ✅ Sim | N/A (vazia) |
| `posts` | ✅ Sim | N/A (vazia) |
| `audit_logs` | ✅ Sim | `event_type`, `user_id`, `created_at`, `ip_address`, `user_agent` |
| `notifications` | ✅ Sim | N/A (vazia) |

### B. Rotas do Frontend

```
/login                          # Pública
/perfil                         # Autenticada
/companies/*                    # Autenticada
/admin/*                        # Autenticada (admin)
/assistants/*                   # Autenticada
/documents/*                    # Autenticada
/gestao-operacional/*           # Autenticada
/leads                          # Autenticada
/payroll/*                      # Autenticada
/teams/*                        # Autenticada
```

### C. Infraestrutura Exposta

| Recurso | URL | Risco |
|---|---|---|
| Supabase Project | `huswezdozhadkegnptsa.supabase.co` | 🔴 Alto |
| n8n Automation | `n8n-lab-n8n.bjivvx.easypanel.host` | 🔴 Alto |
| AWS S3 Buckets | `e7pdf-holerite.s3.sa-east-1.amazonaws.com` | 🟡 Médio |
| Edge Functions | `huswezdozhadkegnptsa.supabase.co/functions/v1/*` | 🟡 Médio |

---

## Prioridades de Correção

| Prioridade | Vulnerabilidade | Esforço Estimado |
|---|---|---|
| 🔴 Crítica | V003 — Escalação de privilégio na tabela users | 2-4h |
| 🔴 Crítica | V002 + V012 — n8n exposto e sem autenticação | 4-8h |
| 🟡 Alta | V001 — Anon key + tabelas enumeráveis | 4h |
| 🟡 Alta | V005 — CORS aberto | 30min |
| 🟡 Alta | V011 — `auth_user_id` exposto | 1h |
| 🟢 Média | V004 — Rotas admin expostas (ofuscação) | 2h |
| 🟢 Média | V006 — Edge Functions direto do frontend | 4-8h |
| 🔵 Baixa | V007-V010, V013 — Infraestrutura/security.txt | 1-2h |

---

**Testes realizados por:** Profissional de Cyber Segurança (Pentest / Red Team)  
**Autorização:** NDAs assinadas — relatório confidencial  
**Ferramentas utilizadas:** Katana, Burp Suite, curl, Python, Supabase REST API
