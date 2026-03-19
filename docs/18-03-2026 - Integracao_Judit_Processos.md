# Integração Judit Processos

## Objetivo

Implementar a integração real da Judit nos módulos de processos, substituindo mocks/localStorage por backend via Supabase Edge Functions, persistência em banco e geração do resumo estruturado do `E7 Agente Processual`.

## O que foi implementado

### Segurança

- Remoção do uso de `VITE_SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Neutralização do `supabaseAdmin` no browser com erro explícito para impedir uso inseguro.
- Sanitização da migration antiga `20260318002000_add_judit_provider_secrets.sql` para parar de versionar credenciais da Judit.
- `judit-processes` e `judit-process-agent` publicados com `verify_jwt: true`.

### Banco / Supabase

- Nova migration local e remota: `supabase/migrations/20260318153000_create_processes_judit_integration.sql`.
- Tabelas criadas:
  - `process_query_requests`
  - `process_snapshots`
  - `process_request_results`
  - `process_monitorings`
  - `process_user_state`
  - `process_agent_summaries`
- RLS habilitado em todas as tabelas novas.
- Índices adicionados para consultas por usuário, status, snapshot e monitoramento.
- Ajuste da view `judit_consumption_monthly_view` para `security_invoker = true`.

### Edge Functions

- `judit-processes`
  - dashboard real
  - listagem de consultas processuais
  - listagem de consultas históricas
  - consulta CNJ na Judit
  - consulta histórica por `CPF`, `CNPJ` e `OAB`
  - polling de request assíncrona
  - normalização e persistência de snapshots
  - detalhe consolidado do processo
  - favoritos
  - exclusão lógica
  - monitoramento processual
  - monitoramento por documento
  - opções de filtros
- `judit-process-agent`
  - leitura do snapshot persistido
  - cache por hash do snapshot
  - chamada ao `gpt-4o-mini`
  - resposta estruturada em:
    - `summary`
    - `parties`
    - `classification`
    - `subjects`
    - `movements`
    - `disclaimer`

### Frontend

- Refatoração de `src/features/processes/services/processesService.ts` para consumo real das Edge Functions.
- Expansão do contrato em `src/features/processes/adapters/processProvider.ts`.
- Novos hooks para:
  - busca CNJ
  - busca histórica
  - monitoramento de documento
  - resumo do agente processual
- Adequações nas páginas:
  - `ProcessQueriesPage.tsx`
  - `ProcessHistoryPage.tsx`
  - `ProcessDetailsPage.tsx`
- A aba `E7 Agente Processual` agora consome resumo estruturado real.
- A tela de histórico agora permite ativar/pausar monitoramento do documento consultado.

## Validações executadas

- `npm ci`
- `npm run build`
- migration aplicada com MCP do Supabase
- deploy das Edge Functions:
  - `judit-processes`
  - `judit-process-agent`
- advisor de segurança reexecutado

## Observações importantes

- A integração da Judit busca `JUDIT_API_KEY` via secret da Edge Function e, como fallback, na tabela `judit_provider_secrets`.
- O agente processual depende de `OPENAI_API_KEY` configurada no ambiente das Edge Functions do Supabase.
- O advisor de segurança ainda retorna avisos antigos e não relacionados diretamente a esta entrega, principalmente em funções legadas com `search_path` mutável e políticas permissivas em módulos de `sped`/`processing_logs`.

## Resultado esperado para o usuário

- Os usuários devem ser capazes de consultar processos por CNJ com dados reais da Judit.
- Os usuários devem ser capazes de consultar histórico por `CPF`, `CNPJ` e `OAB`.
- Os usuários devem ser capazes de monitorar processos e documentos com persistência no Supabase.
- Os usuários devem ser capazes de abrir o detalhe real do processo enriquecido.
- Os usuários devem ser capazes de visualizar o resumo estruturado do `E7 Agente Processual` na aba do agente.
