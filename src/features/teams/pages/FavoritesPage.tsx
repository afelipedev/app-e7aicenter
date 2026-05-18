import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { postService } from "../services/postService";
import { useCurrentProfileId } from "../hooks/useCurrentProfileId";
import { teamsKeys } from "../hooks/useTeamsTree";

export default function FavoritesPage() {
  const { data: profileId } = useCurrentProfileId();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: teamsKeys.favorites(),
    queryFn: () => postService.listFavorites(profileId!),
    enabled: !!profileId,
  });

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-4">
        <NavLink to="/teams" className="text-sm text-muted-foreground hover:text-foreground">← Equipes</NavLink>
        <h1 className="mt-1 text-2xl font-semibold flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" /> Postagens favoritas
        </h1>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : !posts.length ? (
        <Card className="p-10 text-center text-muted-foreground">
          Você ainda não favoritou postagens.
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {p.author?.name ?? "Usuário"} · {new Date(p.created_at).toLocaleString("pt-BR")}
              </div>
              {p.description_text && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{p.description_text}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
