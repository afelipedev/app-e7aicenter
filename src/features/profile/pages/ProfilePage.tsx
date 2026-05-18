import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileForm } from "../components/ProfileForm";
import { AvatarUpload } from "../components/AvatarUpload";
import { SecurityForm } from "../components/SecurityForm";
import { useProfileMutations } from "../hooks/useProfileMutations";
import { ProfileService } from "../services/profileService";
import { ProfileFormValues } from "../types";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export default function ProfilePage() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { updateProfileMutation, updatePasswordMutation, uploadAvatarMutation } = useProfileMutations();

  const canEditEmail = ProfileService.canEditEmail(user?.role);

  const profileValues = useMemo<ProfileFormValues>(
    () => ({
      name: user?.name || "",
      phone: user?.phone || "",
      email: user?.email || "",
    }),
    [user?.email, user?.name, user?.phone]
  );

  const handleSaveProfile = async (values: ProfileFormValues) => {
    if (!user) return;

    try {
      await updateProfileMutation.mutateAsync({
        profileId: user.id,
        role: user.role,
        values,
      });

      toast({
        title: "Perfil atualizado",
        description: "Seus dados foram salvos com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar perfil",
        description: error instanceof Error ? error.message : "Erro inesperado ao atualizar perfil.",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePassword = async (password: string) => {
    try {
      await updatePasswordMutation.mutateAsync(password);
      toast({
        title: "Senha atualizada",
        description: "Sua nova senha já está ativa.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar senha",
        description: error instanceof Error ? error.message : "Erro inesperado ao atualizar senha.",
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user || !session?.user) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Use uma imagem JPG, PNG ou WEBP.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadAvatarMutation.mutateAsync({
        profileId: user.id,
        authUserId: session.user.id,
        file,
      });

      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi atualizada.",
      });
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Não foi possível atualizar a foto.",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <main className="container mx-auto max-w-4xl p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">
          Atualize seus dados pessoais, foto de perfil e senha de acesso.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foto de perfil</CardTitle>
          <CardDescription>Essa imagem será exibida nos módulos que usam avatar de usuário.</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            name={user.name}
            avatarUrl={user.avatar_url}
            loading={uploadAvatarMutation.isPending}
            onFileSelected={handleAvatarUpload}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados de cadastro</CardTitle>
          <CardDescription>Nome, telefone e e-mail de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initialValues={profileValues}
            canEditEmail={canEditEmail}
            loading={updateProfileMutation.isPending}
            onSubmit={handleSaveProfile}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>Altere sua senha para manter sua conta protegida.</CardDescription>
        </CardHeader>
        <CardContent>
          <SecurityForm loading={updatePasswordMutation.isPending} onSubmit={handleUpdatePassword} />
        </CardContent>
      </Card>
    </main>
  );
}
