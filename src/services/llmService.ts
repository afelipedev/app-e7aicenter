import type { LLMModel, MessageRole } from './chatService';

export interface LLMMessage {
  role: MessageRole;
  content: string;
}

export interface LLMResponse {
  content: string;
  metadata?: {
    model?: string;
    tokens_used?: number;
    finish_reason?: string;
    [key: string]: any;
  };
}

export interface LLMError {
  message: string;
  code?: string;
  retryable?: boolean;
}

/**
 * Serviço para integração com diferentes modelos de LLM
 * Este serviço pode ser usado tanto no frontend quanto na Edge Function
 */
export class LLMService {
  /**
   * Chama a API da OpenAI (ChatGPT)
   */
  static async callOpenAI(
    messages: LLMMessage[],
    systemPrompt: string,
    model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-5.2' = 'gpt-4',
    apiKey?: string
  ): Promise<LLMResponse> {
    const key = apiKey || import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!key) {
      throw new Error('OpenAI API key não configurada');
    }

    try {
      // Formatar mensagens incluindo system prompt
      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }))
      ];

      const openaiModel =
        model === 'gpt-4-turbo'
          ? 'gpt-4-turbo-preview'
          : model === 'gpt-5.2'
            ? 'gpt-5.2'
            : 'gpt-4';

      const requestBody: Record<string, unknown> = {
        model: openaiModel,
        messages: formattedMessages,
      };

      // Parâmetro correto por modelo (OpenAI)
      // - gpt-5.2: max_completion_tokens (não aceita max_tokens)
      // - modelos anteriores: max_tokens
      if (openaiModel === 'gpt-5.2') {
        requestBody.max_completion_tokens = 2000;
      } else {
        requestBody.max_tokens = 2000;
      }

      // Obs: gpt-5.2 não deve usar temperatura
      if (openaiModel !== 'gpt-5.2') {
        requestBody.temperature = 0.7;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(requestBody)
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
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro desconhecido ao chamar OpenAI API');
    }
  }

  /**
   * Chama a API do Google Gemini
   */
  static async callGemini(
    messages: LLMMessage[],
    systemPrompt: string,
    model: 'gemini-2.5-flash' = 'gemini-2.5-flash',
    apiKey?: string
  ): Promise<LLMResponse> {
    const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!key) {
      throw new Error('Gemini API key não configurada');
    }

    try {
      // Gemini usa formato diferente - combinar system prompt com primeira mensagem
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

      // Se não houver mensagens, adicionar system prompt como primeira mensagem
      if (formattedMessages.length === 0) {
        formattedMessages.push({
          role: 'user',
          parts: [{ text: systemPrompt }]
        });
      }

      const modelName = model === 'gemini-2.5-flash' ? 'gemini-2.0-flash-exp' : 'gemini-pro';
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
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
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro desconhecido ao chamar Gemini API');
    }
  }

  /**
   * Chama a API da Anthropic (Claude)
   */
  static async callClaude(
    messages: LLMMessage[],
    systemPrompt: string,
    model: 'claude-sonnet-4.5' = 'claude-sonnet-4.5',
    apiKey?: string
  ): Promise<LLMResponse> {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY;
    
    if (!key) {
      throw new Error('Anthropic API key não configurada');
    }

    try {
      // Formatar mensagens para formato da Anthropic
      const formattedMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      const modelName = model === 'claude-sonnet-4.5' ? 'claude-3-5-sonnet-20241022' : 'claude-3-opus-20240229';
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
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
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro desconhecido ao chamar Anthropic API');
    }
  }

  /**
   * Chama o modelo de LLM apropriado baseado no parâmetro
   */
  static async getChatCompletion(
    messages: LLMMessage[],
    systemPrompt: string,
    model: LLMModel,
    apiKeys?: {
      openai?: string;
      gemini?: string;
      anthropic?: string;
    }
  ): Promise<LLMResponse> {
    try {
      if (model.startsWith('gpt-')) {
        return await this.callOpenAI(
          messages,
          systemPrompt,
          model as 'gpt-4' | 'gpt-4-turbo' | 'gpt-5.2',
          apiKeys?.openai
        );
      } else if (model.startsWith('gemini-')) {
        return await this.callGemini(
          messages,
          systemPrompt,
          model as 'gemini-2.5-flash',
          apiKeys?.gemini
        );
      } else if (model.startsWith('claude-')) {
        return await this.callClaude(
          messages,
          systemPrompt,
          model as 'claude-sonnet-4.5',
          apiKeys?.anthropic
        );
      } else {
        throw new Error(`Modelo não suportado: ${model}`);
      }
    } catch (error) {
      // Retry logic com fallback para outro modelo em caso de erro
      if (error instanceof Error && error.message.includes('API key')) {
        throw error; // Não fazer fallback se for erro de API key
      }
      
      // Tentar fallback para GPT-4 se outro modelo falhar
      if (!model.startsWith('gpt-')) {
        console.warn(`Erro ao usar ${model}, tentando fallback para gpt-4`);
        try {
          return await this.callOpenAI(
            messages,
            systemPrompt,
            'gpt-4',
            apiKeys?.openai
          );
        } catch (fallbackError) {
          throw new Error(`Erro ao usar modelo ${model} e fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'}`);
        }
      }
      
      throw error;
    }
  }
}
