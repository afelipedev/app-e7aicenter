import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { processesService } from "../services/processesService";
import type { AdvancedSearchParams, ProcessListParams } from "../types";

const processKeys = {
  all: ["processes"] as const,
  dashboard: () => [...processKeys.all, "dashboard"] as const,
  queries: (params: ProcessListParams) => [...processKeys.all, "queries", params] as const,
  details: (caseId: string) => [...processKeys.all, "details", caseId] as const,
  agent: (caseId: string) => [...processKeys.all, "agent", caseId] as const,
  filterOptions: () => [...processKeys.all, "filter-options"] as const,
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

export function useProcessDetails(caseId: string) {
  return useQuery({
    queryKey: processKeys.details(caseId),
    queryFn: () => processesService.getProcessDetails(caseId),
    enabled: Boolean(caseId),
  });
}

export function useProcessAgentSummary(caseId: string, enabled = true) {
  return useQuery({
    queryKey: processKeys.agent(caseId),
    queryFn: () => processesService.getProcessAgentSummary(caseId),
    enabled: Boolean(caseId) && enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRefreshProcessAgentSummary(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => processesService.getProcessAgentSummary(caseId, true),
    onSuccess: (data) => {
      queryClient.setQueryData(processKeys.agent(caseId), data);
    },
  });
}

export function useFilterOptions() {
  return useQuery({
    queryKey: processKeys.filterOptions(),
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

export function useSearchProcessByCnj() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cnj: string) => processesService.searchProcessByCnj(cnj),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: processKeys.filterOptions() });
      queryClient.invalidateQueries({ queryKey: [...processKeys.all, "queries"] });
    },
  });
}

export function useAdvancedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AdvancedSearchParams) => processesService.advancedSearch(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: processKeys.filterOptions() });
      queryClient.invalidateQueries({ queryKey: [...processKeys.all, "queries"] });
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
