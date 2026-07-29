import { supabase } from "@/lib/supabase";
import type {
  AiCenterReport,
  KanbanDomainFilter,
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
 * `20260729121000_reports_rpc_v2.sql`). Cada método faz uma chamada e devolve
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

  static async getKanban(
    filters: ReportFiltersState,
    domain: KanbanDomainFilter = "all",
  ): Promise<KanbanReport> {
    const { data, error } = await withTimeout(
      supabase.rpc("report_kanban_throughput", {
        ...periodArgs(filters),
        p_domain: domain === "all" ? null : domain,
      })
    );
    if (error) throw new Error(`Erro ao gerar relatório de Quadros: ${error.message}`);
    return data as KanbanReport;
  }

  static async getAiCenter(filters: ReportFiltersState): Promise<AiCenterReport> {
    const { data, error } = await withTimeout(
      supabase.rpc("report_ai_center_e7", periodArgs(filters))
    );
    if (error) throw new Error(`Erro ao gerar relatório do AI Center: ${error.message}`);
    return data as AiCenterReport;
  }

  static async getProcesses(filters: ReportFiltersState): Promise<ProcessesReport> {
    const { data, error } = await withTimeout(
      supabase.rpc("report_processes_overview", periodArgs(filters))
    );
    if (error) throw new Error(`Erro ao gerar relatório de Processos: ${error.message}`);
    return data as ProcessesReport;
  }
}
