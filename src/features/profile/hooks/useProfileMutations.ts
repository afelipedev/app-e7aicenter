import { useMutation } from "@tanstack/react-query";
import { User } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileService } from "../services/profileService";
import { ProfileFormValues } from "../types";

interface UpdateProfileInput {
  profileId: string;
  role: User["role"];
  values: ProfileFormValues;
}

interface UploadAvatarInput {
  profileId: string;
  authUserId: string;
  file: File;
}

export const useProfileMutations = () => {
  const { refreshUserProfile } = useAuth();

  const updateProfileMutation = useMutation({
    mutationFn: ({ profileId, role, values }: UpdateProfileInput) =>
      ProfileService.updateProfile(profileId, role, values),
    onSuccess: async () => {
      await refreshUserProfile();
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (newPassword: string) => ProfileService.updatePassword(newPassword),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: ({ profileId, authUserId, file }: UploadAvatarInput) =>
      ProfileService.uploadAvatar(authUserId, profileId, file),
    onSuccess: async () => {
      await refreshUserProfile();
    },
  });

  return {
    updateProfileMutation,
    updatePasswordMutation,
    uploadAvatarMutation,
  };
};
