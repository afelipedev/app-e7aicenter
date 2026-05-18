import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { teamService } from "../../services/teamService";
import { teamsKeys } from "../../hooks/useTeamsTree";

export default function TeamsAdminPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: teams = [], isLoading } = useQuery({
    queryKey: teamsKeys.tree(),
    queryFn: () => teamService.listMyTeamsTree(),
  });

  const create = useMutation({
    mutationFn: () => teamService.createTeam({ name, description, visibility: "private" }),
    onSuccess: () => {
      toast.success("Equipe criada");
      qc.invalidateQueries({ queryKey: teamsKeys.tree() });
      setOpen(false);
      setName("");
      setDescription("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Gestão de Equipes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie equipes e gerencie seus membros e canais.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova equipe
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : !teams.length ? (
        <Card className="p-10 text-center text-muted-foreground">
          <UsersIcon className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>Nenhuma equipe cadastrada.</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <NavLink key={t.id} to={`/admin/teams/${t.id}`}>
              <Card className="p-4 hover:bg-accent/40 transition-colors">
                <h3 className="font-medium">{t.name}</h3>
                {t.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</p>
                )}
                <div className="mt-3 text-xs text-muted-foreground">
                  {t.channels.length} canais · visibilidade {t.visibility}
                </div>
              </Card>
            </NavLink>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova equipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="team-name">Nome</Label>
              <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="team-desc">Descrição</Label>
              <Textarea id="team-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !name.trim()}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar equipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
