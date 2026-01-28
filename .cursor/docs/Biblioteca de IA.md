# Documentação - Biblioteca de IA

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura do Código](#estrutura-do-código)
3. [Integrações](#integrações)
4. [Fluxo de Funcionamento](#fluxo-de-funcionamento)
5. [Envio de Mensagens e Arquivos para o n8n](#envio-de-mensagens-e-arquivos-para-o-n8n)
   - [Gerenciamento de Sessão (sessionId)](#gerenciamento-de-sessão-sessionid)
6. [Configuração e Variáveis de Ambiente](#configuração-e-variáveis-de-ambiente)
7. [Estrutura de Dados](#estrutura-de-dados)

---

## 🎯 Visão Geral

A **Biblioteca de IA** é um módulo do E7AI Center que permite aos usuários interagir com mais de **50 agentes especializados** organizados em **11 temas** diferentes. Cada agente é executado via **webhooks do n8n**, permitindo integração com workflows externos e processamento avançado de IA.

### Características Principais

- **50+ Agentes Especializados**: Cobertura completa de áreas jurídicas, contábeis e administrativas
- **Organização por Temas**: 11 categorias temáticas para fácil navegação
- **Suporte a Arquivos**: Upload e processamento de documentos (PDF, TXT, DOC, DOCX, JSON, CSV)
- **Histórico de Conversas**: Persistência completa de chats e mensagens no Supabase
- **Memória de Conversas**: `sessionId` enviado ao n8n para continuidade de contexto entre mensagens
- **Interface Responsiva**: Suporte completo para desktop e mobile

---

## 🏗️ Estrutura do Código

### Organização de Arquivos

```
src/
├── pages/
│   └── assistants/
│       ├── AILibrary.tsx          # Página principal de listagem de temas
│       └── AgentChat.tsx           # Página de chat com agente específico
│
├── components/
│   └── assistants/
│       ├── ChatMessage.tsx        # Componente de exibição de mensagens
│       ├── ChatSidebar.tsx        # Sidebar com histórico de conversas
│       └── ThemeCard.tsx          # Card de tema na listagem
│
├── services/
│   └── n8nAgentService.ts         # Serviço de comunicação com webhooks n8n
│
├── config/
│   └── aiAgents.ts                # Configuração de todos os agentes e temas
│
└── hooks/
    └── useChatHistory.ts          # Hook para gerenciamento de histórico
```

### Arquivos Principais

#### 1. `src/config/aiAgents.ts`

**Responsabilidade**: Configuração centralizada de todos os agentes da biblioteca.

**Estrutura**:
- `AI_AGENTS`: Array com todos os 50+ agentes configurados
- `AGENT_THEMES`: Objeto com informações dos 11 temas
- Funções auxiliares: `getAgentById()`, `getAgentsByTheme()`, `getThemeInfo()`

**Interface `AIAgent`**:
```typescript
interface AIAgent {
  id: string;                    // ID único do agente (ex: "minuta-peticao-inicial")
  name: string;                  // Nome exibido na UI
  description: string;           // Descrição do agente
  theme: AgentTheme;             // Tema ao qual pertence
  webhookUrl: string;           // URL do webhook n8n (não usado diretamente)
  icon?: string;                // Ícone opcional
}
```

**Temas Disponíveis**:
1. `criacao-pecas-juridicas` - Criação de Peças Jurídicas
2. `revisao-pecas-juridicas` - Revisão de Peças Jurídicas
3. `extracao-dados` - Extração de Dados
4. `revisao-melhoria-textos` - Revisão e Melhoria de Textos
5. `estrategia-caso` - Estratégia do Caso
6. `jurisprudencia` - Jurisprudência
7. `atendimento-comunicacao-cliente` - Atendimento e Comunicação
8. `audiencia-julgamento` - Audiência e Julgamento
9. `marketing-juridico-vendas` - Marketing Jurídico e Vendas
10. `contratos` - Contratos
11. `areas-direito` - Áreas do Direito

#### 2. `src/pages/assistants/AgentChat.tsx`

**Responsabilidade**: Interface principal de chat com um agente específico.

**Funcionalidades**:
- Exibição de mensagens do chat
- Input de texto com suporte a múltiplas linhas (Shift+Enter)
- Upload de arquivos (máximo 10MB)
- Conversão de arquivos para Base64
- Gerenciamento de estado do chat atual
- Sidebar com histórico (desktop e mobile)

**Estados Principais**:
```typescript
const [input, setInput] = useState("");              // Texto do input
const [isSending, setIsSending] = useState(false);   // Estado de envio
const [attachedFile, setAttachedFile] = useState<File | null>(null);  // Arquivo anexado
const [fileContent, setFileContent] = useState<string>("");  // Conteúdo Base64 do arquivo
```

#### 3. `src/services/n8nAgentService.ts`

**Responsabilidade**: Serviço de comunicação com os webhooks do n8n.

**Classe Principal**: `N8NAgentService`

**Métodos Públicos**:
- `callAgent(agentId, input, arquivo?, sessionId?)`: Chama um agente específico via webhook com suporte a memória de conversa

**Métodos Privados**:
- `getWebhookUrl()`: Obtém URL do webhook dinâmico das variáveis de ambiente
- `callWebhook()`: Executa a chamada HTTP com retry logic
- `normalizeWebhookUrl()`: Normaliza URL removendo espaços e aspas
- `readBody()`: Lê e parseia resposta HTTP
- `delay()`: Helper para retry com backoff exponencial

**Características**:
- **Timeout**: 30 segundos por requisição
- **Retry**: Até 2 tentativas em caso de erro 5xx ou timeout
- **Backoff Exponencial**: 1s, 2s entre tentativas
- **Autenticação**: Bearer token do Supabase Auth

#### 4. `src/hooks/useChatHistory.ts`

**Responsabilidade**: Gerenciamento de histórico de conversas no Supabase.

**Funcionalidades**:
- Carregamento de chats do banco de dados
- Criação de novos chats
- Adição de mensagens
- Atualização de chats (título, favorito)
- Exclusão de chats
- Sincronização em tempo real via Supabase Realtime
- Deduplicação de mensagens

**Retorno do Hook**:
```typescript
{
  chats: Chat[];                    // Lista de todos os chats
  currentChat: Chat | undefined;    // Chat atual selecionado
  currentChatId: string | null;     // ID do chat atual
  favoriteChats: Chat[];           // Chats favoritos
  recentChats: Chat[];             // 20 chats mais recentes
  loading: boolean;                 // Estado de carregamento
  error: string | null;            // Erro se houver
  createNewChat: () => Promise<Chat>;
  updateChat: (id, updates) => Promise<void>;
  addMessage: (chatId, message) => Promise<void>;
  deleteChat: (chatId) => Promise<void>;
  toggleFavorite: (chatId) => Promise<void>;
  loadChat: (chatId) => Promise<Chat | null>;
  setCurrentChatId: (id) => void;
}
```

---

## 🔌 Integrações

### 1. n8n (Webhook Automation)

**Tipo**: Integração externa via HTTP POST

**URL Base**: Configurada via variável de ambiente `VITE_N8N_WEBHOOK_DINAMICO`

**Formato de Requisição**:
```json
{
  "agente": "minuta-peticao-inicial",
  "input": "Texto da mensagem do usuário",
  "sessionId": "uuid-do-chat",
  "arquivo": {
    "nome": "documento.pdf",
    "tipo": "application/pdf",
    "base64": "JVBERi0xLjQKJeLjz9MK..."
  }
}
```

**Observação sobre `sessionId`**: O campo `sessionId` contém o ID único do chat e deve ser utilizado pelo fluxo n8n para manter memória das mensagens anteriores, permitindo que os agentes deem continuidade ao contexto da conversa.

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {access_token_supabase}
```

**Formato de Resposta Esperado**:
```json
{
  "output": "Resposta do agente em texto"
}
```

**Tratamento de Respostas**:
- Se `response.output` existe → usa `output`
- Se `response.response` existe → usa `response`
- Se resposta é string → usa diretamente
- Se não corresponde a nenhum formato → converte para JSON string

**Tratamento de Erros**:
- **204 (No Content)**: Erro informando que workflow não retorna JSON
- **Corpo vazio**: Erro informando que workflow não retorna resposta
- **HTML**: Erro informando que URL pode estar incorreta
- **5xx ou Timeout**: Retry automático (até 2 tentativas)

### 2. Supabase (Banco de Dados)

**Tabelas Utilizadas**:

#### `chats`
```sql
CREATE TABLE public.chats (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    assistant_type VARCHAR(50) NOT NULL,  -- ID do agente ou tipo fixo
    title VARCHAR(255) NOT NULL,
    llm_model VARCHAR(50),                -- Não usado na Biblioteca de IA
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**Observação**: Na Biblioteca de IA, o campo `assistant_type` armazena o `agentId` do agente (ex: `"minuta-peticao-inicial"`), não um tipo fixo como nos outros chats.

#### `chat_messages`
```sql
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    role VARCHAR(20) CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ
);
```

**Row Level Security (RLS)**:
- Usuários só podem acessar seus próprios chats e mensagens
- Políticas baseadas em `auth.uid()` e `user_id`

**Realtime**:
- Subscription para mudanças em `chats` e `chat_messages`
- Atualização automática da UI quando novas mensagens são adicionadas

### 3. Supabase Auth

**Uso**: Autenticação para:
- Obter `access_token` para autorização no webhook n8n
- Validar usuário autenticado antes de chamar agentes
- Associar chats ao `user_id` correto

**Método**:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token;
```

---

## 🔄 Fluxo de Funcionamento

### Fluxo Completo: Envio de Mensagem com Arquivo

```
┌─────────────────┐
│   AgentChat.tsx │
│  (Interface UI) │
└────────┬────────┘
         │
         │ 1. Usuário digita mensagem e anexa arquivo
         │
         ▼
┌─────────────────┐
│  handleFileSelect│
│  - Valida tamanho│
│  - Converte para │
│    Base64        │
└────────┬────────┘
         │
         │ 2. handleSend() é chamado
         │
         ▼
┌─────────────────┐
│  addMessage()   │
│  (useChatHistory)│
│  - Salva mensagem│
│    do usuário no│
│    banco         │
└────────┬────────┘
         │
         │ 3. Prepara payload com arquivo
         │
         ▼
┌─────────────────┐
│ N8NAgentService │
│  .callAgent()   │
│  - Valida agente│
│  - Obtém token  │
│  - Chama webhook│
└────────┬────────┘
         │
         │ 4. HTTP POST para webhook n8n
         │
         ▼
┌─────────────────┐
│  Webhook n8n    │
│  - Processa     │
│  - Executa IA   │
│  - Retorna JSON │
└────────┬────────┘
         │
         │ 5. Resposta processada
         │
         ▼
┌─────────────────┐
│  addMessage()   │
│  - Salva resposta│
│    do assistente│
└────────┬────────┘
         │
         │ 6. UI atualizada via Realtime
         │
         ▼
┌─────────────────┐
│  ChatMessage    │
│  (Exibição)     │
└─────────────────┘
```

### Detalhamento das Etapas

#### Etapa 1: Seleção e Processamento de Arquivo

**Arquivo**: `src/pages/assistants/AgentChat.tsx` (linhas 73-105)

```typescript
const handleFileSelect = async (file: File) => {
  // Validação de tamanho (máximo 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    toast.error("Arquivo muito grande...");
    return;
  }

  setAttachedFile(file);

  // Conversão para Base64 usando FileReader
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    // Remove prefixo "data:application/...;base64,"
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    setFileContent(base64);
  };
  reader.readAsDataURL(file);
};
```

**Formatos Aceitos**: `.pdf`, `.txt`, `.doc`, `.docx`, `.json`, `.csv`

#### Etapa 2: Preparação do Payload

**Arquivo**: `src/pages/assistants/AgentChat.tsx` (linhas 124-146)

```typescript
const handleSend = async () => {
  // Mensagem do usuário (texto ou nome do arquivo)
  const userMessage = input.trim() || `Arquivo anexado: ${attachedFile?.name}`;
  
  // Preparar objeto arquivo se houver anexo
  let arquivoPayload: { nome: string; tipo: string; base64: string } | undefined;
  if (attachedFile && fileContent) {
    arquivoPayload = {
      nome: attachedFile.name,
      tipo: attachedFile.type,
      base64: fileContent, // Base64 SEM prefixo
    };
  }
  
  // Salvar mensagem do usuário no banco
  await addMessage(currentChat.id, {
    role: "user",
    content: displayMessage,
  });

  // Chamar agente n8n com sessionId para memória da conversa
  const response = await N8NAgentService.callAgent(
    agent.id,
    userMessage,
    arquivoPayload,
    String(currentChat.id)  // sessionId para memória no n8n
  );

  // Salvar resposta do assistente
  await addMessage(currentChat.id, {
    role: "assistant",
    content: response.output,
  });
};
```

#### Etapa 3: Chamada ao Webhook n8n

**Arquivo**: `src/services/n8nAgentService.ts` (linhas 68-100)

```typescript
static async callAgent(
  agentId: string,
  input: string,
  arquivo?: ArquivoPayload,
  sessionId?: string  // ID da sessão para memória de conversa
): Promise<N8NAgentResponse> {
  // 1. Validar que o agente existe
  const agent = getAgentById(agentId);
  if (!agent) {
    throw new Error(`Agente não encontrado: ${agentId}`);
  }

  // 2. Obter token de autenticação
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado");
  }

  // 3. Obter URL do webhook dinâmico
  const webhookUrl = this.getWebhookUrl();

  // 4. Fazer chamada HTTP
  return this.callWebhook(
    webhookUrl,
    agentId,
    input,
    session.access_token,
    0, // retryCount inicial
    arquivo,
    sessionId
  );
}
```

#### Etapa 4: Execução da Requisição HTTP

**Arquivo**: `src/services/n8nAgentService.ts` (linhas 105-260)

```typescript
private static async callWebhook(
  webhookUrl: string,
  agentId: string,
  input: string,
  accessToken: string,
  retryCount: number,
  arquivo?: ArquivoPayload,
  sessionId?: string  // ID da sessão para memória no n8n
): Promise<N8NAgentResponse> {
  // 1. Criar AbortController para timeout (30s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  // 2. Construir payload
  const payload: {
    agente: string;
    input: string;
    arquivo?: ArquivoPayload;
    sessionId?: string;
  } = {
    agente: agentId,
    input: input,
  };

  // 3. Adicionar arquivo se fornecido
  if (arquivo) {
    payload.arquivo = arquivo;
  }

  // 4. Adicionar sessionId se fornecido (para memória de conversa)
  if (sessionId) {
    payload.sessionId = sessionId;
  }

  // 5. Fazer requisição HTTP POST
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });

  // 6. Processar resposta
  // - Validar status HTTP
  // - Parsear JSON
  // - Extrair campo "output" ou "response"
  // - Retry em caso de erro 5xx ou timeout (preservando sessionId)
}
```

---

## 📤 Envio de Mensagens e Arquivos para o n8n

### Formato do Payload

O payload enviado para o webhook n8n segue esta estrutura:

```typescript
interface Payload {
  agente: string;        // ID do agente (ex: "minuta-peticao-inicial")
  input: string;         // Mensagem de texto do usuário
  sessionId?: string;    // ID do chat para memória de conversa no n8n
  arquivo?: {            // Opcional: presente apenas se arquivo foi anexado
    nome: string;        // Nome original do arquivo
    tipo: string;        // MIME type (ex: "application/pdf")
    base64: string;      // Conteúdo do arquivo em Base64 (SEM prefixo data:)
  };
}
```

### Exemplo de Payload com Arquivo

```json
{
  "agente": "extracao-dados-resumo-processo-juridico",
  "input": "Extraia os dados principais deste processo",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "arquivo": {
    "nome": "processo_12345.pdf",
    "tipo": "application/pdf",
    "base64": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDQgMCBSCi9Db250ZW50cyA1IDAgUgovTWVkaWFCb3ggWzAgMCA1OTUgODQyXQo+PgplbmRvYmoK..."
  }
}
```

### Processamento do Arquivo no Frontend

1. **Seleção**: Usuário seleciona arquivo via `<input type="file">`
2. **Validação**: Tamanho máximo de 10MB
3. **Conversão**: `FileReader.readAsDataURL()` converte para Data URL
4. **Limpeza**: Remove prefixo `data:application/...;base64,` deixando apenas Base64 puro
5. **Armazenamento**: Base64 armazenado em `fileContent` state
6. **Envio**: Incluído no payload como `arquivo.base64`

### Processamento no n8n

O webhook n8n recebe o payload e pode:

1. **Extrair o arquivo**: Decodificar Base64 para binário
2. **Processar conteúdo**: Usar bibliotecas de parsing (PDF, DOCX, etc.)
3. **Enviar para IA**: Incluir conteúdo do arquivo no contexto do LLM
4. **Retornar resposta**: JSON com campo `output` contendo a resposta

### Gerenciamento de Sessão (sessionId)

O `sessionId` é enviado em todas as requisições para permitir que os agentes no n8n mantenham memória das conversas anteriores.

**Como funciona**:

1. **Frontend**: O `AgentChat.tsx` envia `String(currentChat.id)` como `sessionId`
2. **Backend (n8n)**: O workflow recebe o `sessionId` e pode:
   - Armazenar histórico de mensagens associado a este ID
   - Recuperar contexto de mensagens anteriores
   - Dar continuidade ao assunto da conversa

**Benefícios**:
- Cada conversa tem seu próprio contexto isolado
- O agente "lembra" das mensagens anteriores do mesmo chat
- Permite referências a informações discutidas anteriormente
- Melhora a experiência de conversação contínua

**Implementação no n8n**:
O fluxo do n8n pode utilizar o `sessionId` para:
```
1. Receber sessionId no payload
2. Buscar histórico de mensagens com esse sessionId (ex: Redis, banco de dados)
3. Incluir histórico no contexto do prompt
4. Salvar nova mensagem associada ao sessionId
5. Retornar resposta contextualizada
```

**Exemplo de uso no n8n** (pseudocódigo):
```javascript
// No nó de processamento do n8n
const { agente, input, sessionId } = $input.all()[0].json;

// Recuperar histórico (se sessionId fornecido)
let conversationHistory = [];
if (sessionId) {
  conversationHistory = await getConversationHistory(sessionId);
}

// Adicionar nova mensagem ao histórico
conversationHistory.push({ role: 'user', content: input });

// Chamar LLM com histórico
const response = await callLLM(agente, conversationHistory);

// Salvar resposta no histórico
if (sessionId) {
  conversationHistory.push({ role: 'assistant', content: response });
  await saveConversationHistory(sessionId, conversationHistory);
}

return { output: response };
```

### Tratamento de Respostas

O serviço `N8NAgentService` trata diferentes formatos de resposta:

```typescript
// Formato 1: { output: "..." }
if (data.output !== undefined) {
  return { output: data.output };
}

// Formato 2: { response: "..." }
if (data.response !== undefined) {
  return { output: data.response };
}

// Formato 3: String direta
if (typeof data === "string") {
  return { output: data };
}

// Formato 4: Outro formato → converter para JSON string
return { output: JSON.stringify(data, null, 2) };
```

---

## ⚙️ Configuração e Variáveis de Ambiente

### Variável Obrigatória

#### `VITE_N8N_WEBHOOK_DINAMICO`

**Descrição**: URL do webhook n8n que recebe todas as requisições da Biblioteca de IA.

**Formato**: URL completa do webhook (ex: `https://n8n-lab-n8n.bjivvx.easypanel.host/webhook/agente-dinamico`)

**Uso**: O webhook n8n deve receber o campo `agente` no payload e rotear para o workflow correto baseado nesse ID.

**Exemplo de configuração**:
```env
VITE_N8N_WEBHOOK_DINAMICO=https://n8n-lab-n8n.bjivvx.easypanel.host/webhook/agente-dinamico
```

**Validação**: Se não configurada, lança erro:
```
"VITE_N8N_WEBHOOK_DINAMICO não configurado nas variáveis de ambiente"
```

### Normalização de URL

O serviço remove espaços e aspas comuns de arquivos `.env`:

```typescript
private static normalizeWebhookUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/^['"]|['"]$/g, "");
}
```

Isso permite configurações como:
```env
VITE_N8N_WEBHOOK_DINAMICO="https://..."
VITE_N8N_WEBHOOK_DINAMICO='https://...'
VITE_N8N_WEBHOOK_DINAMICO=https://...
```

---

## 📊 Estrutura de Dados

### Interface `ArquivoPayload`

```typescript
export interface ArquivoPayload {
  nome: string;      // Nome original do arquivo
  tipo: string;       // MIME type (ex: "application/pdf")
  base64: string;     // Conteúdo em Base64 SEM prefixo data:
}
```

### Interface `N8NAgentResponse`

```typescript
export interface N8NAgentResponse {
  output: string;    // Resposta do agente em texto
  error?: string;    // Erro opcional
}
```

### Interface `AIAgent`

```typescript
export interface AIAgent {
  id: string;                    // ID único (ex: "minuta-peticao-inicial")
  name: string;                  // Nome exibido
  description: string;           // Descrição
  theme: AgentTheme;             // Tema
  webhookUrl: string;           // URL do webhook (não usado diretamente)
  icon?: string;                // Ícone opcional
}
```

### Interface `Chat` (do hook)

```typescript
export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  assistantType: string;  // ID do agente na Biblioteca de IA
  llmModel?: LLMModel;    // Não usado na Biblioteca de IA
}
```

### Interface `ChatMessage`

```typescript
export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: number;
}
```

---

## 🔍 Detalhes Técnicos

### Retry Logic

**Condições para Retry**:
- Status HTTP 5xx (erro do servidor)
- Status 408 (Request Timeout)
- Timeout do AbortController (30 segundos)

**Estratégia**:
- Máximo de 2 tentativas adicionais (total de 3 tentativas)
- Backoff exponencial: 1s, 2s entre tentativas
- Mantém os mesmos parâmetros (agentId, input, arquivo, sessionId)

### Timeout

- **Duração**: 30 segundos por requisição
- **Implementação**: `AbortController` com `setTimeout`
- **Comportamento**: Após timeout, tenta retry se ainda houver tentativas disponíveis

### Autenticação

- **Método**: Bearer Token (JWT do Supabase)
- **Obtido via**: `supabase.auth.getSession()`
- **Header**: `Authorization: Bearer {access_token}`
- **Validação**: Se não houver sessão, lança erro antes de fazer requisição

### Persistência de Mensagens

**Fluxo**:
1. Mensagem do usuário é salva ANTES de chamar o agente
2. Resposta do agente é salva APÓS receber resposta
3. Atualização automática via Supabase Realtime
4. Deduplicação de mensagens no hook `useChatHistory`

**Tabela**: `chat_messages`
- `chat_id`: Referência ao chat
- `role`: "user" ou "assistant"
- `content`: Texto da mensagem
- `metadata`: JSONB para dados adicionais (não usado atualmente)

---

## 📝 Notas Importantes

### Diferença dos Outros Chats

A Biblioteca de IA funciona de forma diferente dos outros 5 chats (Chat Geral, Jurídico Tributário, etc.):

| Aspecto | Outros Chats | Biblioteca de IA |
|---------|-------------|------------------|
| **Seleção de LLM** | Sim, via `ModelSelector` | Não, definido no n8n |
| **Execução** | Edge Function `chat-completion` | Webhook n8n direto |
| **Prompt** | System prompt por `assistantType` | Definido no workflow n8n |
| **assistant_type** | Tipo fixo (`tax-law`, etc.) | ID do agente (`minuta-peticao-inicial`) |
| **Modelo** | Salvo em `chats.llm_model` | Não usado |

### Limitações Conhecidas

1. **Tamanho de Arquivo**: Máximo de 10MB por arquivo
2. **Timeout**: 30 segundos pode ser insuficiente para processamentos longos
3. **Formato de Resposta**: Depende do workflow n8n retornar JSON válido
4. **Sem Streaming**: Resposta completa é retornada de uma vez

### Melhorias Futuras Sugeridas

1. **Streaming de Respostas**: Suporte a Server-Sent Events (SSE) para respostas longas
2. **Múltiplos Arquivos**: Permitir upload de vários arquivos por mensagem
3. **Progresso de Upload**: Indicador visual de progresso para arquivos grandes
4. **Cache de Respostas**: Cache de respostas frequentes para melhor performance
5. **Retry Configurável**: Permitir configurar número de retries e timeout por agente

---

## 🔗 Referências

- **Configuração de Modelos**: `.cursor/docs/Configuracao dos Modelos de Agentes.md`
- **Documentação Geral**: `.cursor/docs/DOCUMENTACAO_PROJETO.md`
- **Migração de Chats**: `supabase/migrations/038_create_chat_system.sql`
- **Suporte a Agent IDs**: `supabase/migrations/039_allow_agent_id_as_assistant_type.sql`

---

**Última Atualização**: Janeiro 2025
**Versão**: 1.1

### Changelog

#### v1.1 (Janeiro 2025)
- Adicionado suporte a `sessionId` para memória de conversas no n8n
- O `currentChat.id` é enviado como `sessionId` em todas as requisições
- Permite que os agentes mantenham contexto entre mensagens do mesmo chat
