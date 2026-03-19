import type {
  ApiConsumptionData,
  ApiConsumptionQueryParams,
  DashboardData,
  DocumentSearchType,
  HistoricalListParams,
  MonitoringData,
  PaginatedProcesses,
  ProcessAgentSummary,
  ProcessDetail,
  ProcessFilterOptions,
  ProcessListParams,
  ProcessSearchResult,
} from "../types";
import type { ProcessProvider } from "../adapters/processProvider";
import { JuditConsumptionService } from "./juditConsumptionService";
import { supabase } from "@/lib/supabase";

const delay = (ms = 2000) => new Promise((resolve) => setTimeout(resolve, ms));

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

function normalizeAsyncStatus(status: unknown): ProcessSearchResult["status"] {
  const value = String(status ?? "").toLowerCase();
  if (value === "completed") return "completed";
  if (value === "error" || value === "failed" || value === "cancelled" || value === "canceled") return "error";
  if (value === "processing" || value === "running") return "processing";
  return "pending";
}

async function waitForRequestCompletion(initialResult: {
  status?: string;
  requestId?: string;
  juditRequestId?: string | null;
  process?: ProcessSearchResult["process"];
}) {
  const initialStatus = normalizeAsyncStatus(initialResult.status);
  if (initialStatus === "completed" || initialStatus === "error" || !initialResult.requestId) {
    return {
      status: initialStatus,
      requestId: initialResult.requestId ?? "",
      juditRequestId: initialResult.juditRequestId ?? null,
      process: initialResult.process ?? null,
    } satisfies ProcessSearchResult;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await delay();
    const next = await invokeEdgeFunction<{
      status?: string;
      requestId: string;
      juditRequestId?: string | null;
    }>("judit-processes", {
      action: "request-status",
      requestId: initialResult.requestId,
    });

    const nextStatus = normalizeAsyncStatus(next.status);
    if (nextStatus === "completed" || nextStatus === "error") {
      return {
        status: nextStatus,
        requestId: next.requestId,
        juditRequestId: next.juditRequestId ?? null,
        process: initialResult.process ?? null,
      } satisfies ProcessSearchResult;
    }
  }

  return {
    status: "processing",
    requestId: initialResult.requestId,
    juditRequestId: initialResult.juditRequestId ?? null,
    process: initialResult.process ?? null,
  } satisfies ProcessSearchResult;
}

export const processesService: ProcessProvider = {
  async getDashboardData(): Promise<DashboardData> {
    return invokeEdgeFunction<DashboardData>("judit-processes", { action: "dashboard" });
  },

  async listQueries(params: ProcessListParams): Promise<PaginatedProcesses> {
    return invokeEdgeFunction<PaginatedProcesses>("judit-processes", {
      action: "list-queries",
      ...params,
    });
  },

  async listHistoricalQueries(params: HistoricalListParams): Promise<PaginatedProcesses> {
    return invokeEdgeFunction<PaginatedProcesses>("judit-processes", {
      action: "list-history",
      ...params,
    });
  },

  async getProcessDetails(caseId: string): Promise<ProcessDetail | null> {
    return invokeEdgeFunction<ProcessDetail>("judit-processes", {
      action: "process-details",
      snapshotId: caseId,
    });
  },

  async getFilterOptions(): Promise<ProcessFilterOptions> {
    return invokeEdgeFunction<ProcessFilterOptions>("judit-processes", { action: "filter-options" });
  },

  async getMonitoringData(): Promise<MonitoringData> {
    return invokeEdgeFunction<MonitoringData>("judit-processes", { action: "monitoring-data" });
  },

  async getApiConsumptionData(params: ApiConsumptionQueryParams): Promise<ApiConsumptionData> {
    return JuditConsumptionService.getConsumptionReport(params);
  },

  async searchProcessByCnj(cnj: string): Promise<ProcessSearchResult> {
    const initialResult = await invokeEdgeFunction<{
      status?: string;
      requestId: string;
      juditRequestId?: string | null;
      process?: ProcessSearchResult["process"];
    }>("judit-processes", {
      action: "search-cnj",
      cnj,
    });

    return waitForRequestCompletion(initialResult);
  },

  async searchHistoricalProcesses(
    documentType: DocumentSearchType,
    documentValue: string,
  ): Promise<ProcessSearchResult> {
    const initialResult = await invokeEdgeFunction<{
      status?: string;
      requestId: string;
      juditRequestId?: string | null;
    }>("judit-processes", {
      action: "search-history",
      documentType,
      documentValue,
    });

    return waitForRequestCompletion(initialResult);
  },

  async getProcessAgentSummary(caseId: string, forceRefresh = false): Promise<ProcessAgentSummary> {
    return invokeEdgeFunction<ProcessAgentSummary>("judit-process-agent", {
      snapshotId: caseId,
      forceRefresh,
    });
  },

  async toggleFavorite(processId: string) {
    await invokeEdgeFunction("judit-processes", {
      action: "toggle-favorite",
      snapshotId: processId,
    });
  },

  async deleteProcess(processId: string) {
    await invokeEdgeFunction("judit-processes", {
      action: "delete-process",
      snapshotId: processId,
    });
  },

  async toggleProcessMonitoring(processId: string) {
    await invokeEdgeFunction("judit-processes", {
      action: "toggle-process-monitoring",
      snapshotId: processId,
    });
  },

  async toggleDocumentMonitoring(monitoringId: string) {
    await invokeEdgeFunction("judit-processes", {
      action: "toggle-document-monitoring",
      monitoringId,
    });
  },

  async toggleDocumentSearchMonitoring(documentType: DocumentSearchType, documentValue: string) {
    await invokeEdgeFunction("judit-processes", {
      action: "toggle-document-search-monitoring",
      documentType,
      documentValue,
    });
  },
};
