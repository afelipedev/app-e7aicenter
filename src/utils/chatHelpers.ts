import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { LLMModel } from "@/services/chatService";
import type { AssistantType } from "@/services/chatService";

/**
 * Chama a Edge Function de chat-completion
 */
export async function callChatCompletion(
  chatId: string,
  message: string,
  assistantType: AssistantType,
  llmModel: LLMModel
): Promise<{ content: string; metadata?: any }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Usuário não autenticado");
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-completion`;
  
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      chatId,
      message,
      assistantType,
      llmModel,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Handler genérico para enviar mensagem em um chat
 */
export async function handleSendMessage(
  chatId: string,
  message: string,
  assistantType: AssistantType,
  llmModel: LLMModel,
  addMessage: (chatId: string, message: { role: "user" | "assistant"; content: string }) => Promise<void>,
  loadChat: (chatId: string) => Promise<any>
): Promise<void> {
  try {
    // Chamar Edge Function (ela salvará a mensagem do usuário e a resposta do assistente)
    await callChatCompletion(chatId, message, assistantType, llmModel);

    // Recarregar o chat para obter as mensagens atualizadas (incluindo a do usuário e do assistente)
    await loadChat(chatId);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
    
    // Tentar adicionar mensagem de erro apenas em caso de falha
    try {
      await addMessage(chatId, {
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.",
      });
    } catch (err) {
      console.error("Erro ao adicionar mensagem de erro:", err);
    }
    throw error;
  }
}
