import type { ChannelVisibility, TeamMemberRole, TeamVisibility } from "../types";

export function formatVisibility(visibility: TeamVisibility | ChannelVisibility): string {
  return visibility === "public" ? "Pública" : "Privada";
}

export function formatTeamMemberRole(role: TeamMemberRole): string {
  const labels: Record<TeamMemberRole, string> = {
    owner: "Proprietário",
    admin: "Administrador",
    member: "Membro",
  };
  return labels[role] ?? role;
}
