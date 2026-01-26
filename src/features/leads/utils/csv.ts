export type CsvRow = Record<string, string>;

function detectDelimiter(line: string): "," | ";" {
  const comma = (line.match(/,/g) || []).length;
  const semi = (line.match(/;/g) || []).length;
  return semi > comma ? ";" : ",";
}

// Parser simples com suporte a aspas duplas.
export function parseCsv(text: string): CsvRow[] {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!raw) return [];

  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        // aspas escapadas ""
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          current += '"';
          i++;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && ch === delimiter) {
        out.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    out.push(current.trim());
    return out;
  };

  const headers = parseLine(lines[0]).map((h) => normalizeHeader(h));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const row: CsvRow = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue;
      row[key] = (cells[c] ?? "").trim();
    }
    rows.push(row);
  }

  return rows;
}

export function toCsv(rows: CsvRow[], preferredDelimiter: "," | ";" = ";"): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r)))
  );

  const escapeCell = (value: string) => {
    const v = value ?? "";
    if (v.includes('"') || v.includes(preferredDelimiter) || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const lines: string[] = [];
  lines.push(headers.map(escapeCell).join(preferredDelimiter));
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCell(r[h] ?? "")).join(preferredDelimiter));
  }
  return lines.join("\n");
}

export function normalizeHeader(h: string): string {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "");
}

export function parseMoneyToNumber(input: string): number | null {
  const s = String(input || "").trim();
  if (!s) return null;
  const normalized = s.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function parseIntOrNull(input: string): number | null {
  const s = String(input || "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

