import { supabase } from "../lib/supabase";

const DEFAULT_TIMEOUT = 15000;

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = DEFAULT_TIMEOUT): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Operação expirou. Verifique sua conexão e tente novamente.")), timeoutMs)
    ),
  ]);
};

type CountableTable = "payroll_files" | "sped_files" | "process_snapshots" | "chats" | "companies";

async function countRows(
  table: CountableTable,
  options?: { status?: string }
): Promise<number> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { count, error } = await withTimeout(query);

  if (error) {
    throw new Error(`Erro ao contar registros de ${table}: ${error.message}`);
  }

  return count || 0;
}

export class DashboardService {
  /** Quantidade de holerites com processamento concluído. */
  static async getProcessedPayrollsCount(): Promise<number> {
    try {
      return await countRows("payroll_files", { status: "completed" });
    } catch (error) {
      console.error("Erro ao buscar holerites processados:", error);
      return 0;
    }
  }

  /** Quantidade de arquivos SPED com processamento concluído. */
  static async getProcessedSpedsCount(): Promise<number> {
    try {
      return await countRows("sped_files", { status: "completed" });
    } catch (error) {
      console.error("Erro ao buscar SPEDs processados:", error);
      return 0;
    }
  }

  /** Quantidade de processos consultados no módulo de consultas processuais. */
  static async getConsultedProcessesCount(): Promise<number> {
    try {
      return await countRows("process_snapshots");
    } catch (error) {
      console.error("Erro ao buscar processos consultados:", error);
      return 0;
    }
  }

  /** Quantidade de empresas cadastradas. */
  static async getCompaniesCount(): Promise<number> {
    try {
      return await countRows("companies");
    } catch (error) {
      console.error("Erro ao buscar total de empresas:", error);
      return 0;
    }
  }

  /** Quantidade de chats (conversas) iniciados no AI Center. */
  static async getChatsCount(): Promise<number> {
    try {
      return await countRows("chats");
    } catch (error) {
      console.error("Erro ao buscar total de conversas IA:", error);
      return 0;
    }
  }
}
