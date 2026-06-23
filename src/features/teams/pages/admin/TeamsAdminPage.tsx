import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, Loader2, Lock, Plus, Users as UsersGroupIcon } from "lucide-react";
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
import { formatVisibility } from "../../utils/labels";

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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <UsersGroupIcon className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" aria-hidden />
            Gestão de Equipes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie equipes e gerencie seus membros e canais.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Nova equipe
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !teams.length ? (
        <Card className="p-8 sm:p-10 text-center text-muted-foreground">
          <UsersGroupIcon className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>Nenhuma equipe cadastrada.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => (
            <NavLink key={t.id} to={`/admin/teams/${t.id}`} className="block min-w-0">
              <Card className="p-4 h-full hover:bg-accent/40 transition-colors">
                <h3 className="font-medium truncate">{t.name}</h3>
                {t.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</p>
                )}
                <div className="mt-3 text-xs text-muted-foreground">
                  {t.channels.length} {t.channels.length === 1 ? "canal" : "canais"} ·{" "}
                  {formatVisibility(t.visibility)}
                </div>
                {t.channels.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-border pt-3">
                    {t.channels.map((ch) => (
                      <li key={ch.id} className="flex items-center gap-1.5 text-sm min-w-0">
                        {ch.visibility === "private" ? (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        ) : (
                          <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        )}
                        <span className="truncate">{ch.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </NavLink>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
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
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !name.trim()} className="w-full sm:w-auto">
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar equipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
