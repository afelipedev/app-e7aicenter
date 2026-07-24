import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { tutorialProgressService } from "../services/tutorialProgressService";
import { tutorialKeys } from "./useTutorials";

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ tutorialId, favorite }: { tutorialId: string; favorite: boolean }) => {
      if (!user?.id) throw new Error("Entre novamente para favoritar.");
      return tutorialProgressService.setFavorite(tutorialId, user.id, favorite);
    },
    onMutate: async ({ tutorialId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: tutorialKeys.favorites });
      const previous = queryClient.getQueryData<string[]>(tutorialKeys.favorites) ?? [];
      queryClient.setQueryData<string[]>(
        tutorialKeys.favorites,
        favorite ? [...previous, tutorialId] : previous.filter((id) => id !== tutorialId)
      );
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      queryClient.setQueryData(tutorialKeys.favorites, context?.previous);
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tutorialKeys.favorites });
    },
  });
};
