export interface MonthlyEvolution {
  currentMonthCount: number;
  previousMonthCount: number;
  evolutionPercent: number | null;
  evolutionText: string;
}

export function getMonthDateRanges(now = new Date()) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const firstDayCurrentMonth = new Date(currentYear, currentMonth, 1);
  const firstDayNextMonth = new Date(currentYear, currentMonth + 1, 1);
  const firstDayPreviousMonth = new Date(currentYear, currentMonth - 1, 1);

  return {
    firstDayCurrentMonth,
    firstDayNextMonth,
    firstDayPreviousMonth,
  };
}

export function computeMonthlyEvolution(current: number, previous: number): MonthlyEvolution {
  let evolutionPercent: number | null = null;
  let evolutionText = "—";

  if (previous === 0) {
    if (current > 0) {
      evolutionText = "Novo";
    }
  } else {
    evolutionPercent = ((current - previous) / previous) * 100;

    if (evolutionPercent > 0) {
      evolutionText = `+${evolutionPercent.toFixed(0)}%`;
    } else if (evolutionPercent < 0) {
      evolutionText = `${evolutionPercent.toFixed(0)}%`;
    } else {
      evolutionText = "0%";
    }
  }

  return {
    currentMonthCount: current,
    previousMonthCount: previous,
    evolutionPercent,
    evolutionText,
  };
}

export function getEvolutionColor(
  evolutionPercent: number | null,
  defaultColor: string
): string {
  if (evolutionPercent === null) {
    return defaultColor;
  }

  if (evolutionPercent > 0) {
    return "text-green-600";
  }

  if (evolutionPercent < 0) {
    return "text-red-600";
  }

  return defaultColor;
}
