import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, Hash, Lock, Star, UsersRound } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useTeamsTree } from "../../hooks/useTeamsTree";

export function TeamsSecondarySidebar() {
  const { data, isLoading } = useTeamsTree();
  const location = useLocation();

  return (
    <aside className="hidden md:flex w-64 flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-ai-cyan" />
          <h2 className="text-sm font-semibold">Equipes</h2>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        <NavLink
          to="/teams"
          end
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-foreground",
              isActive ? "bg-sidebar-accent text-foreground" : "text-muted-foreground",
            )
          }
        >
          <UsersRound className="h-4 w-4" />
          <span>Todas as equipes</span>
        </NavLink>

        <NavLink
          to="/teams/favorites"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-foreground",
              isActive ? "bg-sidebar-accent text-foreground" : "text-muted-foreground",
            )
          }
        >
          <Star className="h-4 w-4" />
          <span>Favoritos</span>
        </NavLink>

        <div className="pt-3 pb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Equipes
        </div>

        {isLoading ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Carregando equipes…</div>
        ) : !data?.length ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma equipe ainda</div>
        ) : (
          data.map((team) => {
            const teamActive = location.pathname.startsWith(`/teams/${team.slug}`);
            return (
              <Collapsible
                key={team.id}
                defaultOpen={teamActive}
                className="group/teamcollapsible"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent",
                      teamActive ? "bg-sidebar-accent text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <UsersRound className="h-4 w-4" />
                    <span className="truncate flex-1 text-left">{team.name}</span>
                    <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/teamcollapsible:rotate-180" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border/70 pl-2">
                    {team.channels.length === 0 ? (
                      <div className="px-2 py-1 text-xs text-muted-foreground">Sem canais</div>
                    ) : (
                      team.channels.map((ch) => (
                        <NavLink
                          key={ch.id}
                          to={`/teams/${team.slug}/${ch.slug}`}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-sidebar-accent hover:text-foreground",
                              isActive
                                ? "bg-sidebar-accent text-foreground"
                                : "text-muted-foreground",
                            )
                          }
                        >
                          {ch.visibility === "private" ? (
                            <Lock className="h-3 w-3" />
                          ) : (
                            <Hash className="h-3 w-3" />
                          )}
                          <span className="truncate">{ch.name}</span>
                        </NavLink>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </nav>
    </aside>
  );
}
