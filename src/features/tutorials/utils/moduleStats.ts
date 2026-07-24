import type { TutorialProgress } from "../types";

/** Agrega os totais usados pela trilha a partir do progresso do usuário. */
export function buildModuleStats(
  tutorials: { id: string; module_key: string | null }[],
  progress: TutorialProgress[] | undefined
) {
  const completedIds = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.tutorial_id));
  const counts: Record<string, number> = {};
  const completed: Record<string, number> = {};

  for (const tutorial of tutorials) {
    const key = tutorial.module_key || "geral";
    counts[key] = (counts[key] ?? 0) + 1;
    if (completedIds.has(tutorial.id)) completed[key] = (completed[key] ?? 0) + 1;
  }

  return { counts, completed };
}
