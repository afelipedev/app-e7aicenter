import { UserRole } from "@/lib/supabase";

export const EMAIL_EDIT_ROLES: UserRole[] = ["administrator", "it", "advogado_adm"];

export interface ProfileFormValues {
  name: string;
  phone: string;
  email: string;
}

export interface PasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}
