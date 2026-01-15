import { supabase } from '../lib/supabase';

// Timeout padrão para operações (15 segundos)
const DEFAULT_TIMEOUT = 15000;

// Função utilitária para adicionar timeout a promises
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = DEFAULT_TIMEOUT): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operação expirou. Verifique sua conexão e tente novamente.')), timeoutMs)
    )
  ]);
};

// Tipos
// AssistantType agora aceita tanto os tipos fixos quanto agentIds dos agentes da biblioteca
export type AssistantType = 'chat-general' | 'tax-law' | 'civil-law' | 'financial' | 'accounting' | string;
export type LLMModel =
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-5.2'
  | 'gemini-2.5-flash'
  | 'claude-sonnet-4.5';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  assistant_type: AssistantType;
  title: string;
  llm_model: LLMModel;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChatData {
  assistant_type: AssistantType;
  title?: string;
  llm_model?: LLMModel;
}

export interface UpdateChatData {
  title?: string;
  llm_model?: LLMModel;
  is_favorite?: boolean;
}

/**
 * Serviço para gerenciar chats e mensagens
 */
export class ChatService {
  /**
   * Obtém o user_id do usuário autenticado
   */
  private static async getCurrentUserId(): Promise<string> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Usuário não autenticado');
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .single();

    if (userError || !userData) {
      throw new Error('Erro ao obter perfil do usuário');
    }

