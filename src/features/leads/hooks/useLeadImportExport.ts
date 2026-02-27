import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LeadType } from "../types";
import { parseCsv, parseIntOrNull, parseMoneyToNumber, toCsv, type CsvRow } from "../utils/csv";
import { LeadsService } from "../services/leadsService";

function pickPhoneColumns(row: CsvRow): string[] {
  const direct = row["phones"] || row["telefones"] || "";
  const byList = direct
    ? direct.split(/[|,;]/).map((s) => s.trim()).filter(Boolean)
    : [];

  const indexed: string[] = [];
  Object.keys(row)
    .filter((k) => /^phone_\d+$/.test(k) || /^telefone_\d+$/.test(k))
    .sort()
    .forEach((k) => {
      const v = (row[k] || "").trim();
      if (v) indexed.push(v);
    });

  return dedupe([...byList, ...indexed]);
}

function pickEmailColumns(row: CsvRow): string[] {
  const direct = row["emails"] || row["e_mails"] || row["e-mails"] || "";
  const byList = direct
    ? direct.split(/[|,;]/).map((s) => s.trim()).filter(Boolean)
    : [];

  const indexed: string[] = [];
  Object.keys(row)
    .filter((k) => /^email_\d+$/.test(k))
    .sort()
    .forEach((k) => {
      const v = (row[k] || "").trim();
      if (v) indexed.push(v);
    });

  return dedupe([...byList, ...indexed]);
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of list) {
    const key = v.trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function guessLeadType(row: CsvRow, fallback: "cliente" | "parceiro"): "cliente" | "parceiro" {
  const t = (row["lead_type"] || row["tipo_lead"] || "").trim().toLowerCase();
  if (t === "cliente" || t === "parceiro") return t;
  if (t === "fornecedor") return "parceiro"; // compatibilidade com CSV antigo
  return fallback;
}

async function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsText(file);
  });
}

export function useImportLeadsCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { file: File; leadType: Exclude<LeadType, null> }) => {
      const text = await readText(params.file);
      const rows = parseCsv(text);
      if (rows.length === 0) return { imported: 0, errors: [] as string[] };

      const errors: string[] = [];
      let imported = 0;

      // KISS: cria em sequência para evitar erros de rate/timeout
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          const company_name = (r["company_name"] || r["nome_da_empresa"] || r["nome_empresa"] || "").trim() || null;
          const cnpj = (r["cnpj"] || "").trim() || null;
          const address = (r["address"] || r["endereco"] || "").trim() || null;
          const cnae_or_activity = (r["cnae_or_activity"] || r["cnae"] || r["ramo_de_atividade"] || r["ramo_atividade"] || "").trim() || null;
          const partners = (r["partners"] || r["quadro_societario"] || "").trim() || null;
          const decision_makers = (r["decision_makers"] || r["tomadores_de_decisao"] || "").trim() || null;
          const avg_revenue = parseMoneyToNumber(r["avg_revenue"] || r["media_de_faturamento"] || r["media_faturamento"] || "");
          const avg_employees = parseIntOrNull(r["avg_employees"] || r["media_de_funcionarios"] || r["media_funcionarios"] || "");

          const phones = pickPhoneColumns(r);
          const emails = pickEmailColumns(r);

          const phonePrimary = (r["phone_primary"] || r["telefone_principal"] || "").trim();
          const emailPrimary = (r["email_primary"] || r["email_principal"] || "").trim();

          const lead_type = guessLeadType(r, params.leadType);

          await LeadsService.create({
            lead: {
              lead_type,
              company_name,
              cnpj,
              address,
              cnae_or_activity,
              partners,
              decision_makers,
              avg_revenue,
              avg_employees,
            },
            phones: phones.map((p) => ({
              phone: p,
              is_primary: phonePrimary ? p === phonePrimary : false,
            })),
            emails: emails.map((e) => ({
              email: e,
              is_primary: emailPrimary ? e === emailPrimary : false,
            })),
          });

          imported++;
        } catch (err) {
          errors.push(`Linha ${i + 2}: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
        }
      }

      return { imported, errors };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function exportLeadsToCsvFile(params: {
  leads: Array<{
    id: string;
    lead_type: string | null;
    company_name: string | null;
    cnpj: string | null;
    address: string | null;
    cnae_or_activity: string | null;
    avg_revenue: number | null;
    avg_employees: number | null;
    partners: string | null;
    decision_makers: string | null;
    lead_phones?: Array<{ phone: string; is_primary: boolean }> | null;
    lead_emails?: Array<{ email: string; is_primary: boolean }> | null;
  }>;
  filename: string;
}) {
  const rows: CsvRow[] = params.leads.map((l) => {
    const phones = (l.lead_phones || []).map((p) => p.phone);
    const emails = (l.lead_emails || []).map((e) => e.email);
    const primaryPhone = (l.lead_phones || []).find((p) => p.is_primary)?.phone || phones[0] || "";
    const primaryEmail = (l.lead_emails || []).find((e) => e.is_primary)?.email || emails[0] || "";

    // decision_makers: unir com " | " para evitar quebras de linha no CSV (que fariam Excel exibir só o primeiro)
    const decisionMakers = (l.decision_makers || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" | ");

    return {
      id: l.id,
      lead_type: l.lead_type || "",
      company_name: l.company_name || "",
      cnpj: l.cnpj || "",
      address: l.address || "",
      cnae_or_activity: l.cnae_or_activity || "",
      avg_revenue: l.avg_revenue === null || l.avg_revenue === undefined ? "" : String(l.avg_revenue),
      avg_employees: l.avg_employees === null || l.avg_employees === undefined ? "" : String(l.avg_employees),
      partners: l.partners || "",
      decision_makers: decisionMakers,
      phones: phones.join(" | "),
      phone_primary: primaryPhone,
      emails: emails.join(" | "),
      email_primary: primaryEmail,
    };
  });

  const csv = toCsv(rows, ";");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = params.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

