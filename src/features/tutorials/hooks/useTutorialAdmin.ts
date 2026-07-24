import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tutorialsService } from "../services/tutorialsService";
import type { AdminTutorialFilters, Tutorial, TutorialInput, TutorialStatus } from "../types";
import { tutorialKeys } from "./useTutorials";

export const useAdminTutorials = (filters: AdminTutorialFilters) =>
  useQuery({
    queryKey: tutorialKeys.admin(filters),
    queryFn: () => tutorialsService.listForAdmin(filters),
    placeholderData: (previous) => previous,
  });

export const useTutorialAuthors = () =>
  useQuery({
    queryKey: tutorialKeys.authors,
    queryFn: () => tutorialsService.listAuthors(),
    staleTime: 10 * 60 * 1000,
  });

/** Invalida tudo que lista tutoriais depois de uma escrita. */
const useInvalidateTutorials = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: tutorialKeys.all });
};

export const useCreateTutorial = () => {
  const invalidate = useInvalidateTutorials();
  return useMutation({
    mutationFn: (input: TutorialInput) => tutorialsService.create(input),
    onSuccess: (tutorial) => {
      invalidate();
      toast.success(
        tutorial.status === "publicado" ? "Tutorial publicado." : "Tutorial salvo como rascunho."
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });
};

export const useUpdateTutorial = () => {
  const invalidate = useInvalidateTutorials();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TutorialInput> }) =>
      tutorialsService.update(id, input),
    onSuccess: () => {
      invalidate();
      toast.success("Alterações salvas.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
};

export const useSetTutorialStatus = () => {
  const invalidate = useInvalidateTutorials();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TutorialStatus }) =>
      tutorialsService.setStatus(id, status),
    onSuccess: (_data, { status }) => {
      invalidate();
      toast.success(status === "publicado" ? "Tutorial publicado." : "Tutorial despublicado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
};

export const useDuplicateTutorial = () => {
  const invalidate = useInvalidateTutorials();
  return useMutation({
    mutationFn: (id: string) => tutorialsService.duplicate(id),
    onSuccess: () => {
      invalidate();
      toast.success("Cópia criada como rascunho.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
};

export const useDeleteTutorial = () => {
  const invalidate = useInvalidateTutorials();
  return useMutation({
    mutationFn: (tutorial: Tutorial) => tutorialsService.remove(tutorial),
    onSuccess: () => {
      invalidate();
      toast.success("Tutorial excluído.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
};
