import { useState, useEffect, useCallback } from "react";
import { ChatService, type AssistantType, type LLMModel } from "../services/chatService";
import type { Chat as SupabaseChat, ChatMessage as SupabaseChatMessage } from "../services/chatService";
import { supabase } from "../lib/supabase";

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  assistantType: string;
  llmModel?: LLMModel;
}

/**
 * Hook para gerenciar histórico de chats usando Supabase
 * Mantém compatibilidade com a interface anterior baseada em localStorage
 */
export function useChatHistory(assistantType: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para deduplicar mensagens baseada em role, content e timestamp
  const deduplicateMessages = useCallback((messages: ChatMessage[]): ChatMessage[] => {
    const seenById = new Set<string>();
    const seenByContent = new Map<string, ChatMessage>(); // Map para rastrear mensagens por conteúdo
    const unique: ChatMessage[] = [];
    
    // Ordenar por timestamp se disponível
    const sortedMessages = [...messages].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return a.createdAt - b.createdAt;
      }
      return 0;
    });
    
    for (const msg of sortedMessages) {
      const contentKey = `${msg.role}-${msg.content}`;
      
      // Verificar se já existe uma mensagem com o mesmo conteúdo
      const existingByContent = seenByContent.get(contentKey);
      
      if (existingByContent) {
        // Se já existe uma mensagem com o mesmo conteúdo
        if (msg.id) {
          // Se esta mensagem tem ID e a anterior não tinha, ou se ambas têm ID, preferir a mais recente
          const existingHasId = existingByContent.id !== undefined;
          
          if (!existingHasId || (msg.createdAt && existingByContent.createdAt && msg.createdAt > existingByContent.createdAt)) {
            // Remover a anterior e adicionar esta (que tem ID ou é mais recente)
            const index = unique.findIndex(m => m === existingByContent);
            if (index !== -1) {
              unique.splice(index, 1);
            }
            seenByContent.set(contentKey, msg);
            if (msg.id) {
              seenById.add(`id-${msg.id}`);
            }
            unique.push(msg);
          }
          // Se a anterior é mais recente ou tem ID e esta não, ignorar esta
        }
        // Se nenhuma tem ID ou ambas não têm ID, já temos uma, ignorar esta
      } else {
        // Não existe mensagem com esse conteúdo ainda, adicionar
        if (msg.id) {
          const idKey = `id-${msg.id}`;
          if (!seenById.has(idKey)) {
            seenById.add(idKey);
            seenByContent.set(contentKey, msg);
            unique.push(msg);
          }
        } else {
          seenByContent.set(contentKey, msg);
          unique.push(msg);
        }
      }
    }
    
    // Reordenar por timestamp após deduplicação
    return unique.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return a.createdAt - b.createdAt;
      }
      return 0;
    });
  }, []);

  // Converter Chat do Supabase para formato do hook
  const convertSupabaseChat = useCallback(async (supabaseChat: SupabaseChat): Promise<Chat> => {
    // Buscar mensagens do chat
    const messages = await ChatService.getChatMessages(supabaseChat.id);
    
    // Converter e deduplicar mensagens
    const convertedMessages = messages.map(msg => ({
      id: msg.id,
      role: msg.role === 'system' ? 'assistant' : msg.role,
      content: msg.content,
      createdAt: new Date(msg.created_at).getTime()
    })) as ChatMessage[];
    
    const uniqueMessages = deduplicateMessages(convertedMessages);
    
    return {
      id: supabaseChat.id,
      title: supabaseChat.title,
      messages: uniqueMessages,
      createdAt: new Date(supabaseChat.created_at).getTime(),
      updatedAt: new Date(supabaseChat.updated_at).getTime(),
      isFavorite: supabaseChat.is_favorite,
      assistantType: supabaseChat.assistant_type,
      llmModel: supabaseChat.llm_model
    };
  }, [deduplicateMessages]);

  // Carregar chats do Supabase
  useEffect(() => {
    let mounted = true;

    const loadChats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const supabaseChats = await ChatService.getChats(assistantType as AssistantType);
        
        if (!mounted) return;

        // Converter todos os chats
        const convertedChats = await Promise.all(
          supabaseChats.map(chat => convertSupabaseChat(chat))
        );

        setChats(convertedChats);
      } catch (err) {
        if (!mounted) return;
        console.error("Erro ao carregar histórico de chats:", err);
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadChats();

    return () => {
      mounted = false;
    };
  }, [assistantType, convertSupabaseChat]);

  // Configurar subscriptions em tempo real
  useEffect(() => {
    // Subscription para mudanças em chats
    const chatsChannel = supabase
      .channel(`chats:${assistantType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `assistant_type=eq.${assistantType}`,
        },
        async (payload) => {
          console.log('Mudança em chat detectada:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Adicionar novo chat se não existir
            try {
              const newSupabaseChat = await ChatService.getChatById(payload.new.id);
              if (newSupabaseChat) {
                const newChat = await convertSupabaseChat(newSupabaseChat);
                setChats(prev => {
                  // Verificar se já existe
                  const exists = prev.some(chat => chat.id === newChat.id);
                  if (exists) {
                    // Se já existe, atualizar e mover para o início
                    return [newChat, ...prev.filter(chat => chat.id !== newChat.id)];
                  }
                  // Se não existe, adicionar no início
                  return [newChat, ...prev];
                });
              }
            } catch (err) {
              console.error('Erro ao adicionar chat após INSERT:', err);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Atualizar chat existente
            try {
              const updatedSupabaseChat = await ChatService.getChatById(payload.new.id);
              if (updatedSupabaseChat) {
                const updatedChat = await convertSupabaseChat(updatedSupabaseChat);
                setChats(prev => prev.map(chat => 
                  chat.id === updatedChat.id ? updatedChat : chat
                ));
              }
            } catch (err) {
              console.error('Erro ao atualizar chat após UPDATE:', err);
            }
          } else if (payload.eventType === 'DELETE') {
            // Remover chat deletado
            setChats(prev => prev.filter(chat => chat.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscription para mudanças em mensagens
    const messagesChannel = supabase
      .channel(`chat_messages:${assistantType}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: currentChatId ? `chat_id=eq.${currentChatId}` : undefined,
        },
        async (payload) => {
          console.log('Nova mensagem detectada:', payload);
          
          // Se a mensagem pertence ao chat atual, recarregar o chat
          if (currentChatId && payload.new.chat_id === currentChatId) {
            try {
              // Pequeno delay para garantir que a mensagem foi salva no banco
              await new Promise(resolve => setTimeout(resolve, 100));
              
              const updatedSupabaseChat = await ChatService.getChatById(currentChatId);
              if (updatedSupabaseChat) {
                const updatedChat = await convertSupabaseChat(updatedSupabaseChat);
                setChats(prev => prev.map(chat => 
                  chat.id === currentChatId ? updatedChat : chat
                ));
              }
            } catch (err) {
              console.error('Erro ao recarregar chat após nova mensagem:', err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      chatsChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, [assistantType, currentChatId, convertSupabaseChat]);

  // Criar novo chat
  const createNewChat = useCallback(async (llmModel: LLMModel = 'gpt-4') => {
    try {
      const supabaseChat = await ChatService.createChat({
        assistant_type: assistantType as AssistantType,
        title: "Nova conversa",
        llm_model: llmModel
      });

      const newChat = await convertSupabaseChat(supabaseChat);
      
      // Adicionar o novo chat ao início da lista e garantir que está sincronizado
      setChats(prev => {
        // Verificar se o chat já existe (pode ter sido adicionado pelo Realtime)
        const exists = prev.some(chat => chat.id === newChat.id);
        if (exists) {
          // Se já existe, atualizar e mover para o início
          return [newChat, ...prev.filter(chat => chat.id !== newChat.id)];
        }
        // Se não existe, adicionar no início
        return [newChat, ...prev];
      });
      setCurrentChatId(newChat.id);
      
      return newChat;
    } catch (err) {
      console.error("Erro ao criar chat:", err);
      throw err;
    }
  }, [assistantType, convertSupabaseChat]);

  // Atualizar chat
  const updateChat = useCallback(
    async (chatId: string, updates: Partial<Chat>) => {
      try {
        const updateData: any = {};
        
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.isFavorite !== undefined) updateData.is_favorite = updates.isFavorite;
        if (updates.llmModel !== undefined) updateData.llm_model = updates.llmModel;

        await ChatService.updateChat(chatId, updateData);
        
        // Recarregar o chat atualizado
        const updatedSupabaseChat = await ChatService.getChatById(chatId);
        if (updatedSupabaseChat) {
          const updatedChat = await convertSupabaseChat(updatedSupabaseChat);
          setChats(prev => prev.map(chat => chat.id === chatId ? updatedChat : chat));
        }
      } catch (err) {
        console.error("Erro ao atualizar chat:", err);
        throw err;
      }
    },
    [convertSupabaseChat]
  );

  // Adicionar mensagem ao chat
  const addMessage = useCallback(
    async (chatId: string, message: ChatMessage) => {
      try {
        await ChatService.addMessage(
          chatId,
          message.role,
          message.content
        );

        // Recarregar o chat atualizado
        const updatedSupabaseChat = await ChatService.getChatById(chatId);
        if (updatedSupabaseChat) {
          const updatedChat = await convertSupabaseChat(updatedSupabaseChat);
          setChats(prev => prev.map(chat => chat.id === chatId ? updatedChat : chat));
        }
      } catch (err) {
        console.error("Erro ao adicionar mensagem:", err);
        throw err;
      }
    },
    [convertSupabaseChat]
  );

  // Deletar chat
  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        await ChatService.deleteChat(chatId);
        setChats(prev => prev.filter(chat => chat.id !== chatId));

        if (currentChatId === chatId) {
          setCurrentChatId(null);
        }
      } catch (err) {
        console.error("Erro ao deletar chat:", err);
        throw err;
      }
    },
    [currentChatId]
  );

  // Alternar favorito
  const toggleFavorite = useCallback(
    async (chatId: string) => {
      try {
        await ChatService.toggleFavorite(chatId);
        
        // Recarregar o chat atualizado
        const updatedSupabaseChat = await ChatService.getChatById(chatId);
        if (updatedSupabaseChat) {
          const updatedChat = await convertSupabaseChat(updatedSupabaseChat);
          setChats(prev => prev.map(chat => chat.id === chatId ? updatedChat : chat));
        }
      } catch (err) {
        console.error("Erro ao alternar favorito:", err);
        throw err;
      }
    },
    [convertSupabaseChat]
  );

  // Carregar chat
  const loadChat = useCallback(
    async (chatId: string) => {
      try {
        const supabaseChat = await ChatService.getChatById(chatId);
        if (supabaseChat) {
          const chat = await convertSupabaseChat(supabaseChat);
          setCurrentChatId(chatId);
          return chat;
        }
        return null;
      } catch (err) {
        console.error("Erro ao carregar chat:", err);
        return null;
      }
    },
    [convertSupabaseChat]
  );

  // Obter chats favoritos
  const favoriteChats = chats.filter((chat) => chat.isFavorite);

  // Obter chats recentes (ordenados por updatedAt)
  const recentChats = [...chats]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 20); // Limitar a 20 mais recentes

  // Obter chat atual
  const currentChat = chats.find((chat) => chat.id === currentChatId);

  return {
    chats,
    currentChat,
    currentChatId,
    favoriteChats,
    recentChats,
    loading,
    error,
    createNewChat,
    updateChat,
    addMessage,
    deleteChat,
    toggleFavorite,
    loadChat,
    setCurrentChatId,
  };
}
