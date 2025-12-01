import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Star,
  Clock,
  Trash2,
  MessageSquare,
  MoreVertical,
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
  const [activeSection, setActiveSection] = useState<"favorites" | "recent">("recent");
  const {
    favoriteChats,
    recentChats,
    deleteChat,
    toggleFavorite,
  } = useChatHistory(assistantType);

  const handleNewChat = () => {
    onNewChat();
  };

  const handleChatClick = (chat: Chat) => {
    onChatSelect(chat);
  };

  const handleDelete = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  const handleToggleFavorite = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    toggleFavorite(chatId);
  };

  const displayChats = activeSection === "favorites" ? favoriteChats : recentChats;
  const hasChats = displayChats.length > 0;

  return (
    <div className="h-full w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">
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
          {!hasChats ? (
            <div className="px-4 py-8 text-center text-sm text-sidebar-foreground/50">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>
                {activeSection === "favorites"
                  ? "Nenhuma conversa favoritada ainda"
                  : "Nenhuma conversa recente"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {displayChats.map((chat) => (
                <div key={chat.id} className="group/item">
                  <Button
                    onClick={() => handleChatClick(chat)}
                    variant={currentChatId === chat.id ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2 h-auto py-2 px-3 group/button"
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="truncate flex-1 text-left text-sm">
                      {chat.title}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0"
                        onClick={(e) => handleToggleFavorite(e, chat.id)}
                      >
                        <Star
                          className={cn(
                            "w-3.5 h-3.5",
                            chat.isFavorite && "fill-current"
                          )}
                        />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="right">
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
                            onClick={(e) => handleDelete(e, chat.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir conversa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Button>
                  <div className="px-3 pb-1 text-xs text-sidebar-foreground/50">
                    {formatDistanceToNow(new Date(chat.updatedAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
