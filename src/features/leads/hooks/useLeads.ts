import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LeadsService, type ListLeadsParams } from "../services/leadsService";
import type { Lead, LeadWithContactsInput } from "../types";

const leadsKey = (params: ListLeadsParams) => ["leads", params] as const;

export function useLeads(params: ListLeadsParams = {}) {
  return useQuery({
    queryKey: leadsKey(params),
    queryFn: () => LeadsService.list(params),
  });
}

export function useLead(id: string | null) {
  return useQuery({
    queryKey: ["lead", id] as const,
    queryFn: () => (id ? LeadsService.getById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useCreateLead(paramsToInvalidate: ListLeadsParams = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadWithContactsInput) => LeadsService.create(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: leadsKey(paramsToInvalidate) });
      await qc.invalidateQueries({ queryKey: ["lead"] });
    },
  });
}

export function useUpdateLead(paramsToInvalidate: ListLeadsParams = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LeadWithContactsInput }) =>
      LeadsService.update(id, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: leadsKey(paramsToInvalidate) });
      await qc.invalidateQueries({ queryKey: ["lead"] });
    },
  });
}

export function useSetLeadActive(paramsToInvalidate: ListLeadsParams = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      LeadsService.setActive(id, isActive),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: leadsKey(paramsToInvalidate) });
      await qc.invalidateQueries({ queryKey: ["lead"] });
    },
  });
}

export function getLeadDisplayName(lead: Pick<Lead, "company_name" | "cnpj">): string {
  return lead.company_name || lead.cnpj || "Sem nome";
}

