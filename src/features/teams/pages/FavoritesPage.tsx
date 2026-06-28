import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Star } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { postService } from "../services/postService";
import { useCurrentProfileId } from "../hooks/useCurrentProfileId";
import { teamsKeys } from "../hooks/useTeamsTree";
import type { PostWithAuthor } from "../types";

function initials(name?: string) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

interface FavoritePost extends PostWithAuthor {
  team?: { slug: string } | null;
  channel?: { slug: string; team_id: string } | null;
}

export default function FavoritesPage() {
  const qc = useQueryClient();
  const { data: profileId } = useCurrentProfileId();

  const { data: posts = [], isLoading } = useQuery<FavoritePost[]>({
    queryKey: teamsKeys.favorites(),
    queryFn: async () => {
      const base = await postService.listFavorites(profileId!);
      if (!base.length) return base;
      const channelIds = Array.from(new Set(base.map((p) => p.channel_id)));
      const { data: channels } = await supabase
        .from("channels")
        .select("id, slug, team_id, team:teams(slug)")
        .in("id", channelIds);
      const byId = new Map(
        (channels ?? []).map((c: { id: string; slug: string; team_id: string; team: { slug: string } | { slug: string }[] | null }) => {
          const team = Array.isArray(c.team) ? c.team[0] : c.team;
          return [c.id, { slug: c.slug, team_id: c.team_id, teamSlug: team?.slug ?? "" }];
        }),
      );
      return base.map((p) => {
        const ch = byId.get(p.channel_id);
        return {
          ...p,
          channel: ch ? { slug: ch.slug, team_id: ch.team_id } : null,
          team: ch ? { slug: ch.teamSlug } : null,
        };
      });
    },
    enabled: !!profileId,
  });

  // Realtime: refletir favoritos do usuário em tempo real
  useEffect(() => {
    if (!profileId) return;
    const channel = supabase
      .channel(`post_favorites:${profileId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_favorites", filter: `user_id=eq.${profileId}` },
        () => qc.invalidateQueries({ queryKey: teamsKeys.favorites() }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profileId, qc]);

  const unfavorite = useMutation({
    mutationFn: async (postId: string) => {
      if (!profileId) throw new Error("Sem perfil");
      return postService.toggleFavorite(postId, profileId);
    },
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: teamsKeys.favorites() });
      const prev = qc.getQueryData<FavoritePost[]>(teamsKeys.favorites());
      qc.setQueryData<FavoritePost[]>(teamsKeys.favorites(), (old) =>
        (old ?? []).filter((p) => p.id !== postId),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(teamsKeys.favorites(), ctx.prev);
      toast.error("Falha ao remover dos favoritos");
    },
    onSuccess: () => {
      toast.success("Removida dos favoritos");
      qc.invalidateQueries({ queryKey: teamsKeys.favorites() });
    },
  });

  return (
    <div className="w-full">
      <div className="mb-4">
        <NavLink to="/teams" className="text-sm text-muted-foreground hover:text-foreground">← Equipes</NavLink>
        <h1 className="mt-1 text-2xl font-semibold flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" /> Postagens favoritas
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
          {posts.map((p) => {
            const canLink = p.team?.slug && p.channel?.slug;
            const href = canLink ? `/teams/${p.team!.slug}/${p.channel!.slug}/${p.id}` : null;
            const Container = ({ children }: { children: React.ReactNode }) =>
              href ? (
                <NavLink to={href} className="block">
                  {children}
                </NavLink>
              ) : (
                <div>{children}</div>
              );

            return (
              <Container key={p.id}>
                <Card className="p-4 transition-colors hover:bg-accent/20">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      {p.author?.avatar_url && (
                        <AvatarImage src={p.author.avatar_url} alt={p.author?.name ?? ""} />
                      )}
                      <AvatarFallback>{initials(p.author?.name)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.author?.name ?? "Usuário"} ·{" "}
                        {new Date(p.created_at).toLocaleString("pt-BR")}
                      </div>
                      {p.description_text && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2 whitespace-pre-wrap">
                          {p.description_text}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Remover dos favoritos"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          unfavorite.mutate(p.id);
                        }}
                        disabled={unfavorite.isPending}
                      >
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      </Button>
                      {href && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </Card>
              </Container>
            );
          })}
        </div>
      )}
    </div>
  );
}
