// src/lib/parser.ts
import ExcelJS from 'exceljs';

export const UNIFIED_COLUMNS = [
  "Date",
  "Report Type",
  "Field Name / Location",
  "Oil BBL",
  "Oil Sales BBL",
  "Gas Sales MCF",
  "Gas Lift MCF",
  "Produced Water BWPD",
  "Return Gas MCF",
  "Flare MCF",
  "Oil Stock BBL",
  "Injection Pressure PSI",
  "Suction PSI",
  "Discharge PSI",
  "RPM",
  "Gas Flow MCFD",
  "Hours Operating",
  "Operational Notes"
] as const;

export type UnifiedRow = Record<(typeof UNIFIED_COLUMNS)[number], any> & {
  source_file?: string;
};

const NUMERIC_COLS = [
  "Oil BBL","Oil Sales BBL","Gas Sales MCF","Gas Lift MCF","Produced Water BWPD",
  "Return Gas MCF","Flare MCF","Oil Stock BBL","Injection Pressure PSI","Suction PSI",
  "Discharge PSI","RPM","Gas Flow MCFD","Hours Operating"
];

function coerceNumber(v: any) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(v: any): string | null {
  try {
    const d = new Date(v);
    return isNaN(+d) ? null : d.toISOString().slice(0, 10);
  } catch { return null; }
}

/** Simple CSV parser for the unified header (assumes no embedded commas/quotes). */
export function parseCsv(buf: Buffer, filename: string): UnifiedRow[] {
  const text = buf.toString('utf8');
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return [];

  const header = lines[0].split(',').map(s => s.trim());
  const idx = (name: string) => header.indexOf(name);

  const out: UnifiedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(','); // NOTE: for quoted CSV, swap to a real CSV parser later
    const row: any = {};
    for (const name of UNIFIED_COLUMNS) {
      const j = idx(name);
      row[name] = j >= 0 ? (cols[j]?.trim() ?? null) : null;
    }
    row["Date"] = row["Date"] ? normalizeDate(row["Date"]) : null;
    for (const name of NUMERIC_COLS) row[name] = coerceNumber(row[name]);
    row["Operational Notes"] = row["Operational Notes"] ?? null;
    row["source_file"] = filename;

    if (Object.values(row).some(v => v !== null && v !== "")) {
      out.push(row as UnifiedRow);
    }
  }
  return out;
}

/** XLSX parser using exceljs (first worksheet, first row = unified headers). */
export async function parseXlsx(buf: Buffer, filename: string): Promise<UnifiedRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  // read header row
  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, col) => {
    const raw = cell.value as any;
    const txt =
      raw && typeof raw === 'object' && 'text' in raw ? String(raw.text) :
      raw != null ? String(raw) : '';
    headers[col - 1] = txt.trim();
  });

  const out: UnifiedRow[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const raw: Record<string, any> = {};
    headers.forEach((h, i) => {
      const v: any = row.getCell(i + 1).value;
      const val =
        v && typeof v === 'object' && 'text' in v ? (v as any).text :
        v != null ? v : null;
      raw[h] = val;
    });

    const r: any = {};
    for (const name of UNIFIED_COLUMNS) r[name] = raw[name] ?? null;

    r["Date"] = r["Date"] ? normalizeDate(r["Date"]) : null;
    for (const name of NUMERIC_COLS) r[name] = coerceNumber(r[name]);
    r["Operational Notes"] = r["Operational Notes"] ?? null;
    r["source_file"] = filename;

    if (Object.values(r).some(v => v !== null && v !== "")) {
      out.push(r as UnifiedRow);
    }
  });

  return out;
}
