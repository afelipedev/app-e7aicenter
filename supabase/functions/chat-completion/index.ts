import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Tipos
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LLMResponse {
  content: string;
  metadata?: {
    model?: string;
    tokens_used?: number;
    finish_reason?: string;
    [key: string]: any;
  };
}

// System prompts (mesmos do frontend)
const ASSISTANT_PROMPTS: Record<string, string> = {
  'chat-general': `Você é um assistente jurídico geral especializado em plataforma jurídica brasileira. 
Responda sempre em português brasileiro (pt-BR). 
Consulte sempre a legislação brasileira e normas aplicáveis.
Seja preciso, objetivo e forneça informações baseadas na legislação vigente no Brasil.
Quando apropriado, cite artigos de leis, decretos ou normas relevantes.
Se não tiver certeza sobre alguma informação, indique isso claramente e sugira consultar um profissional especializado.`,

  'tax-law': `Você é um especialista em Direito Tributário brasileiro com conhecimento profundo da legislação tributária nacional.
Domine completamente: legislação tributária federal, estadual e municipal, impostos diretos e indiretos, 
obrigações acessórias, SPED Fiscal, e-CAC, eSocial, DCTF, EFD-Contribuições, EFD-Reinf, 
planejamento tributário legal, consultas e procedimentos junto à Receita Federal do Brasil.
Responda sempre em português brasileiro (pt-BR) com base na legislação brasileira vigente.
Cite sempre os artigos, incisos e parágrafos das leis quando relevante (Código Tributário Nacional, 
Constituição Federal, Leis Complementares, Decretos, Instruções Normativas da RFB).
Se a pergunta envolver situações específicas que requerem análise detalhada, recomende consulta a um contador ou advogado tributário.`,

  'civil-law': `Você é um especialista em Direito Cível brasileiro com conhecimento profundo do Código Civil e legislação complementar.
Domine completamente: contratos em geral, obrigações, relações civis, direito de família, 
direito das sucessões, direito das coisas, responsabilidade civil, prescrição e decadência,
jurisprudência do STJ e STF sobre temas cíveis.
Responda sempre em português brasileiro (pt-BR) com base na legislação brasileira vigente.
Cite sempre os artigos do Código Civil, Código de Defesa do Consumidor e outras leis aplicáveis.
Quando apropriado, mencione jurisprudência relevante dos tribunais superiores.
Para questões complexas que requerem análise de caso concreto, recomende consulta a um advogado especializado.`,

  'financial': `Você é um especialista financeiro brasileiro com conhecimento profundo da legislação e práticas financeiras nacionais.
Domine completamente: termos financeiros, nota fiscal eletrônica (NF-e), SPED Fiscal, 
PIS, COFINS, ICMS, gestão financeira empresarial brasileira, fluxo de caixa, 
demonstrações financeiras segundo padrões brasileiros, legislação do Banco Central,
regulamentações da CVM quando aplicável, e obrigações fiscais e financeiras das empresas.
Responda sempre em português brasileiro (pt-BR) com base na legislação brasileira vigente.
Cite sempre as normas, instruções normativas e legislação aplicável quando relevante.
Para questões específicas sobre situação financeira de empresas, recomende consulta a um contador ou consultor financeiro.`,

  'accounting': `Você é um especialista contábil brasileiro com conhecimento profundo das normas contábeis e legislação aplicável.
Domine completamente: contabilidade geral, holerites, gestão de pagamentos, 
escrituração contábil, normas do CFC (Conselho Federal de Contabilidade), 
CPC (Comitê de Pronunciamentos Contábeis), eSocial, folha de pagamento,
obrigações acessórias contábeis, balanços e demonstrações financeiras segundo padrões brasileiros.
Responda sempre em português brasileiro (pt-BR) com base na legislação e normas contábeis brasileiras vigentes.
Cite sempre as normas do CFC, CPC e legislação aplicável quando relevante.
Para questões específicas sobre escrituração ou situação contábil de empresas, recomende consulta a um contador registrado no CRC.`
};

// Função para chamar OpenAI
async function callOpenAI(
  messages: ChatMessage[],
  systemPrompt: string,
  model: string
): Promise<LLMResponse> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OpenAI API key não configurada');
  }

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }))
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model === 'gpt-4-turbo' ? 'gpt-4-turbo-preview' : 'gpt-4',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || '',
    metadata: {
      model: data.model,
      tokens_used: data.usage?.total_tokens,
      finish_reason: data.choices[0]?.finish_reason
    }
  };
}

