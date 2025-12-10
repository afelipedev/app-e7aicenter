import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Star,
  Clock,
  Trash2,
  MessageSquare,
  MoreVertical,
  Edit2,
  Check,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useChatHistory, Chat } from "@/hooks/useChatHistory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatSidebarProps {
  assistantType: string;
  currentChatId: string | null;
  onChatSelect: (chat: Chat) => void;
  onNewChat: () => void;
}

export function ChatSidebar({
  assistantType,
  currentChatId,
  onChatSelect,
  onNewChat,
}: ChatSidebarProps) {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<"favorites" | "recent">("recent");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const {
    favoriteChats,
    recentChats,
    deleteChat,
    toggleFavorite,
    updateChat,
    loading,
    error,
  } = useChatHistory(assistantType);

  const handleNewChat = () => {
    onNewChat();
  };

  const handleChatClick = (chat: Chat) => {
    onChatSelect(chat);
  };

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    try {
      await deleteChat(chatId);
    } catch (error) {
      console.error("Erro ao deletar chat:", error);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    try {
      await toggleFavorite(chatId);
    } catch (error) {
      console.error("Erro ao alternar favorito:", error);
    }
  };

  const handleStartRename = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleCancelRename = () => {
    setEditingChatId(null);
    setEditTitle("");
  };

  const handleSaveRename = async (chatId: string) => {
    const trimmedTitle = editTitle.trim();
    
    if (!trimmedTitle) {
      toast.error("O título não pode estar vazio");
      return;
    }

    if (trimmedTitle.length > 255) {
      toast.error("O título não pode ter mais de 255 caracteres");
      return;
    }

    try {
      await updateChat(chatId, { title: trimmedTitle });
      setEditingChatId(null);
      setEditTitle("");
      toast.success("Chat renomeado com sucesso");
    } catch (error) {
      console.error("Erro ao renomear chat:", error);
      toast.error("Erro ao renomear chat");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveRename(chatId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelRename();
    }
  };

  const displayChats = activeSection === "favorites" ? favoriteChats : recentChats;
  const hasChats = displayChats.length > 0;

  return (
    <div className={cn(
      "h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col",
      isMobile ? "w-full" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2"
          variant="default"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Chat</span>
        </Button>
      </div>

      {/* Navigation */}
      <div className="p-2 border-b border-sidebar-border">
        <div className="space-y-1">
          <Button
            onClick={() => setActiveSection("favorites")}
            variant={activeSection === "favorites" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
          >
            <Star className={cn(
              "w-4 h-4",
              activeSection === "favorites" && "fill-current"
            )} />
            <span>Favoritos</span>
            {favoriteChats.length > 0 && (
              <span className="ml-auto text-xs text-sidebar-foreground/50">
                {favoriteChats.length}
              </span>
            )}
          </Button>
          <Button
            onClick={() => setActiveSection("recent")}
            variant={activeSection === "recent" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>Recentes</span>
            {recentChats.length > 0 && (
              <span className="ml-auto text-xs text-sidebar-foreground/50">
                {recentChats.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2 text-xs font-semibold text-sidebar-foreground/70 border-b border-sidebar-border">
          {activeSection === "favorites" ? "Conversas Favoritas" : "Histórico Recente"}
        </div>
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-sidebar-foreground/50">
              <p>Carregando...</p>
            </div>
          ) : error ? (
            <div className="px-4 py-8 text-center text-sm text-sidebar-foreground/50">
              <p>Erro ao carregar chats</p>
            </div>
          ) : !hasChats ? (
            <div className="px-4 py-8 text-center text-sm text-sidebar-foreground/50">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>
                {activeSection === "favorites"
                  ? "Nenhuma conversa favoritada ainda"
                  : "Nenhuma conversa recente"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1 overflow-visible">
              {displayChats.map((chat) => (
                <div key={chat.id} className="group/item overflow-visible">
                  {editingChatId === chat.id ? (
                    <div className="px-3 py-2 flex items-center gap-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, chat.id)}
                        className="h-8 text-sm flex-1"
                        autoFocus
                        maxLength={255}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0"
                        onClick={() => handleSaveRename(chat.id)}
                      >
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0"
                        onClick={handleCancelRename}
                      >
                        <X className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative group/item min-w-0">
                        <div 
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md transition-colors min-w-0",
                            currentChatId === chat.id 
                              ? "bg-sidebar-accent" 
                              : "hover:bg-sidebar-accent/50"
                          )}
                          onClick={() => handleChatClick(chat)}
                        >
                          <MessageSquare className="w-4 h-4 shrink-0 flex-shrink-0" />
                          <span 
                            className="text-left text-sm flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                            title={chat.title}
                          >
                            {chat.title.length > 20 ? `${chat.title.substring(0, 20)}...` : chat.title}
                          </span>
                          <div className="flex items-center shrink-0 flex-shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 p-0 shrink-0 flex-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" side={isMobile ? "bottom" : "right"}>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleFavorite(e, chat.id);
                                  }}
                                >
                                  <Star
                                    className={cn(
                                      "w-4 h-4 mr-2",
                                      chat.isFavorite && "fill-current"
                                    )}
                                  />
                                  {chat.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => handleStartRename(e, chat)}
                                >
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Renomear conversa
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => handleDelete(e, chat.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir conversa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                      <div className="px-3 pb-1 text-xs text-sidebar-foreground/50">
                        {formatDistanceToNow(new Date(chat.updatedAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