    return userData.id;
  }

  /**
   * Cria um novo chat
   */
  static async createChat(data: CreateChatData): Promise<Chat> {
    try {
      const user_id = await this.getCurrentUserId();

      const chatData = {
        user_id,
        assistant_type: data.assistant_type,
        title: data.title || 'Nova conversa',
        llm_model: data.llm_model || 'gpt-4',
        is_favorite: false,
      };

      const queryPromise = supabase
        .from('chats')
        .insert(chatData)
        .select()
        .single();

      const { data: chat, error } = await withTimeout(queryPromise);

      if (error) {
        throw new Error(`Erro ao criar chat: ${error.message}`);
      }

      return chat;
    } catch (error) {
      throw new Error(`Erro ao criar chat: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca todos os chats do usuário para um tipo de assistente
   */
  static async getChats(assistantType: AssistantType): Promise<Chat[]> {
    try {
      const user_id = await this.getCurrentUserId();

      const queryPromise = supabase
        .from('chats')
        .select('*')
        .eq('user_id', user_id)
        .eq('assistant_type', assistantType)
        .order('updated_at', { ascending: false });

      const { data, error } = await withTimeout(queryPromise);

      if (error) {
        throw new Error(`Erro ao buscar chats: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Erro ao buscar chats: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca um chat por ID
   */
  static async getChatById(chatId: string): Promise<Chat | null> {
    try {
      const user_id = await this.getCurrentUserId();

      const queryPromise = supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .eq('user_id', user_id)
        .single();

      const { data, error } = await withTimeout(queryPromise);

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Chat não encontrado
        }
        throw new Error(`Erro ao buscar chat: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Erro ao buscar chat: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Atualiza um chat
   */
  static async updateChat(chatId: string, updates: UpdateChatData): Promise<Chat> {
    try {
      const user_id = await this.getCurrentUserId();

      const queryPromise = supabase
        .from('chats')
        .update(updates)
        .eq('id', chatId)
        .eq('user_id', user_id)
        .select()
        .single();

      const { data, error } = await withTimeout(queryPromise);

      if (error) {
        throw new Error(`Erro ao atualizar chat: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Erro ao atualizar chat: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Deleta um chat
   */
  static async deleteChat(chatId: string): Promise<void> {
    try {
      const user_id = await this.getCurrentUserId();

      const queryPromise = supabase
        .from('chats')
        .delete()
        .eq('id', chatId)
        .eq('user_id', user_id);

      const { error } = await withTimeout(queryPromise);

      if (error) {
        throw new Error(`Erro ao deletar chat: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Erro ao deletar chat: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Alterna o status de favorito de um chat
   */
  static async toggleFavorite(chatId: string): Promise<Chat> {
    try {
      const chat = await this.getChatById(chatId);
      if (!chat) {
        throw new Error('Chat não encontrado');
      }

      return await this.updateChat(chatId, { is_favorite: !chat.is_favorite });
    } catch (error) {
      throw new Error(`Erro ao alternar favorito: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca todas as mensagens de um chat
   */
  static async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      // Verificar se o chat pertence ao usuário
      const chat = await this.getChatById(chatId);
      if (!chat) {
        throw new Error('Chat não encontrado');
      }

      const queryPromise = supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      const { data, error } = await withTimeout(queryPromise);

      if (error) {
        throw new Error(`Erro ao buscar mensagens: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Erro ao buscar mensagens: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Adiciona uma mensagem a um chat
   */
  static async addMessage(
    chatId: string,
    role: MessageRole,
    content: string,
    metadata?: Record<string, any>
  ): Promise<ChatMessage> {
    try {
      // Verificar se o chat pertence ao usuário
      const chat = await this.getChatById(chatId);
      if (!chat) {
        throw new Error('Chat não encontrado');
      }

      const messageData = {
        chat_id: chatId,
        role,
        content,
        metadata: metadata || {},
      };

      const queryPromise = supabase
        .from('chat_messages')
        .insert(messageData)
        .select()
        .single();

      const { data, error } = await withTimeout(queryPromise);

      if (error) {
        throw new Error(`Erro ao adicionar mensagem: ${error.message}`);
      }

      // Atualizar título do chat se for a primeira mensagem do usuário
      if (role === 'user' && chat.title === 'Nova conversa') {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await this.updateChat(chatId, { title });
      }

      return data;
    } catch (error) {
      throw new Error(`Erro ao adicionar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca chats favoritos do usuário para um tipo de assistente
   */
  static async getFavoriteChats(assistantType: AssistantType): Promise<Chat[]> {
    try {
      const user_id = await this.getCurrentUserId();

      const queryPromise = supabase
        .from('chats')
        .select('*')
        .eq('user_id', user_id)
        .eq('assistant_type', assistantType)
        .eq('is_favorite', true)
        .order('updated_at', { ascending: false });

      const { data, error } = await withTimeout(queryPromise);

      if (error) {
        throw new Error(`Erro ao buscar chats favoritos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Erro ao buscar chats favoritos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca chats recentes do usuário para um tipo de assistente
   */
  static async getRecentChats(assistantType: AssistantType, limit: number = 20): Promise<Chat[]> {
    try {
      const user_id = await this.getCurrentUserId();

      const queryPromise = supabase
        .from('chats')
        .select('*')
        .eq('user_id', user_id)
        .eq('assistant_type', assistantType)
        .order('updated_at', { ascending: false })
        .limit(limit);

      const { data, error } = await withTimeout(queryPromise);

      if (error) {
        throw new Error(`Erro ao buscar chats recentes: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Erro ao buscar chats recentes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca o total de chats (todos os usuários)
   * Para uso em dashboard administrativo
   */
  static async getAllChatsCount(): Promise<number> {
    try {
      const queryPromise = supabase
        .from('chats')
        .select('*', { count: 'exact', head: true });

      const { count, error } = await withTimeout(queryPromise);

      if (error) {
        throw new Error(`Erro ao buscar total de chats: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      console.error('Erro ao buscar total de chats:', error);
      return 0;
    }
  }

  /**
   * Calcula a evolução mensal do número de chats criados
   * Retorna o percentual de evolução comparando o mês atual com o mês anterior
   */
  static async getMonthlyEvolution(): Promise<{
    currentMonthCount: number;
    previousMonthCount: number;
    evolutionPercent: number | null;
    evolutionText: string;
  }> {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-11

      // Primeiro dia do mês atual
      const firstDayCurrentMonth = new Date(currentYear, currentMonth, 1);
      // Primeiro dia do próximo mês (fim do mês atual)
      const firstDayNextMonth = new Date(currentYear, currentMonth + 1, 1);

      // Primeiro dia do mês anterior
      const firstDayPreviousMonth = new Date(currentYear, currentMonth - 1, 1);
      // Primeiro dia do mês atual (fim do mês anterior)
      const firstDayCurrentMonthForPrevious = new Date(currentYear, currentMonth, 1);

      // Buscar chats do mês atual
      const currentMonthQuery = supabase
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayCurrentMonth.toISOString())
        .lt('created_at', firstDayNextMonth.toISOString());

      const { count: currentMonthCount, error: currentError } = await withTimeout(
        currentMonthQuery,
        DEFAULT_TIMEOUT
      );

      if (currentError) {
        console.error('Erro ao buscar chats do mês atual:', currentError);
        throw new Error(`Erro ao buscar chats do mês atual: ${currentError.message}`);
      }

      // Buscar chats do mês anterior
      const previousMonthQuery = supabase
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayPreviousMonth.toISOString())
        .lt('created_at', firstDayCurrentMonthForPrevious.toISOString());

      const { count: previousMonthCount, error: previousError } = await withTimeout(
        previousMonthQuery,
        DEFAULT_TIMEOUT
      );

      if (previousError) {
        console.error('Erro ao buscar chats do mês anterior:', previousError);
        throw new Error(`Erro ao buscar chats do mês anterior: ${previousError.message}`);
      }

      const current = currentMonthCount || 0;
      const previous = previousMonthCount || 0;

      // Calcular percentual de evolução
      let evolutionPercent: number | null = null;
      let evolutionText = "—";

      if (previous === 0) {
        // Se não havia chats no mês anterior
        if (current > 0) {
          evolutionText = "Novo";
        } else {
          evolutionText = "—";
        }
      } else {
        // Calcular percentual: ((atual - anterior) / anterior) * 100
        evolutionPercent = ((current - previous) / previous) * 100;
        
        if (evolutionPercent > 0) {
          evolutionText = `+${evolutionPercent.toFixed(0)}%`;
        } else if (evolutionPercent < 0) {
          evolutionText = `${evolutionPercent.toFixed(0)}%`;
        } else {
          evolutionText = "0%";
        }
      }

      return {
        currentMonthCount: current,
        previousMonthCount: previous,
        evolutionPercent,
        evolutionText
      };
    } catch (error) {
      console.error('Erro ao calcular evolução mensal de chats:', error);
      return {
        currentMonthCount: 0,
        previousMonthCount: 0,
        evolutionPercent: null,
        evolutionText: "—"
      };
    }
  }
}
