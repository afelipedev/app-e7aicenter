import { useState } from "react";
import { useParams, NavLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { teamService } from "../../services/teamService";
import { channelService } from "../../services/channelService";
import { teamsKeys } from "../../hooks/useTeamsTree";
import type { TeamMemberRole } from "../../types";

export default function TeamDetailAdminPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const qc = useQueryClient();

  const { data: team } = useQuery({
    queryKey: ["teams", "team-detail", teamId],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("*").eq("id", teamId!).maybeSingle();
      return data;
    },
    enabled: !!teamId,
  });
  const { data: members = [] } = useQuery({
    queryKey: teamsKeys.members(teamId ?? ""),
    queryFn: () => teamService.listTeamMembers(teamId!),
    enabled: !!teamId,
  });
  const { data: channels = [] } = useQuery({
    queryKey: ["teams", "team-channels", teamId],
    queryFn: () => channelService.listByTeam(teamId!),
    enabled: !!teamId,
  });
  const { data: allUsers = [] } = useQuery({
    queryKey: ["teams", "all-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users").select("id, name, email").eq("status", "ativo").order("name");
      return data ?? [];
    },
  });

  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<TeamMemberRole>("member");
  const [chOpen, setChOpen] = useState(false);
  const [chName, setChName] = useState("");
  const [chTopic, setChTopic] = useState("");
  const [chVisibility, setChVisibility] = useState<"public" | "private">("public");

  const addMember = useMutation({
    mutationFn: () =>
      teamService.addMember({ team_id: teamId!, user_id: addUserId, role: addRole }),
    onSuccess: () => {
      toast.success("Membro adicionado");
      qc.invalidateQueries({ queryKey: teamsKeys.members(teamId!) });
      setAddUserId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      teamService.removeMember({ team_id: teamId!, user_id: userId }),
    onSuccess: () => {
      toast.success("Membro removido");
      qc.invalidateQueries({ queryKey: teamsKeys.members(teamId!) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const changeRole = useMutation({
    mutationFn: ({ user_id, role }: { user_id: string; role: TeamMemberRole }) =>
      teamService.updateMemberRole({ team_id: teamId!, user_id, role }),
    onSuccess: () => {
      toast.success("Role atualizado");
      qc.invalidateQueries({ queryKey: teamsKeys.members(teamId!) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const createChannel = useMutation({
    mutationFn: () =>
      channelService.createChannel({ team_id: teamId!, name: chName, topic: chTopic, visibility: chVisibility }),
    onSuccess: () => {
      toast.success("Canal criado");
      qc.invalidateQueries({ queryKey: ["teams", "team-channels", teamId] });
      qc.invalidateQueries({ queryKey: teamsKeys.tree() });
      setChOpen(false);
      setChName(""); setChTopic("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const memberIds = new Set(members.map((m) => m.user_id));
  const availableUsers = (allUsers as { id: string; name: string; email: string }[]).filter((u) => !memberIds.has(u.id));

  return (
    <div className="w-full max-w-7xl">
      <NavLink to="/admin/teams" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </NavLink>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary" />
          {team?.name ?? "—"}
        </h1>
        {team?.description && <p className="text-sm text-muted-foreground mt-1">{team.description}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-lg font-medium mb-3">Membros</h2>
          <div className="flex gap-2 mb-4">
            <Select value={addUserId} onValueChange={setAddUserId}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
              <SelectContent>
                {(availableUsers as { id: string; name: string; email: string }[]).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={addRole} onValueChange={(v) => setAddRole(v as TeamMemberRole)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => addMember.mutate()} disabled={!addUserId || addMember.isPending}>
              {addMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 border rounded p-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.user?.name ?? m.user_id}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.user?.email}</div>
                </div>
                <Select value={m.role} onValueChange={(v) => changeRole.mutate({ user_id: m.user_id, role: v as TeamMemberRole })}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => removeMember.mutate(m.user_id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Canais</h2>
            <Button size="sm" onClick={() => setChOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Novo canal
            </Button>
          </div>
          <div className="space-y-2">
            {channels.map((c) => (
              <div key={c.id} className="border rounded p-2">
                <div className="text-sm font-medium">{c.name} {c.is_general && <span className="text-xs text-muted-foreground">(padrão)</span>}</div>
                {c.topic && <div className="text-xs text-muted-foreground">{c.topic}</div>}
                <div className="text-xs text-muted-foreground mt-1">Visibilidade: {c.visibility}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={chOpen} onOpenChange={setChOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo canal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ch-name">Nome</Label>
              <Input id="ch-name" value={chName} onChange={(e) => setChName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ch-topic">Tópico</Label>
              <Input id="ch-topic" value={chTopic} onChange={(e) => setChTopic(e.target.value)} />
            </div>
            <div>
              <Label>Visibilidade</Label>
              <Select value={chVisibility} onValueChange={(v) => setChVisibility(v as "public" | "private")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Pública (todos os membros da equipe)</SelectItem>
                  <SelectItem value="private">Privada (membros explícitos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChOpen(false)} disabled={createChannel.isPending}>Cancelar</Button>
            <Button onClick={() => createChannel.mutate()} disabled={createChannel.isPending || !chName.trim()}>
              {createChannel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar canal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
