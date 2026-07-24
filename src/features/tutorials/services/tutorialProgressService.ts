import { supabase } from "@/lib/supabase";
import type { TutorialProgress } from "../types";

/**
 * Progresso, visualizações e favoritos do usuário logado.
 * Escrita de visualização e progresso passa por RPC (SECURITY DEFINER) porque o
 * cliente não escreve direto em tutorial_views nem no contador de tutorials.
 */
export const tutorialProgressService = {
  async listMyProgress(): Promise<TutorialProgress[]> {
    const { data, error } = await supabase
      .from("tutorial_progress")
      .select("tutorial_id, position_seconds, duration_seconds, completed, last_watched_at")
      .order("last_watched_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getProgress(tutorialId: string): Promise<TutorialProgress | null> {
    const { data, error } = await supabase
      .from("tutorial_progress")
      .select("tutorial_id, position_seconds, duration_seconds, completed, last_watched_at")
      .eq("tutorial_id", tutorialId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async saveProgress(tutorialId: string, positionSeconds: number, durationSeconds?: number | null) {
    const { error } = await supabase.rpc("upsert_tutorial_progress", {
      p_tutorial_id: tutorialId,
      p_position: Math.max(0, Math.round(positionSeconds)),
      p_duration: durationSeconds ? Math.round(durationSeconds) : null,
    });
    if (error) throw new Error(error.message);
  },

  async registerView(tutorialId: string) {
    const { error } = await supabase.rpc("register_tutorial_view", { p_tutorial_id: tutorialId });
    if (error) throw new Error(error.message);
  },

  async listMyFavorites(): Promise<string[]> {
    const { data, error } = await supabase.from("tutorial_favorites").select("tutorial_id");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => row.tutorial_id);
  },

  async setFavorite(tutorialId: string, userId: string, favorite: boolean) {
    if (favorite) {
      const { error } = await supabase
        .from("tutorial_favorites")
        .upsert({ tutorial_id: tutorialId, user_id: userId });
      if (error) throw new Error(error.message);
      return;
    }

    const { error } = await supabase
      .from("tutorial_favorites")
      .delete()
      .eq("tutorial_id", tutorialId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },
};
