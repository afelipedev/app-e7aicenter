import type {
  AdvancedSearchParams,
  AdvancedSearchResult,
  DashboardData,
  PaginatedProcesses,
  ProcessAgentSummary,
  ProcessDetail,
  ProcessFilterOptions,
  ProcessListParams,
  ProcessSearchResult,
} from "../types";
import type { ProcessProvider } from "../adapters/processProvider";
import { supabase } from "@/lib/supabase";

const DATAJUD_FUNCTION = "datajud-search";
const AGENT_FUNCTION = "datajud-process-agent";

async function invokeEdgeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    throw new Error(error.message || `Erro ao chamar ${name}`);
  }

  if ((data as { error?: string } | null)?.error) {
    throw new Error((data as { error: string }).error);
  }

  return data as T;
}

export const processesService: ProcessProvider = {
  async getDashboardData(): Promise<DashboardData> {
    return invokeEdgeFunction<DashboardData>(DATAJUD_FUNCTION, { action: "dashboard" });
  },

  async listQueries(params: ProcessListParams): Promise<PaginatedProcesses> {
    return invokeEdgeFunction<PaginatedProcesses>(DATAJUD_FUNCTION, {
      action: "list-queries",
      ...params,
    });
  },

  async getProcessDetails(caseId: string, forceRefresh = false): Promise<ProcessDetail | null> {
    return invokeEdgeFunction<ProcessDetail>(DATAJUD_FUNCTION, {
      action: "process-details",
      snapshotId: caseId,
      forceRefresh,
    });
  },

  async getFilterOptions(): Promise<ProcessFilterOptions> {
    return invokeEdgeFunction<ProcessFilterOptions>(DATAJUD_FUNCTION, { action: "filter-options" });
  },

  async searchProcessByCnj(cnj: string): Promise<ProcessSearchResult> {
    return invokeEdgeFunction<ProcessSearchResult>(DATAJUD_FUNCTION, {
      action: "search-cnj",
      cnj,
    });
  },

  async advancedSearch(params: AdvancedSearchParams): Promise<AdvancedSearchResult> {
    return invokeEdgeFunction<AdvancedSearchResult>(DATAJUD_FUNCTION, {
      action: "advanced-search",
      ...params,
    });
  },

  async getProcessAgentSummary(caseId: string, forceRefresh = false): Promise<ProcessAgentSummary> {
    return invokeEdgeFunction<ProcessAgentSummary>(AGENT_FUNCTION, {
      snapshotId: caseId,
      forceRefresh,
    });
  },

  async toggleFavorite(processId: string) {
    await invokeEdgeFunction(DATAJUD_FUNCTION, { action: "toggle-favorite", snapshotId: processId });
  },

  async deleteProcess(processId: string) {
    await invokeEdgeFunction(DATAJUD_FUNCTION, { action: "delete-process", snapshotId: processId });
  },
};
