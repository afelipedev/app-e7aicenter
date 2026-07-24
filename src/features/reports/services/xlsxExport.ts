import * as XLSX from "xlsx";

export interface XlsxSheet {
  /** Nome da aba (máx. 31 chars, sanitizado). */
  name: string;
  /** Linhas como objetos chave→valor; as chaves viram o cabeçalho. */
  rows: Array<Record<string, unknown>>;
}

/** Remove caracteres inválidos e limita o nome da aba a 31 caracteres. */
function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Aba";
}

/**
 * Gera e baixa um arquivo .xlsx com uma ou mais abas.
 * Reutiliza o padrão de download por Blob já usado no módulo de Leads.
 */
export function exportXlsx(filename: string, sheets: XlsxSheet[]): void {
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const sheet of sheets) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [{ "Sem dados": "" }];
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Garante nomes únicos e válidos.
    let name = sanitizeSheetName(sheet.name);
    let suffix = 1;
    while (usedNames.has(name)) {
      name = sanitizeSheetName(`${sheet.name} ${++suffix}`);
    }
    usedNames.add(name);

    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const finalName = filename.endsWith(".xlsx") ? filename : `${filename}_${stamp}.xlsx`;
  XLSX.writeFile(workbook, finalName, { compression: true });
}

/** Formata número como moeda BRL para células de planilha/exibição. */
export function brl(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}
