import { cn } from "@/lib/utils";
import { buildColorFromName, getMemberInitials } from "../utils";
import type { LegalKanbanUser } from "../types";

interface MemberAvatarProps {
  user: Pick<LegalKanbanUser, "name"> & Partial<Pick<LegalKanbanUser, "avatarUrl" | "role" | "email" | "id" | "status">>;
  className?: string;
}

/**
 * Avatar de membro: exibe a foto de perfil do usuário quando disponível e,
 * como fallback, as iniciais do nome sobre uma cor derivada do próprio nome.
 */
export function MemberAvatar({ user, className }: MemberAvatarProps) {
  const initials = getMemberInitials(user as LegalKanbanUser);

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-black/5 shadow-sm", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-1 ring-black/5 shadow-sm",
        className,
      )}
      style={{ backgroundColor: buildColorFromName(user.name) }}
    >
      {initials}
    </span>
  );
}
