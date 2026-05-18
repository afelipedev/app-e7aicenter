import { supabase, User } from "@/lib/supabase";
import { EMAIL_EDIT_ROLES, ProfileFormValues } from "../types";

const AVATAR_BUCKET = "user-avatars";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export class ProfileService {
  static canEditEmail(role?: User["role"]): boolean {
    if (!role) return false;
    return EMAIL_EDIT_ROLES.includes(role);
  }

  static async updateProfile(profileId: string, currentRole: User["role"], values: ProfileFormValues): Promise<User> {
    const payload: Record<string, string> = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      updated_at: new Date().toISOString(),
    };

    const desiredEmail = normalizeEmail(values.email);
    const canEditEmail = ProfileService.canEditEmail(currentRole);

    if (canEditEmail) {
      const { data: functionResult, error: functionError } = await supabase.functions.invoke("profile-update-email", {
        body: { newEmail: desiredEmail },
      });

      if (functionError) {
        throw new Error(functionError.message || "Não foi possível atualizar o e-mail");
      }

      if (functionResult?.error) {
        throw new Error(functionResult.error);
      }

      payload.email = desiredEmail;
    }

    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", profileId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Não foi possível atualizar os dados do perfil");
    }

    return data;
  }

  static async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(error.message || "Não foi possível atualizar a senha");
    }
  }

  static async uploadAvatar(authUserId: string, profileId: string, file: File): Promise<User> {
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = `${authUserId}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, file, { upsert: true, contentType: file.type || "image/png" });

    if (uploadError) {
      throw new Error(uploadError.message || "Falha no upload da imagem");
    }

    const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
    const avatarUrl = publicData.publicUrl;

    const { data, error } = await supabase
      .from("users")
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq("id", profileId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Falha ao salvar foto de perfil");
    }

    return data;
  }
}
