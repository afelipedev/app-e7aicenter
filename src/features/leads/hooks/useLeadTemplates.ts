import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LeadTemplatesService } from "../services/leadTemplatesService";
import type { MessageTemplate, MessageTemplateCategory } from "../types";

export function useTemplateCategories() {
  return useQuery({
    queryKey: ["leadTemplates", "categories"] as const,
    queryFn: () => LeadTemplatesService.listCategories(),
  });
}

export function useTemplatePlaceholders() {
  return useQuery({
    queryKey: ["leadTemplates", "placeholders"] as const,
    queryFn: () => LeadTemplatesService.listPlaceholders(),
  });
}

export function useMessageTemplates(params: { categoryId?: string; includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: ["leadTemplates", "templates", params] as const,
    queryFn: () => LeadTemplatesService.listTemplates(params),
  });
}

export function useUpsertMessageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<MessageTemplate> & Pick<MessageTemplate, "title" | "content_json"> & { id?: string }) =>
      LeadTemplatesService.upsertTemplate(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["leadTemplates"] });
    },
  });
}

export function useDeleteMessageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => LeadTemplatesService.deleteTemplate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["leadTemplates"] });
    },
  });
}

export function useUpsertTemplateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<MessageTemplateCategory> & Pick<MessageTemplateCategory, "name"> & { id?: string }) =>
      LeadTemplatesService.upsertCategory(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["leadTemplates", "categories"] });
    },
  });
}

