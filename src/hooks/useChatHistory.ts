import { useState, useEffect, useCallback } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  assistantType: string;
}

const STORAGE_PREFIX = "e7ai_chat_";

export function useChatHistory(assistantType: string) {
  const storageKey = `${STORAGE_PREFIX}${assistantType}`;
  const favoritesKey = `${STORAGE_PREFIX}favorites_${assistantType}`;

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Carregar chats do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedChats = JSON.parse(stored) as Chat[];
        setChats(parsedChats);
      }

      const storedFavorites = localStorage.getItem(favoritesKey);
      if (storedFavorites) {
        const parsedFavorites = JSON.parse(storedFavorites) as string[];
        setFavorites(new Set(parsedFavorites));
      }
    } catch (error) {
      console.error("Erro ao carregar histórico de chats:", error);
    }
  }, [storageKey, favoritesKey]);

  // Salvar chats no localStorage
  const saveChats = useCallback(
    (updatedChats: Chat[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedChats));
        setChats(updatedChats);
      } catch (error) {
        console.error("Erro ao salvar chats:", error);
      }
    },
    [storageKey]
  );

  // Salvar favoritos no localStorage
  const saveFavorites = useCallback(
    (updatedFavorites: Set<string>) => {
      try {
        localStorage.setItem(favoritesKey, JSON.stringify(Array.from(updatedFavorites)));
        setFavorites(updatedFavorites);
      } catch (error) {
        console.error("Erro ao salvar favoritos:", error);
      }
    },
    [favoritesKey]
  );

  // Criar novo chat
  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: "Nova conversa",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      assistantType,
    };

    const updatedChats = [newChat, ...chats];
    saveChats(updatedChats);
    setCurrentChatId(newChat.id);
    return newChat;
  }, [chats, assistantType, saveChats]);

  // Atualizar chat
  const updateChat = useCallback(
    (chatId: string, updates: Partial<Chat>) => {
      const updatedChats = chats.map((chat) =>
        chat.id === chatId
          ? { ...chat, ...updates, updatedAt: Date.now() }
          : chat
      );
      saveChats(updatedChats);
    },
    [chats, saveChats]
  );

  // Adicionar mensagem ao chat
  const addMessage = useCallback(
    (chatId: string, message: ChatMessage) => {
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return;

      const updatedMessages = [...chat.messages, message];
      const title =
        chat.messages.length === 0 && message.role === "user"
          ? message.content.slice(0, 50) + (message.content.length > 50 ? "..." : "")
          : chat.title;

      updateChat(chatId, {
        messages: updatedMessages,
        title,
      });
    },
    [chats, updateChat]
  );

  // Deletar chat
  const deleteChat = useCallback(
    (chatId: string) => {
      const updatedChats = chats.filter((chat) => chat.id !== chatId);
      saveChats(updatedChats);

      // Remover dos favoritos se estiver
      const updatedFavorites = new Set(favorites);
      updatedFavorites.delete(chatId);
      saveFavorites(updatedFavorites);

      if (currentChatId === chatId) {
        setCurrentChatId(null);
      }
    },
    [chats, favorites, currentChatId, saveChats, saveFavorites]
  );

  // Alternar favorito
  const toggleFavorite = useCallback(
    (chatId: string) => {
      const updatedFavorites = new Set(favorites);
      if (updatedFavorites.has(chatId)) {
        updatedFavorites.delete(chatId);
      } else {
        updatedFavorites.add(chatId);
      }
      saveFavorites(updatedFavorites);
      updateChat(chatId, { isFavorite: updatedFavorites.has(chatId) });
    },
    [favorites, saveFavorites, updateChat]
  );

  // Carregar chat
  const loadChat = useCallback(
    (chatId: string) => {
      const chat = chats.find((c) => c.id === chatId);
      if (chat) {
        setCurrentChatId(chatId);
        return chat;
      }
      return null;
    },
    [chats]
  );

  // Obter chats favoritos
  const favoriteChats = chats.filter((chat) => favorites.has(chat.id));

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
    createNewChat,
    updateChat,
    addMessage,
    deleteChat,
    toggleFavorite,
    loadChat,
    setCurrentChatId,
  };
}
