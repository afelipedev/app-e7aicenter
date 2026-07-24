import { supabase } from "@/lib/supabase";
import type {
  AiAdoptionReport,
  KanbanReport,
  PayrollSpedReport,
  ProcessesReport,
  ReportFiltersState,
} from "../types";

const DEFAULT_TIMEOUT = 20000;

const withTimeout = <T>(promise: PromiseLike<T>, timeoutMs: number = DEFAULT_TIMEOUT): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Operação expirou. Verifique sua conexão e tente novamente.")), timeoutMs)
    ),
  ]);
};

function periodArgs(filters: ReportFiltersState) {
  return { p_from: filters.from, p_to: filters.to };
}

/**
 * Camada de acesso às RPCs agregadoras do Supabase (migration
 * `create_reports_rpc_functions`). Cada método faz uma chamada e devolve
 * o jsonb já tipado.
 */
export class ReportsService {
  static async getPayrollSped(filters: ReportFiltersState): Promise<PayrollSpedReport> {
    const { data, error } = await withTimeout(
      supabase.rpc("report_payroll_sped_summary", {
        ...periodArgs(filters),
        p_company_id: filters.companyId,
      })
    );
    if (error) throw new Error(`Erro ao gerar relatório Folha & SPED: ${error.message}`);
    return data as PayrollSpedReport;
  }

  static async getKanban(filters: ReportFiltersState): Promise<KanbanReport> {
    const { data, error } = await withTimeout(
      supabase.rpc("report_kanban_throughput", periodArgs(filters))
    );
    if (error) throw new Error(`Erro ao gerar relatório Kanban: ${error.message}`);
    return data as KanbanReport;
  }

  static async getAiAdoption(filters: ReportFiltersState): Promise<AiAdoptionReport> {
    const { data, error } = await withTimeout(
      supabase.rpc("report_ai_adoption", periodArgs(filters))
    );
    if (error) throw new Error(`Erro ao gerar relatório de Adoção de IA: ${error.message}`);
    return data as AiAdoptionReport;
  }

  static async getProcesses(filters: ReportFiltersState): Promise<ProcessesReport> {
    const { data, error } = await withTimeout(
      supabase.rpc("report_processes_overview", periodArgs(filters))
    );
    if (error) throw new Error(`Erro ao gerar relatório de Processos: ${error.message}`);
    return data as ProcessesReport;
  }
}
