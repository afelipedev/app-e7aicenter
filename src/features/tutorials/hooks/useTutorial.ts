import { useQuery } from "@tanstack/react-query";
import { SIGNED_URL_TTL_SECONDS } from "../constants";
import { tutorialsService } from "../services/tutorialsService";
import { tutorialProgressService } from "../services/tutorialProgressService";
import type { Tutorial } from "../types";
import { tutorialKeys } from "./useTutorials";

export const useTutorial = (slug?: string) =>
  useQuery({
    queryKey: tutorialKeys.detail(slug ?? ""),
    queryFn: () => tutorialsService.getBySlug(slug!),
    enabled: Boolean(slug),
  });

/**
 * URL assinada do vídeo. O cache expira antes da assinatura (2h) para que o
 * refetch aconteça sem o usuário topar com um link vencido.
 */
export const useTutorialVideoUrl = (tutorial?: Tutorial | null) =>
  useQuery({
    queryKey: tutorialKeys.videoUrl(tutorial?.id ?? ""),
    queryFn: () => tutorialsService.getVideoUrl(tutorial!),
    enabled: Boolean(tutorial?.video_path || tutorial?.hls_path),
    staleTime: (SIGNED_URL_TTL_SECONDS - 600) * 1000,
    gcTime: SIGNED_URL_TTL_SECONDS * 1000,
    refetchOnWindowFocus: false,
  });

export const useTutorialProgress = (tutorialId?: string) =>
  useQuery({
    queryKey: [...tutorialKeys.progress, tutorialId],
    queryFn: () => tutorialProgressService.getProgress(tutorialId!),
    enabled: Boolean(tutorialId),
    staleTime: Infinity,
  });

/** Vídeos irmãos (mesmo módulo): relacionados + navegação anterior/próximo. */
export const useRelatedTutorials = (tutorial?: Tutorial | null) =>
  useQuery({
    queryKey: tutorialKeys.siblings(tutorial?.module_key ?? null, tutorial?.category_id ?? null),
    queryFn: () => tutorialsService.listSiblings(tutorial!.module_key, tutorial!.category_id),
    enabled: Boolean(tutorial),
    staleTime: 5 * 60 * 1000,
  });
