import { supabase } from "../lib/supabase";
import {
  computeMonthlyEvolution,
  getMonthDateRanges,
  type MonthlyEvolution,
} from "../lib/monthlyEvolution";

const DEFAULT_TIMEOUT = 15000;

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = DEFAULT_TIMEOUT): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Operação expirou. Verifique sua conexão e tente novamente.")), timeoutMs)
    ),
  ]);
};

async function countTableRows(
  table: "payroll_files" | "sped_files" | "process_monitorings",
  options?: {
    createdFrom?: string;
    createdTo?: string;
    activeOnly?: boolean;
  }
): Promise<number> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });

  if (options?.createdFrom) {
    query = query.gte("created_at", options.createdFrom);
  }

  if (options?.createdTo) {
    query = query.lt("created_at", options.createdTo);
  }

  if (options?.activeOnly && table === "process_monitorings") {
    query = query.is("deleted_at", null).is("paused_at", null);
  }

  const { count, error } = await withTimeout(query);

  if (error) {
    throw new Error(`Erro ao contar registros de ${table}: ${error.message}`);
  }

  return count || 0;
}

async function countDocumentsInRange(createdFrom: string, createdTo: string): Promise<number> {
  const [payrollCount, spedCount] = await Promise.all([
    countTableRows("payroll_files", { createdFrom, createdTo }),
    countTableRows("sped_files", { createdFrom, createdTo }),
  ]);

  return payrollCount + spedCount;
}

export class DashboardService {
  static async getDocumentsCount(): Promise<number> {
    try {
      const [payrollCount, spedCount] = await Promise.all([
        countTableRows("payroll_files"),
        countTableRows("sped_files"),
      ]);

      return payrollCount + spedCount;
    } catch (error) {
      console.error("Erro ao buscar total de documentos:", error);
      return 0;
    }
  }

  static async getDocumentsMonthlyEvolution(): Promise<MonthlyEvolution> {
    try {
      const {
        firstDayCurrentMonth,
        firstDayNextMonth,
        firstDayPreviousMonth,
      } = getMonthDateRanges();

      const [currentMonthCount, previousMonthCount] = await Promise.all([
        countDocumentsInRange(
          firstDayCurrentMonth.toISOString(),
          firstDayNextMonth.toISOString()
        ),
        countDocumentsInRange(
          firstDayPreviousMonth.toISOString(),
          firstDayCurrentMonth.toISOString()
        ),
      ]);

      return computeMonthlyEvolution(currentMonthCount, previousMonthCount);
    } catch (error) {
      console.error("Erro ao calcular evolução mensal de documentos:", error);
      return {
        currentMonthCount: 0,
        previousMonthCount: 0,
        evolutionPercent: null,
        evolutionText: "—",
      };
    }
  }

  static async getActiveProcessesCount(): Promise<number> {
    try {
      return await countTableRows("process_monitorings", { activeOnly: true });
    } catch (error) {
      console.error("Erro ao buscar processos ativos:", error);
      return 0;
    }
  }

  static async getActiveProcessesMonthlyEvolution(): Promise<MonthlyEvolution> {
    try {
      const {
        firstDayCurrentMonth,
        firstDayNextMonth,
        firstDayPreviousMonth,
      } = getMonthDateRanges();

      const [currentMonthCount, previousMonthCount] = await Promise.all([
        countTableRows("process_monitorings", {
          createdFrom: firstDayCurrentMonth.toISOString(),
          createdTo: firstDayNextMonth.toISOString(),
          activeOnly: true,
        }),
        countTableRows("process_monitorings", {
          createdFrom: firstDayPreviousMonth.toISOString(),
          createdTo: firstDayCurrentMonth.toISOString(),
          activeOnly: true,
        }),
      ]);

      return computeMonthlyEvolution(currentMonthCount, previousMonthCount);
    } catch (error) {
      console.error("Erro ao calcular evolução mensal de processos ativos:", error);
      return {
        currentMonthCount: 0,
        previousMonthCount: 0,
        evolutionPercent: null,
        evolutionText: "—",
      };
    }
  }
}
