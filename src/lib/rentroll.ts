import * as XLSX from 'xlsx';
import type { RentRollRow, RentRollSummary } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normalize BD/BA string: "0/1.00" → "Studio", "1/1.00" → "1BR/1BA", etc. */
function normalizeBdBa(raw: string): string {
  if (!raw) return '';
  const m = raw.match(/^(\d+)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!m) return raw;
  const bd = parseInt(m[1], 10);
  const ba = parseFloat(m[2]);
  const baInt = Math.floor(ba);
  if (bd === 0) return 'Studio';
  return `${bd}BR/${baInt}BA`;
}

/** Convert a SheetJS cell value to an ISO date string (YYYY-MM-DD) or null. */
function toDateStr(v: unknown): string | null {
  if (v == null) return null;

  // Already a Date object (cellDates: true)
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return v.toISOString().slice(0, 10);
  }

  // Excel serial number
  if (typeof v === 'number') {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (!parsed) return null;
    const mm = String(parsed.m).padStart(2, '0');
    const dd = String(parsed.d).padStart(2, '0');
    return `${parsed.y}-${mm}-${dd}`;
  }

  // String date — try parsing
  if (typeof v === 'string' && v.trim()) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  return null;
}

/** Safe numeric conversion — returns null for blanks / non-numbers. */
function toNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,$]/g, ''));
  return isNaN(n) ? null : n;
}

/** Read a File as an ArrayBuffer. */
function readFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// ── Header matching ──────────────────────────────────────────────────────────

/** Canonical header labels mapped to RentRollRow keys. */
const HEADER_MAP: Record<string, keyof RentRollRow> = {
  'unit': 'unit',
  'unit type': 'unitType',
  'bd/ba': 'bdBa',
  'status': 'status',
  'sqft': 'sqft',
  'market rent': 'marketRent',
  'rent': 'rent',
  'lease from': 'leaseFrom',
  'lease to': 'leaseTo',
  'move-in': 'moveIn',
  'move in': 'moveIn',
  'movein': 'moveIn',
};

/**
 * Find the header row and build a column-index → field-key map.
 * Returns [headerRowIndex, colMap] or throws if headers not found.
 */
function findHeaders(
  sheet: XLSX.WorkSheet,
  range: XLSX.Range,
): [number, Map<number, keyof RentRollRow>] {
  for (let r = range.s.r; r <= range.e.r; r++) {
    const cellA = sheet[XLSX.utils.encode_cell({ r, c: range.s.c })];
    const valA = cellA ? String(cellA.v).trim().toLowerCase() : '';
    if (valA !== 'unit') continue;

    // Found the header row — map every column
    const colMap = new Map<number, keyof RentRollRow>();
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      const label = String(cell.v).trim().toLowerCase();
      const key = HEADER_MAP[label];
      if (key) colMap.set(c, key);
    }
    return [r, colMap];
  }
  throw new Error('Could not find rent roll header row (no "Unit" column found)');
}

// ── parseRentRoll ────────────────────────────────────────────────────────────

export async function parseRentRoll(file: File): Promise<RentRollRow[]> {
  const buf = await readFile(file);
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  const ref = sheet['!ref'];
  if (!ref) throw new Error('Rent roll sheet is empty');
  const range = XLSX.utils.decode_range(ref);

  const [headerRow, colMap] = findHeaders(sheet, range);

  const rows: RentRollRow[] = [];

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    // Read raw values keyed by field name
    const raw: Record<string, unknown> = {};
    for (const [c, key] of colMap) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      raw[key] = cell ? cell.v : null;
    }

    // Skip empty unit rows
    const unitVal = raw.unit != null ? String(raw.unit).trim() : '';
    if (!unitVal) continue;

    // Skip totals / summary rows (e.g. "144 Units", "93.1% Occupied")
    if (/units/i.test(unitVal) || /occupied/i.test(unitVal)) continue;

    // Skip property name / address divider rows (no BD/BA value)
    const bdBaRaw = raw.bdBa != null ? String(raw.bdBa).trim() : '';
    if (!bdBaRaw) continue;

    const row: RentRollRow = {
      unit: unitVal,
      unitType: raw.unitType != null ? String(raw.unitType).trim() : '',
      bdBa: normalizeBdBa(bdBaRaw),
      status: raw.status != null ? String(raw.status).trim() : '',
      sqft: toNum(raw.sqft),
      marketRent: toNum(raw.marketRent),
      rent: toNum(raw.rent),
      leaseFrom: toDateStr(raw.leaseFrom),
      leaseTo: toDateStr(raw.leaseTo),
      moveIn: toDateStr(raw.moveIn),
    };

    rows.push(row);
  }

  return rows;
}

// ── summarizeRentRoll ────────────────────────────────────────────────────────

export function summarizeRentRoll(
  rows: RentRollRow[],
  recentCutoff: number = 3,
): RentRollSummary {
  const now = new Date();

  // Group rows by bdBa type
  const groups = new Map<
    string,
    { rents: number[]; moveIns: Date[]; rows: RentRollRow[] }
  >();

  for (const row of rows) {
    const type = row.bdBa || 'Unknown';
    if (!groups.has(type)) {
      groups.set(type, { rents: [], moveIns: [], rows: [] });
    }
    const g = groups.get(type)!;
    g.rows.push(row);

    // Only include rows with actual rent for stats
    if (row.rent != null) {
      g.rents.push(row.rent);
    }

    if (row.moveIn) {
      const d = new Date(row.moveIn);
      if (!isNaN(d.getTime())) g.moveIns.push(d);
    }
  }

  const byType = Array.from(groups.entries()).map(([type, g]) => {
    const count = g.rents.length;
    const avgRent = count > 0 ? g.rents.reduce((a, b) => a + b, 0) / count : 0;
    const low = count > 0 ? Math.min(...g.rents) : 0;
    const high = count > 0 ? Math.max(...g.rents) : 0;

    // Average move-in date
    let avgMoveInDate = '';
    let avgTenureMonths = 0;
    if (g.moveIns.length > 0) {
      const avgMs =
        g.moveIns.reduce((sum, d) => sum + d.getTime(), 0) / g.moveIns.length;
      const avgDate = new Date(avgMs);
      avgMoveInDate = avgDate.toISOString().slice(0, 10);

      // Average tenure in months from move-in to today
      const tenures = g.moveIns.map((d) => {
        const diffMs = now.getTime() - d.getTime();
        return diffMs / (1000 * 60 * 60 * 24 * 30.4375); // approximate months
      });
      avgTenureMonths = Math.round(
        tenures.reduce((a, b) => a + b, 0) / tenures.length,
      );
    }

    return {
      type,
      count,
      avgRent: Math.round(avgRent),
      low,
      high,
      avgMoveInDate,
      avgTenureMonths,
    };
  });

  // Recent: N most recent move-ins across all rows (by move-in date desc)
  const withMoveIn = rows
    .filter((r) => r.moveIn != null)
    .sort((a, b) => {
      const da = new Date(a.moveIn!).getTime();
      const db = new Date(b.moveIn!).getTime();
      return db - da; // descending
    });

  const recent = withMoveIn.slice(0, recentCutoff);

  return { byType, recentCutoff, recent };
}
