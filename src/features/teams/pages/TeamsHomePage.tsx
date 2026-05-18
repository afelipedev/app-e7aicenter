import { NavLink } from "react-router-dom";
import { Hash, Lock, UsersRound, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTeamsTree } from "../hooks/useTeamsTree";

export default function TeamsHomePage() {
  const { data, isLoading } = useTeamsTree();
  const { hasPermission } = useAuth();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Equipes</h1>
          <p className="text-sm text-muted-foreground mt-1">Espaços colaborativos com canais e postagens.</p>
        </div>
        {hasPermission("admin") && (
          <NavLink to="/admin/teams">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Gestão de Equipes
            </Button>
          </NavLink>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : !data?.length ? (
        <Card className="p-10 text-center text-muted-foreground">
          <UsersRound className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>Você ainda não pertence a nenhuma equipe.</p>
          {hasPermission("admin") && (
            <p className="text-xs mt-2">
              <NavLink to="/admin/teams" className="text-primary hover:underline">
                Crie a primeira equipe →
              </NavLink>
            </p>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((team) => (
            <Card key={team.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                  <UsersRound className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{team.name}</h3>
                  {team.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{team.description}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {team.channels.slice(0, 5).map((ch) => (
                  <NavLink
                    key={ch.id}
                    to={`/teams/${team.slug}/${ch.slug}`}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                  >
                    {ch.visibility === "private" ? <Lock className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
                    <span className="truncate">{ch.name}</span>
                  </NavLink>
                ))}
                {team.channels.length > 5 && (
                  <p className="text-xs text-muted-foreground pl-2">+{team.channels.length - 5} canais</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