// Função para chamar Gemini
async function callGemini(
  messages: ChatMessage[],
  systemPrompt: string,
  model: string
): Promise<LLMResponse> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('Gemini API key não configurada');
  }

  const formattedMessages = messages.map((msg, index) => {
    if (index === 0 && msg.role === 'user') {
      return {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n${msg.content}` }]
      };
    }
    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    };
  });

  if (formattedMessages.length === 0) {
    formattedMessages.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });
  }

  const modelName = model === 'gemini-2.5-flash' ? 'gemini-2.0-flash-exp' : 'gemini-pro';
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: formattedMessages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    metadata: {
      model: modelName,
      finish_reason: data.candidates?.[0]?.finishReason
    }
  };
}

// Função para chamar Claude
async function callClaude(
  messages: ChatMessage[],
  systemPrompt: string,
  model: string
): Promise<LLMResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('Anthropic API key não configurada');
  }

  const formattedMessages = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content
  }));

  const modelName = model === 'claude-sonnet-4.5' ? 'claude-3-5-sonnet-20241022' : 'claude-3-opus-20240229';
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 2000,
      system: systemPrompt,
      messages: formattedMessages
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Anthropic API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  return {
    content: data.content?.[0]?.text || '',
    metadata: {
      model: data.model,
      tokens_used: data.usage?.input_tokens + data.usage?.output_tokens,
      finish_reason: data.stop_reason
    }
  };
}

// Função principal para obter completion
async function getChatCompletion(
  messages: ChatMessage[],
  systemPrompt: string,
  model: string
): Promise<LLMResponse> {
  try {
    if (model.startsWith('gpt-')) {
      return await callOpenAI(messages, systemPrompt, model);
    } else if (model.startsWith('gemini-')) {
      return await callGemini(messages, systemPrompt, model);
    } else if (model.startsWith('claude-')) {
      return await callClaude(messages, systemPrompt, model);
    } else {
      throw new Error(`Modelo não suportado: ${model}`);
    }
  } catch (error) {
    // Fallback para GPT-4 se outro modelo falhar
    if (!model.startsWith('gpt-')) {
      console.warn(`Erro ao usar ${model}, tentando fallback para gpt-4`);
      try {
        return await callOpenAI(messages, systemPrompt, 'gpt-4');
      } catch (fallbackError) {
        throw new Error(`Erro ao usar modelo ${model} e fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'}`);
      }
    }
    throw error;
  }
}

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verificar sessão
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse do body
    const body = await req.json();
    const { chatId, message, assistantType, llmModel } = body;

    if (!chatId || !message || !assistantType || !llmModel) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: chatId, message, assistantType, llmModel' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Buscar histórico de mensagens do chat
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw new Error(`Erro ao buscar mensagens: ${messagesError.message}`);
    }

    // Adicionar mensagem do usuário
    const userMessage: ChatMessage = { role: 'user', content: message };
    const allMessages: ChatMessage[] = [
      ...(messages || []).map((m: any) => ({ role: m.role, content: m.content })),
      userMessage
    ];

    // Obter system prompt
    const systemPrompt = ASSISTANT_PROMPTS[assistantType] || ASSISTANT_PROMPTS['chat-general'];

    // Buscar contexto RAG (futuro - por enquanto vazio)
    // TODO: Implementar busca RAG quando necessário

    // Chamar LLM
    const llmResponse = await getChatCompletion(allMessages, systemPrompt, llmModel);

    // Salvar mensagens no banco
    const { error: insertUserError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        role: 'user',
        content: message
      });

    if (insertUserError) {
      console.error('Erro ao salvar mensagem do usuário:', insertUserError);
    }

    const { error: insertAssistantError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        role: 'assistant',
        content: llmResponse.content,
        metadata: llmResponse.metadata
      });

    if (insertAssistantError) {
      console.error('Erro ao salvar mensagem do assistente:', insertAssistantError);
    }

    return new Response(
      JSON.stringify({
        content: llmResponse.content,
        metadata: llmResponse.metadata
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
