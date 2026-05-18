import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { teamService } from "../../services/teamService";
import { channelService } from "../../services/channelService";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  channelId: string;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function InviteMemberDialog({ open, onOpenChange, teamId, channelId }: InviteMemberDialogProps) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["teams", "invitable-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, avatar_url")
        .eq("status", "ativo")
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as UserRow[];
    },
    enabled: open,
  });

  const { data: channelMemberIds = new Set<string>() } = useQuery({
    queryKey: ["teams", "channel-member-ids", channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_members").select("user_id").eq("channel_id", channelId);
      if (error) throw new Error(error.message);
      return new Set((data ?? []).map((r: { user_id: string }) => r.user_id));
    },
    enabled: open && !!channelId,
  });

  const { data: teamMemberIds = new Set<string>() } = useQuery({
    queryKey: ["teams", "team-member-ids", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members").select("user_id").eq("team_id", teamId);
      if (error) throw new Error(error.message);
      return new Set((data ?? []).map((r: { user_id: string }) => r.user_id));
    },
    enabled: open && !!teamId,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (channelMemberIds.has(u.id)) return false;
      if (!q) return true;
      return (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
    });
  }, [users, query, channelMemberIds]);

  const invite = useMutation({
    mutationFn: async (userId: string) => {
      if (!teamMemberIds.has(userId)) {
        await teamService.addMember({ team_id: teamId, user_id: userId, role: "member" });
      }
      await channelService.addChannelMember({ channel_id: channelId, user_id: userId, role: "member" });
    },
    onSuccess: () => {
      toast.success("Membro convidado");
      qc.invalidateQueries({ queryKey: ["teams", "channel-member-ids", channelId] });
      qc.invalidateQueries({ queryKey: ["teams", "team-member-ids", teamId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar membro
          </DialogTitle>
          <DialogDescription>
            O membro convidado entrará na equipe e neste canal automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[320px] overflow-y-auto -mx-2 px-2">
          {usersLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {query ? "Nenhum usuário encontrado." : "Todos os usuários já são membros."}
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-accent"
                >
                  <Avatar className="h-8 w-8">
                    {u.avatar_url && <AvatarImage src={u.avatar_url} alt={u.name ?? ""} />}
                    <AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.name ?? "Sem nome"}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => invite.mutate(u.id)}
                    disabled={invite.isPending && invite.variables === u.id}
                  >
                    {invite.isPending && invite.variables === u.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : invite.isSuccess && invite.variables === u.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      "Convidar"
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
