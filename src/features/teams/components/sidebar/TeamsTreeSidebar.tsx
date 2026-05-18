import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, Hash, Lock, UsersRound } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useTeamsTree } from "../../hooks/useTeamsTree";

export function TeamsTreeSidebar() {
  const { data, isLoading } = useTeamsTree();
  const location = useLocation();

  if (isLoading) {
    return (
      <SidebarMenuSub>
        <SidebarMenuSubItem>
          <div className="px-3 py-2 text-xs text-muted-foreground">Carregando equipes…</div>
        </SidebarMenuSubItem>
      </SidebarMenuSub>
    );
  }

  if (!data?.length) {
    return (
      <SidebarMenuSub>
        <SidebarMenuSubItem>
          <NavLink to="/teams" className="block px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            Nenhuma equipe ainda
          </NavLink>
        </SidebarMenuSubItem>
      </SidebarMenuSub>
    );
  }

  return (
    <SidebarMenuSub>
      {data.map((team) => {
        const teamActive = location.pathname.startsWith(`/teams/${team.slug}`);
        return (
          <Collapsible key={team.id} defaultOpen={teamActive} className="group/teamcollapsible">
            <SidebarMenuSubItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuSubButton className={cn(teamActive && "bg-sidebar-accent")}>
                  <UsersRound className="h-4 w-4" />
                  <span className="truncate">{team.name}</span>
                  <ChevronDown className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/teamcollapsible:rotate-180" />
                </SidebarMenuSubButton>
              </CollapsibleTrigger>
            </SidebarMenuSubItem>
            <CollapsibleContent>
              <div className="ml-6 mt-1 space-y-1 border-l border-sidebar-border/70 pl-3">
                {team.channels.length === 0 ? (
                  <div className="px-2 py-1 text-xs text-muted-foreground">Sem canais</div>
                ) : (
                  team.channels.map((ch) => (
                    <NavLink
                      key={ch.id}
                      to={`/teams/${team.slug}/${ch.slug}`}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                          isActive && "bg-sidebar-accent text-foreground",
                        )
                      }
                    >
                      {ch.visibility === "private" ? <Lock className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
                      <span className="truncate">{ch.name}</span>
                    </NavLink>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </SidebarMenuSub>
  );
}
