import { NavLink } from "react-router-dom";
import { MessageSquare, Pin, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PostWithAuthor } from "../../types";

interface PostListProps {
  posts: PostWithAuthor[];
  teamSlug: string;
  channelSlug: string;
}

function initials(name?: string) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function PostList({ posts, teamSlug, channelSlug }: PostListProps) {
  if (!posts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <MessageSquare className="mb-3 h-10 w-10 opacity-50" />
        <p className="text-sm">Nenhuma postagem ainda neste canal.</p>
        <p className="text-xs mt-1">Crie a primeira postagem para iniciar a discussão.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((p) => (
        <NavLink key={p.id} to={`/teams/${teamSlug}/${channelSlug}/${p.id}`}>
          <Card className={cn(
            "p-4 transition-colors hover:bg-accent/40",
            p.is_pinned && "border-primary/40",
          )}>
            <div className="flex items-start gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials(p.author?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {p.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                  <span className="font-medium truncate">{p.title}</span>
                  {p.is_announcement && <Badge variant="secondary">Aviso</Badge>}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{p.author?.name ?? "Usuário"}</span>
                  <span>·</span>
                  <span>{formatDate(p.last_activity_at ?? p.created_at)}</span>
                </div>
                {p.description_text && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.description_text}</p>
                )}
              </div>
              {p.is_favorited && <Star className="h-4 w-4 text-yellow-500" />}
            </div>
          </Card>
        </NavLink>
      ))}
    </div>
  );
}
