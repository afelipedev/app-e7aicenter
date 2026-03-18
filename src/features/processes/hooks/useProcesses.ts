import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { processesService } from "../services/processesService";
import type { ApiConsumptionQueryParams, HistoricalListParams, ProcessListParams } from "../types";

const processKeys = {
  all: ["processes"] as const,
  dashboard: () => [...processKeys.all, "dashboard"] as const,
  queries: (params: ProcessListParams) => [...processKeys.all, "queries", params] as const,
  history: (params: HistoricalListParams) => [...processKeys.all, "history", params] as const,
  details: (caseId: string) => [...processKeys.all, "details", caseId] as const,
  monitoring: () => [...processKeys.all, "monitoring"] as const,
  apiConsumption: (params: ApiConsumptionQueryParams) => [...processKeys.all, "api-consumption", params] as const,
};

export function useProcessesDashboard() {
  return useQuery({
    queryKey: processKeys.dashboard(),
    queryFn: () => processesService.getDashboardData(),
  });
}

export function useProcessQueries(params: ProcessListParams) {
  return useQuery({
    queryKey: processKeys.queries(params),
    queryFn: () => processesService.listQueries(params),
  });
}

export function useHistoricalQueries(params: HistoricalListParams) {
  return useQuery({
    queryKey: processKeys.history(params),
    queryFn: () => processesService.listHistoricalQueries(params),
  });
}

export function useProcessDetails(caseId: string) {
  return useQuery({
    queryKey: processKeys.details(caseId),
    queryFn: () => processesService.getProcessDetails(caseId),
    enabled: Boolean(caseId),
  });
}

export function useProcessMonitoring() {
  return useQuery({
    queryKey: processKeys.monitoring(),
    queryFn: () => processesService.getMonitoringData(),
  });
}

export function useProcessApiConsumption(params: ApiConsumptionQueryParams) {
  return useQuery({
    queryKey: processKeys.apiConsumption(params),
    queryFn: () => processesService.getApiConsumptionData(params),
  });
}

export function useFilterOptions() {
  return useQuery({
    queryKey: [...processKeys.all, "filter-options"] as const,
    queryFn: () => processesService.getFilterOptions(),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (processId: string) => processesService.toggleFavorite(processId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processKeys.all });
    },
  });
}

export function useDeleteProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (processId: string) => processesService.deleteProcess(processId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processKeys.all });
    },
  });
}

export function useToggleProcessMonitoring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (processId: string) => processesService.toggleProcessMonitoring(processId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processKeys.all });
    },
  });
}

export function useToggleDocumentMonitoring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (monitoringId: string) => processesService.toggleDocumentMonitoring(monitoringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processKeys.all });
    },
  });
}
