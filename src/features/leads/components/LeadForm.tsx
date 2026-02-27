import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { LeadType, Lead } from "../types";
import { useCreateLead, useUpdateLead, useLead } from "../hooks/useLeads";
import PhonesFieldArray from "./PhonesFieldArray";
import EmailsFieldArray from "./EmailsFieldArray";
import DecisionMakersFieldArray from "./DecisionMakersFieldArray";
import { formatCnpj, formatCurrencyBR } from "../utils/masks";

const schema = z.object({
  company_name: z.string().trim().optional().nullable(),
  cnpj: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  cnae_or_activity: z.string().trim().optional().nullable(),
  avg_revenue: z
    .preprocess((v) => {
      if (v === "" || v === null || v === undefined) return null;
      if (typeof v === "number") return v;
      const s = String(v).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }, z.number().nullable().optional())
    .nullable()
    .optional(),
  avg_employees: z
    .preprocess((v) => {
      if (v === "" || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }, z.number().int().nullable().optional())
    .nullable()
    .optional(),
  partners: z.string().trim().optional().nullable(),
  decision_makers: z.array(z.string().trim()).default([]),
  phones: z
    .array(
      z.object({
        phone: z.string().trim().optional().default(""),
        is_primary: z.boolean().default(false),
      })
    )
    .default([]),
  emails: z
    .array(
      z.object({
        email: z.string().trim().optional().default(""),
        is_primary: z.boolean().default(false),
      })
    )
    .default([]),
});

type FormValues = z.infer<typeof schema>;

export default function LeadForm({
  leadType,
  leadId,
  onSaved,
}: {
  leadType: Exclude<LeadType, null>;
  leadId?: string | null;
  onSaved?: () => void;
}) {
  const { data: leadToEdit } = useLead(leadId ?? null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: null,
      cnpj: null,
      address: null,
      cnae_or_activity: null,
      avg_revenue: null,
      avg_employees: null,
      partners: null,
      decision_makers: [],
      phones: [],
      emails: [],
    },
  });

  const { mutateAsync: createLead, isPending: isCreating } = useCreateLead({ leadType });
  const { mutateAsync: updateLead, isPending: isUpdating } = useUpdateLead({ leadType });
  const isPending = isCreating || isUpdating;
  const isEditing = !!leadId && !!leadToEdit;

  // Carregar dados do lead quando estiver editando
  useEffect(() => {
    if (leadToEdit) {
      form.reset({
        company_name: leadToEdit.company_name,
        cnpj: leadToEdit.cnpj,
        address: leadToEdit.address,
        cnae_or_activity: leadToEdit.cnae_or_activity,
        avg_revenue: leadToEdit.avg_revenue,
        avg_employees: leadToEdit.avg_employees,
        partners: leadToEdit.partners,
        decision_makers: leadToEdit.decision_makers
          ? leadToEdit.decision_makers.split(/\r?\n/).filter(Boolean)
          : [],
        phones:
          leadToEdit.lead_phones?.map((p) => ({
            phone: p.phone,
            is_primary: p.is_primary,
          })) || [],
        emails:
          leadToEdit.lead_emails?.map((e) => ({
            email: e.email,
            is_primary: e.is_primary,
          })) || [],
      });
    } else if (!leadId) {
      // Reset quando não há leadId (modo criação)
      form.reset({
        company_name: null,
        cnpj: null,
        address: null,
        cnae_or_activity: null,
        avg_revenue: null,
        avg_employees: null,
        partners: null,
        decision_makers: [],
        phones: [],
        emails: [],
      });
    }
  }, [leadToEdit, leadId, form]);

  useEffect(() => {
    // quando alterna Cliente/Fornecedor, não apaga o formulário — só ajusta o tipo no submit.
  }, [leadType]);

  const onSubmit = async (values: FormValues) => {
    try {
      const phones = (values.phones || [])
        .map((p) => ({ phone: p.phone?.trim() || "", is_primary: !!p.is_primary }))
        .filter((p) => p.phone.length > 0);

      const emails = (values.emails || [])
        .map((e) => ({ email: e.email?.trim() || "", is_primary: !!e.is_primary }))
        .filter((e) => e.email.length > 0);

      const decisionMakersStr =
        Array.isArray(values.decision_makers) && values.decision_makers.length > 0
          ? values.decision_makers
              .map((s) => (s || "").trim())
              .filter(Boolean)
              .join("\n")
          : null;

      const leadData = {
        lead: {
          lead_type: leadType,
          company_name: values.company_name ?? null,
          cnpj: values.cnpj ?? null,
          address: values.address ?? null,
          cnae_or_activity: values.cnae_or_activity ?? null,
          avg_revenue: (values.avg_revenue as number | null) ?? null,
          avg_employees: (values.avg_employees as number | null) ?? null,
          partners: values.partners ?? null,
          decision_makers: decisionMakersStr,
        },
        phones,
        emails,
      };

      if (isEditing && leadId) {
        await updateLead({ id: leadId, input: leadData });
        toast.success("Lead atualizado");
      } else {
        await createLead(leadData);
        toast.success("Lead cadastrado");
      }

      form.reset();
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar lead");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{isEditing ? "Editar Lead" : "Cadastro de Lead"}</h2>
        <p className="text-sm text-muted-foreground">
          {isEditing
            ? "Edite os dados do lead abaixo."
            : "Todos os campos são opcionais. Selecione o tipo no topo (Cliente/Fornecedor)."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da empresa</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="Ex.: Empresa XPTO LTDA" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="00.000.000/0001-00"
                    inputMode="numeric"
                    onChange={(e) => field.onChange(formatCnpj(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ""} placeholder="Rua..., nº..., Cidade/UF" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cnae_or_activity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNAE ou ramo de atividade</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="Ex.: Contabilidade / 6201-5/01" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="avg_revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Média de faturamento</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      {...field}
                      value={field.value === null || field.value === undefined ? "" : String(field.value)}
                      placeholder="Ex.: 150.000,00"
                      onChange={(e) => field.onChange(formatCurrencyBR(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avg_employees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Média de funcionários</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      {...field}
                      value={field.value === null || field.value === undefined ? "" : String(field.value)}
                      placeholder="Ex.: 12"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="partners"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quadro societário</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ""} placeholder="Sócios / participações (opcional)" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DecisionMakersFieldArray form={form} name={"decision_makers" as any} />

          <PhonesFieldArray form={form} name={"phones" as any} />

          <EmailsFieldArray form={form} name={"emails" as any} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isPending}>
              Limpar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : isEditing ? "Atualizar Lead" : "Salvar Lead"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

