import { useState } from "react";
import { useParams, NavLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Hash,
  Loader2,
  Lock,
  MessagesSquare,
  Plus,
  Settings2,
  Trash2,
  Users,
} from "lucide-react";
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
import { formatTeamMemberRole, formatVisibility } from "../../utils/labels";
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
      toast.success("Permissão atualizada");
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
    <div className="w-full max-w-7xl mx-auto min-w-0">
      <NavLink
        to="/admin/teams"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="mr-1 h-4 w-4 shrink-0" /> Voltar
      </NavLink>

      <div className="mb-6 min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2 min-w-0">
          <Settings2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          <span className="truncate">{team?.name ?? "—"}</span>
        </h1>
        {team?.description && (
          <p className="text-sm text-muted-foreground mt-1 break-words">{team.description}</p>
        )}
        {team?.visibility && (
          <p className="text-xs text-muted-foreground mt-2">
            Visibilidade da equipe: {formatVisibility(team.visibility)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-4 sm:p-5 min-w-0">
          <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary shrink-0" aria-hidden />
            Membros
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
            <Select value={addUserId} onValueChange={setAddUserId}>
              <SelectTrigger className="w-full sm:flex-1 min-w-0">
                <SelectValue placeholder="Selecionar usuário" />
              </SelectTrigger>
              <SelectContent>
                {(availableUsers as { id: string; name: string; email: string }[]).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={addRole} onValueChange={(v) => setAddRole(v as TeamMemberRole)}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">{formatTeamMemberRole("owner")}</SelectItem>
                <SelectItem value="admin">{formatTeamMemberRole("admin")}</SelectItem>
                <SelectItem value="member">{formatTeamMemberRole("member")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => addMember.mutate()}
              disabled={!addUserId || addMember.isPending}
              className="w-full sm:w-auto shrink-0"
            >
              {addMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-2 border rounded-md p-3 sm:flex-row sm:items-center"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.user?.name ?? m.user_id}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.user?.email}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={m.role}
                    onValueChange={(v) => changeRole.mutate({ user_id: m.user_id, role: v as TeamMemberRole })}
                  >
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">{formatTeamMemberRole("owner")}</SelectItem>
                      <SelectItem value="admin">{formatTeamMemberRole("admin")}</SelectItem>
                      <SelectItem value="member">{formatTeamMemberRole("member")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeMember.mutate(m.user_id)}
                    aria-label="Remover membro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 sm:p-5 min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <MessagesSquare className="h-5 w-5 text-primary shrink-0" aria-hidden />
              Canais
            </h2>
            <Button size="sm" onClick={() => setChOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-1 h-4 w-4" /> Novo canal
            </Button>
          </div>
          <div className="space-y-2">
            {channels.map((c) => (
              <div key={c.id} className="border rounded-md p-3">
                <div className="flex items-center gap-1.5 text-sm font-medium min-w-0">
                  {c.visibility === "private" ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  ) : (
                    <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="truncate">
                    {c.name}
                    {c.is_general && (
                      <span className="text-xs text-muted-foreground font-normal"> (padrão)</span>
                    )}
                  </span>
                </div>
                {c.topic && (
                  <p className="text-xs text-muted-foreground mt-1 break-words">
                    <span className="font-medium text-foreground/80">Descrição:</span> {c.topic}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Visibilidade: {formatVisibility(c.visibility)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={chOpen} onOpenChange={setChOpen}>
        <DialogContent className="sm:max-w-md">
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
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <Button variant="ghost" onClick={() => setChOpen(false)} disabled={createChannel.isPending} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              onClick={() => createChannel.mutate()}
              disabled={createChannel.isPending || !chName.trim()}
              className="w-full sm:w-auto"
            >
              {createChannel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar canal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
