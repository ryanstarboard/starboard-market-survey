import * as XLSX from "xlsx";
import type {
  Property,
  SubjectProperty,
  Comp,
  RentRollSummary,
  FloorPlan,
} from "./types";

/* ── Constants ─────────────────────────────────────────────────────────────── */

const MAX_COMPS = 6;
const FILL_SECTION_HEADER = { patternType: "solid", fgColor: { rgb: "E2E8F0" } };
const FILL_ALT_ROW = { patternType: "solid", fgColor: { rgb: "F8FAFC" } };
const FONT_BOLD = { bold: true };
const FONT_HEADER = { bold: true, sz: 13 };
const FONT_SECTION = { bold: true, sz: 11 };
const FMT_CURRENCY = "$#,##0";
const FMT_PCT = "0%";
const FMT_PSF = "$#,##0.00";
const LABEL_COL_WIDTH = 20;
const VALUE_COL_WIDTH = 15;

/* ── Helpers ───────────────────────────────────────────────────────────────── */

/** Convert a percentage value to Excel-friendly 0-1 range. */
function normPct(v: number | null | undefined): number | null {
  if (v == null) return null;
  // If > 1, assume it's already 0-100 scale (e.g., 95 means 95%)
  if (v > 1) return v / 100;
  return v;
}

function yn(v: boolean | null | undefined): string {
  if (v == null) return "";
  return v ? "Yes" : "No";
}

function ynWithAmount(flag: boolean | null | undefined, amount: number | null | undefined): string {
  if (flag == null) return "";
  if (!flag) return "No";
  if (amount != null) return `Yes ($${amount})`;
  return "Yes";
}

/** Collect all unique floor plan types across subject + comps. */
function collectFloorPlanTypes(
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
): string[] {
  const set = new Set<string>();
  if (subjectProperty) {
    for (const fp of subjectProperty.floorPlans) set.add(fp.type);
  }
  for (const c of comps) {
    for (const fp of c.floorPlans) set.add(fp.type);
  }
  return Array.from(set).sort();
}

function findPlan(plans: FloorPlan[], type: string): FloorPlan | undefined {
  return plans.find((p) => p.type === type);
}

function computeOverallLeasedPct(rr: RentRollSummary): number | null {
  if (!rr.byType.length) return null;
  const totalCount = rr.byType.reduce((s, t) => s + t.count, 0);
  if (totalCount === 0) return null;
  const weightedSum = rr.byType.reduce((s, t) => s + t.leasedPct * t.count, 0);
  return weightedSum / totalCount;
}

/** Convert column/row to Excel cell address. */
function cellAddr(r: number, c: number): string {
  return XLSX.utils.encode_cell({ r, c });
}

/** Apply a number format to a cell, creating it if needed. */
function setCellFmt(ws: XLSX.WorkSheet, r: number, c: number, fmt: string): void {
  const addr = cellAddr(r, c);
  if (ws[addr]) {
    ws[addr].z = fmt;
  }
}

/** Apply style properties to a cell. */
function setCellStyle(
  ws: XLSX.WorkSheet,
  r: number,
  c: number,
  style: Record<string, unknown>,
): void {
  const addr = cellAddr(r, c);
  if (ws[addr]) {
    ws[addr].s = { ...(ws[addr].s || {}), ...style };
  }
}

/** Merge cells in worksheet. */
function addMerge(ws: XLSX.WorkSheet, sr: number, sc: number, er: number, ec: number): void {
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });
}

/** Apply section header styling to a row span. */
function styleSectionHeader(ws: XLSX.WorkSheet, row: number, startCol: number, endCol: number): void {
  for (let c = startCol; c <= endCol; c++) {
    const addr = cellAddr(row, c);
    if (!ws[addr]) ws[addr] = { v: "", t: "s" };
    ws[addr].s = {
      ...(ws[addr].s || {}),
      fill: FILL_SECTION_HEADER,
      font: FONT_SECTION,
    };
  }
}

/** Apply alternating row shading. */
function styleAltRow(ws: XLSX.WorkSheet, row: number, startCol: number, endCol: number): void {
  for (let c = startCol; c <= endCol; c++) {
    const addr = cellAddr(row, c);
    if (!ws[addr]) ws[addr] = { v: "", t: "s" };
    ws[addr].s = {
      ...(ws[addr].s || {}),
      fill: FILL_ALT_ROW,
    };
  }
}

/* ── SHEET 1: Market Survey ────────────────────────────────────────────────── */

function buildMarketSurveySheet(
  property: Property,
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
  preparedBy: string,
  surveyDate: string,
  comments: string,
): XLSX.WorkSheet {
  const numComps = comps.length;
  // Total columns: 1 (label) + 1 (subject) + numComps
  const totalCols = 2 + numComps;
  const lastCol = totalCols - 1;

  const data: (string | number | null)[][] = [];
  const currencyCells: [number, number][] = [];
  const pctCells: [number, number][] = [];
  const psfCells: [number, number][] = [];
  const sectionHeaderRows: number[] = [];
  const wrapCells: [number, number][] = [];

  // Track the current row as we build
  let rowIdx = 0;

  // Helper: push a data row and return the row index it was placed at
  function pushRow(row: (string | number | null)[]): number {
    data.push(row);
    return rowIdx++;
  }

  // Helper: push a property info row with label, subject val, and comp vals
  function propRow(
    label: string,
    subjectVal: string | number | null,
    getCompVal: (c: Comp) => string | number | null,
  ): number {
    const row: (string | number | null)[] = [label, subjectVal];
    for (const c of comps) row.push(getCompVal(c));
    return pushRow(row);
  }

  // ── Header section ──

  // Row 0: MARKET SURVEY title + preparedBy + surveyDate
  const headerRow: (string | number | null)[] = ["MARKET SURVEY"];
  // Fill remaining cols
  for (let i = 1; i < totalCols; i++) headerRow.push(null);
  // Put preparedBy and surveyDate in last two columns if space
  if (totalCols >= 3) {
    headerRow[totalCols - 2] = `Prepared by: ${preparedBy}`;
    headerRow[totalCols - 1] = `Date: ${surveyDate}`;
  }
  pushRow(headerRow);

  // Row 1: blank
  pushRow([]);

  // Row 2: Column headers
  const colHeaders: (string | number | null)[] = [""];
  colHeaders.push("SUBJECT");
  comps.forEach((_, i) => colHeaders.push(`COMP ${i + 1}`));
  pushRow(colHeaders);

  // ── Property Info section ──

  const infoStartRow = rowIdx;

  // Property Name
  const nameR = propRow("Property Name", property.name, (c) => c.name);

  // Address
  propRow("Address", property.address, (c) => c.address);

  // City, State
  propRow("City, State", property.city, (c) => c.cityState);

  // Distance from Subject
  propRow("Distance from Subject", null, (c) => c.distanceFromSubject || null);

  // Phone
  propRow("Phone", null, (c) => c.phone || null);

  // Total Units
  propRow("Total Units", property.totalUnits, (c) => c.totalUnits);

  // Year Built
  propRow("Year Built", subjectProperty?.yearBuilt ?? null, (c) => c.yearBuilt ?? null);

  // Leased %
  const subjectLeased = normPct(subjectProperty?.leasedPct ?? (rentRoll ? computeOverallLeasedPct(rentRoll) : null));
  const leasedR = propRow("Leased %", subjectLeased, (c) => normPct(c.leasedPct));
  // Mark percentage cells
  for (let col = 1; col < totalCols; col++) pctCells.push([leasedR, col]);

  // Occupancy %
  const occR = propRow("Occupancy %", normPct(subjectProperty?.occupancyPct ?? null), (c) => normPct(c.occupancyPct));
  for (let col = 1; col < totalCols; col++) pctCells.push([occR, col]);

  // Application Fee
  const appFeeR = propRow("Application Fee", subjectProperty?.applicationFee ?? null, (c) => c.applicationFee);
  for (let col = 1; col < totalCols; col++) currencyCells.push([appFeeR, col]);

  // Admin Fee
  const adminFeeR = propRow("Admin Fee", subjectProperty?.adminFee ?? null, (c) => c.adminFee);
  for (let col = 1; col < totalCols; col++) currencyCells.push([adminFeeR, col]);

  // Security Deposit
  const secDepR = propRow("Security Deposit", subjectProperty?.securityDeposit ?? null, (c) => c.securityDeposit);
  for (let col = 1; col < totalCols; col++) currencyCells.push([secDepR, col]);

  // MTM Fee
  const mtmR = propRow("MTM Fee", subjectProperty?.mtmFee ?? null, (c) => c.mtmFee);
  for (let col = 1; col < totalCols; col++) currencyCells.push([mtmR, col]);

  // Lease Terms
  propRow("Lease Terms", subjectProperty?.leaseTerms ?? null, (c) => c.leaseTerms || null);

  // Utilities Included
  propRow("Utilities Included", subjectProperty?.utilitiesIncluded ?? null, (c) => c.utilitiesIncluded || null);

  // ── Blank separator ──
  pushRow([]);

  // ── Pets section ──
  const petsSectionRow: (string | number | null)[] = ["PETS"];
  for (let i = 1; i < totalCols; i++) petsSectionRow.push(null);
  const petsR = pushRow(petsSectionRow);
  sectionHeaderRows.push(petsR);

  propRow("Pet Limit", subjectProperty?.petLimit ?? null, (c) => c.petLimit || null);

  const petDepR = propRow("Pet Deposit", subjectProperty?.petDeposit ?? null, (c) => c.petDeposit);
  for (let col = 1; col < totalCols; col++) currencyCells.push([petDepR, col]);

  const petRentR = propRow("Pet Rent", subjectProperty?.petRent ?? null, (c) => c.petRent);
  for (let col = 1; col < totalCols; col++) currencyCells.push([petRentR, col]);

  const petFeeR = propRow("Pet Fee", subjectProperty?.petFee ?? null, (c) => c.petFee);
  for (let col = 1; col < totalCols; col++) currencyCells.push([petFeeR, col]);

  const petRulesR = propRow("Pet Rules", subjectProperty?.petRules ?? null, (c) => c.petRules || null);
  for (let col = 1; col < totalCols; col++) wrapCells.push([petRulesR, col]);

  // ── Blank separator ──
  pushRow([]);

  // ── Condition section ──
  const condSectionRow: (string | number | null)[] = ["CONDITION"];
  for (let i = 1; i < totalCols; i++) condSectionRow.push(null);
  const condR = pushRow(condSectionRow);
  sectionHeaderRows.push(condR);

  propRow("Renovated?", yn(subjectProperty?.renovated), (c) => yn(c.renovated));
  propRow("Reno Date", subjectProperty?.renoDate ?? null, (c) => c.renoDate ?? null);
  const concR = propRow("Concessions", subjectProperty?.concessions ?? null, (c) => c.concessions || null);
  for (let col = 1; col < totalCols; col++) wrapCells.push([concR, col]);

  // ── Blank separator ──
  pushRow([]);

  // ── Other section ──
  const otherSectionRow: (string | number | null)[] = ["OTHER"];
  for (let i = 1; i < totalCols; i++) otherSectionRow.push(null);
  const otherR = pushRow(otherSectionRow);
  sectionHeaderRows.push(otherR);

  propRow(
    "Resident Referrals",
    ynWithAmount(subjectProperty?.residentReferrals, subjectProperty?.referralAmount),
    (c) => ynWithAmount(c.residentReferrals, c.referralAmount),
  );

  const notesR = propRow("Other Notes", subjectProperty?.otherNotes ?? null, (c) => c.otherNotes || null);
  for (let col = 1; col < totalCols; col++) wrapCells.push([notesR, col]);

  // Comments row (if any)
  if (comments) {
    const commR = propRow("Survey Comments", comments, () => null);
    for (let col = 1; col < totalCols; col++) wrapCells.push([commR, col]);
  }

  // ── Blank separator ──
  pushRow([]);

  // ── Called / Toured ──
  const ctSectionRow: (string | number | null)[] = ["SURVEY STATUS"];
  for (let i = 1; i < totalCols; i++) ctSectionRow.push(null);
  const ctR = pushRow(ctSectionRow);
  sectionHeaderRows.push(ctR);

  propRow("Called", null, (c) => yn(c.called));
  propRow("Toured", null, (c) => yn(c.toured));

  // ── Blank separator ──
  pushRow([]);

  // ── Floor Plans section ──
  const fpSectionRow: (string | number | null)[] = ["FLOOR PLANS"];
  for (let i = 1; i < totalCols; i++) fpSectionRow.push(null);
  const fpR = pushRow(fpSectionRow);
  sectionHeaderRows.push(fpR);

  // Sub-header row: for each property column, we need Type | SF | # Units | Leased % | Rent | PSF
  // But since we only have 1 column per property, we'll put multiple sub-rows
  // Actually, we need 6 sub-columns per property group.
  // Let's restructure: label col + per-property we need 6 data columns.
  // But the spec says "Sub-header row: Type | SF | # Units | Leased % | Rent | PSF — repeated for subject and each comp"
  // This means each property gets 6 columns in the floor plan section.

  // For the floor plans, we'll use a wider layout:
  // Col 0: blank (unit type label)
  // Then for subject: SF | # Units | Leased % | Rent | PSF (5 cols)
  // Then for each comp: SF | # Units | Leased % | Rent | PSF (5 cols)
  // Total floor plan cols: 1 + 5 * (1 + numComps)

  const fpSubCols = 5; // SF, # Units, Leased %, Rent, PSF
  const fpTotalCols = 1 + fpSubCols * (1 + numComps);

  // Floor plan sub-header
  const fpSubHeader: (string | number | null)[] = ["Unit Type"];
  const fpPropNames = ["SUBJECT", ...comps.map((_, i) => `COMP ${i + 1}`)];
  for (const _name of fpPropNames) {
    fpSubHeader.push("SF", "# Units", "Leased %", "Rent", "PSF");
  }
  const fpSubHeaderR = pushRow(fpSubHeader);

  // Property name row above sub-headers would be nice but let's add it
  // Actually, let's merge cells for each property name in the sub-header row
  // We'll handle this with merges after building the sheet

  const fpTypes = collectFloorPlanTypes(subjectProperty, comps);

  const fpDataStartRow = rowIdx;
  for (const fpType of fpTypes) {
    const fpRow: (string | number | null)[] = [fpType];

    // Subject floor plan
    const subjPlan = subjectProperty ? findPlan(subjectProperty.floorPlans, fpType) : undefined;
    fpRow.push(
      subjPlan?.sqft ?? null,
      subjPlan?.unitCount ?? null,
      normPct(subjPlan?.leasedPct ?? null),
      subjPlan?.rent ?? null,
      null, // PSF — will be set as formula
    );

    // Comp floor plans
    for (const c of comps) {
      const plan = findPlan(c.floorPlans, fpType);
      fpRow.push(
        plan?.sqft ?? null,
        plan?.unitCount ?? null,
        normPct(plan?.leasedPct ?? null),
        plan?.rent ?? null,
        null, // PSF — will be set as formula
      );
    }

    const r = pushRow(fpRow);

    // Track cells for formatting
    const propCount = 1 + numComps;
    for (let p = 0; p < propCount; p++) {
      const baseCol = 1 + p * fpSubCols;
      // Leased % col
      pctCells.push([r, baseCol + 2]);
      // Rent col
      currencyCells.push([r, baseCol + 3]);
      // PSF col
      psfCells.push([r, baseCol + 4]);
    }
  }

  // ── Build the worksheet ──
  const ws = XLSX.utils.aoa_to_sheet(data);

  // ── Set PSF formulas: =IFERROR(Rent/SF,"") ──
  for (const fpType of fpTypes) {
    const fpRowOffset = fpDataStartRow + fpTypes.indexOf(fpType);
    const propCount = 1 + numComps;
    for (let p = 0; p < propCount; p++) {
      const baseCol = 1 + p * fpSubCols;
      const sfAddr = cellAddr(fpRowOffset, baseCol);       // SF column
      const rentAddr = cellAddr(fpRowOffset, baseCol + 3);  // Rent column
      const psfAddr = cellAddr(fpRowOffset, baseCol + 4);   // PSF column

      // Use Excel cell references (letters)
      const sfRef = XLSX.utils.encode_cell({ r: fpRowOffset, c: baseCol });
      const rentRef = XLSX.utils.encode_cell({ r: fpRowOffset, c: baseCol + 3 });

      ws[psfAddr] = {
        t: "n",
        f: `IFERROR(${rentRef}/${sfRef},"")`,
        z: FMT_PSF,
      };
    }
  }

  // ── Apply number formats ──
  for (const [r, c] of currencyCells) setCellFmt(ws, r, c, FMT_CURRENCY);
  for (const [r, c] of pctCells) setCellFmt(ws, r, c, FMT_PCT);
  for (const [r, c] of psfCells) setCellFmt(ws, r, c, FMT_PSF);

  // ── Apply styles ──

  // Title row
  const titleAddr = cellAddr(0, 0);
  if (ws[titleAddr]) ws[titleAddr].s = { font: FONT_HEADER };

  // Column header row (row 2) — bold
  for (let c = 0; c < totalCols; c++) {
    const addr = cellAddr(2, c);
    if (ws[addr]) ws[addr].s = { font: FONT_BOLD, fill: FILL_SECTION_HEADER };
  }

  // Property name row — bold
  for (let c = 0; c < totalCols; c++) {
    const addr = cellAddr(nameR, c);
    if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), font: FONT_BOLD };
  }

  // Section headers
  for (const r of sectionHeaderRows) {
    styleSectionHeader(ws, r, 0, Math.max(lastCol, fpTotalCols - 1));
  }

  // Floor plan sub-header row
  for (let c = 0; c < fpTotalCols; c++) {
    const addr = cellAddr(fpSubHeaderR, c);
    if (!ws[addr]) ws[addr] = { v: "", t: "s" };
    ws[addr].s = { font: FONT_BOLD, fill: FILL_SECTION_HEADER };
  }

  // Alternating rows in property info section
  for (let r = infoStartRow; r < infoStartRow + 14; r++) {
    if ((r - infoStartRow) % 2 === 1) {
      styleAltRow(ws, r, 0, lastCol);
    }
  }

  // Alternating rows in floor plan section
  for (let i = 0; i < fpTypes.length; i++) {
    if (i % 2 === 1) {
      styleAltRow(ws, fpDataStartRow + i, 0, fpTotalCols - 1);
    }
  }

  // Wrap text on notes/concessions
  for (const [r, c] of wrapCells) {
    const addr = cellAddr(r, c);
    if (ws[addr]) {
      ws[addr].s = { ...(ws[addr].s || {}), alignment: { wrapText: true } };
    }
  }

  // ── Column widths ──
  const maxCols = Math.max(totalCols, fpTotalCols);
  const colWidths: XLSX.ColInfo[] = [];
  colWidths.push({ wch: LABEL_COL_WIDTH }); // col 0 — label
  for (let i = 1; i < maxCols; i++) {
    colWidths.push({ wch: VALUE_COL_WIDTH });
  }
  ws["!cols"] = colWidths;

  // ── Merges ──
  // Merge title across top
  addMerge(ws, 0, 0, 0, Math.min(totalCols - 3, lastCol));

  // Merge section header labels across all columns
  for (const r of sectionHeaderRows) {
    addMerge(ws, r, 0, r, Math.max(lastCol, fpTotalCols - 1));
  }

  // Floor plan header: merge property names across their sub-columns
  // We'll add a property name row above the sub-header if there's room
  // Actually, let's keep it simple — the sub-header row has the column labels

  // ── Freeze panes: freeze row 3 (below col headers) and col A ──
  ws["!freeze"] = { xSplit: 1, ySplit: 3 };
  // SheetJS uses "!freeze" or the views array
  if (!ws["!views"]) ws["!views"] = [];
  // Workaround: use the pane property via the views
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)["!freeze"] = undefined;
  // Proper way for SheetJS Community Edition:
  // Set via !freeze or sheet_set_range_style — but Community Edition has limited support.
  // We'll set it directly:
  ws["!panes"] = { freeze: true, split: [1, 3] };

  return ws;
}

/* ── SHEET 2: Executive Summary ────────────────────────────────────────────── */

function buildExecutiveSummarySheet(
  property: Property,
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
  preparedBy: string,
  surveyDate: string,
): XLSX.WorkSheet {
  const data: (string | number | null)[][] = [];
  const currencyCells: [number, number][] = [];
  const pctCells: [number, number][] = [];
  const psfCells: [number, number][] = [];
  const sectionHeaderRows: number[] = [];

  let rowIdx = 0;

  function pushRow(row: (string | number | null)[]): number {
    data.push(row);
    return rowIdx++;
  }

  // ── Header ──
  pushRow(["MARKET SURVEY — EXECUTIVE SUMMARY"]);
  pushRow([property.name, null, `Date: ${surveyDate}`, null, `Prepared By: ${preparedBy}`]);
  pushRow([property.address, null, property.city]);
  pushRow([]); // blank

  // ── Market Position ──
  const mpR = pushRow(["MARKET POSITION"]);
  sectionHeaderRows.push(mpR);

  // Compute subject average rent and market average rent
  const subjectPlans = subjectProperty?.floorPlans ?? [];
  const subjectAvgRent = computeAvgRent(subjectPlans);
  const allCompPlans = comps.flatMap((c) => c.floorPlans);
  const marketAvgRent = computeAvgRent(allCompPlans);

  const rentDiff = (subjectAvgRent != null && marketAvgRent != null) ? subjectAvgRent - marketAvgRent : null;
  const rentDiffPct = (subjectAvgRent != null && marketAvgRent != null && marketAvgRent !== 0)
    ? (subjectAvgRent - marketAvgRent) / marketAvgRent
    : null;

  pushRow(["", "Subject Avg Rent", "Market Avg Rent", "Difference ($)", "Difference (%)"]);
  const mpDataR = pushRow([
    "",
    subjectAvgRent,
    marketAvgRent,
    rentDiff,
    rentDiffPct,
  ]);
  currencyCells.push([mpDataR, 1], [mpDataR, 2], [mpDataR, 3]);
  pctCells.push([mpDataR, 4]);

  pushRow([]); // blank

  // ── Rent Comparison Table ──
  const rcR = pushRow(["RENT COMPARISON BY UNIT TYPE"]);
  sectionHeaderRows.push(rcR);

  pushRow([
    "Unit Type",
    "Subject Rent",
    "Subject SF",
    "Subject PSF",
    "Market Avg Rent",
    "Market Low",
    "Market High",
    "Market Avg PSF",
    "Variance ($)",
    "Variance (%)",
  ]);

  const fpTypes = collectFloorPlanTypes(subjectProperty, comps);
  for (const fpType of fpTypes) {
    const subjPlan = subjectProperty ? findPlan(subjectProperty.floorPlans, fpType) : undefined;
    const compPlansOfType = comps
      .map((c) => findPlan(c.floorPlans, fpType))
      .filter((p): p is FloorPlan => p != null);

    const compRents = compPlansOfType.map((p) => p.rent).filter((r): r is number => r != null);
    const compSfs = compPlansOfType.map((p) => p.sqft).filter((s): s is number => s != null);

    const mktAvgRent = compRents.length > 0 ? compRents.reduce((a, b) => a + b, 0) / compRents.length : null;
    const mktLow = compRents.length > 0 ? Math.min(...compRents) : null;
    const mktHigh = compRents.length > 0 ? Math.max(...compRents) : null;
    const mktAvgSf = compSfs.length > 0 ? compSfs.reduce((a, b) => a + b, 0) / compSfs.length : null;
    const mktAvgPsf = (mktAvgRent != null && mktAvgSf != null && mktAvgSf > 0) ? mktAvgRent / mktAvgSf : null;

    const subjRent = subjPlan?.rent ?? null;
    const subjSf = subjPlan?.sqft ?? null;
    const subjPsf = (subjRent != null && subjSf != null && subjSf > 0) ? subjRent / subjSf : null;

    const variance = (subjRent != null && mktAvgRent != null) ? subjRent - mktAvgRent : null;
    const variancePct = (subjRent != null && mktAvgRent != null && mktAvgRent !== 0)
      ? (subjRent - mktAvgRent) / mktAvgRent
      : null;

    const r = pushRow([
      fpType,
      subjRent,
      subjSf,
      subjPsf,
      mktAvgRent,
      mktLow,
      mktHigh,
      mktAvgPsf,
      variance,
      variancePct,
    ]);

    currencyCells.push([r, 1], [r, 4], [r, 5], [r, 6], [r, 8]);
    psfCells.push([r, 3], [r, 7]);
    pctCells.push([r, 9]);
    // Variance $ — currency
    currencyCells.push([r, 8]);
    // Fix: col 8 is Variance ($), col 9 is Variance (%)
    // Let me re-index:
    // 0=Type, 1=SubjRent, 2=SubjSF, 3=SubjPSF, 4=MktAvgRent, 5=MktLow, 6=MktHigh, 7=MktAvgPSF, 8=Var$, 9=Var%
  }
  // Fix the formatting lists — clear and redo properly
  // Actually the push calls above have some duplicates. Let me just leave them — duplicates are harmless.

  pushRow([]); // blank

  // ── Fee Comparison ──
  const feeR = pushRow(["FEE COMPARISON"]);
  sectionHeaderRows.push(feeR);

  pushRow(["Fee Type", "Subject", "Market Avg", "Market Low", "Market High"]);

  const feeTypes: { label: string; getSubject: () => number | null; getComp: (c: Comp) => number | null }[] = [
    { label: "Application Fee", getSubject: () => subjectProperty?.applicationFee ?? null, getComp: (c) => c.applicationFee },
    { label: "Admin Fee", getSubject: () => subjectProperty?.adminFee ?? null, getComp: (c) => c.adminFee },
    { label: "Security Deposit", getSubject: () => subjectProperty?.securityDeposit ?? null, getComp: (c) => c.securityDeposit },
    { label: "MTM Fee", getSubject: () => subjectProperty?.mtmFee ?? null, getComp: (c) => c.mtmFee },
    { label: "Pet Deposit", getSubject: () => subjectProperty?.petDeposit ?? null, getComp: (c) => c.petDeposit },
    { label: "Pet Rent", getSubject: () => subjectProperty?.petRent ?? null, getComp: (c) => c.petRent },
  ];

  for (const fee of feeTypes) {
    const compVals = comps.map((c) => fee.getComp(c)).filter((v): v is number => v != null);
    const avg = compVals.length > 0 ? compVals.reduce((a, b) => a + b, 0) / compVals.length : null;
    const low = compVals.length > 0 ? Math.min(...compVals) : null;
    const high = compVals.length > 0 ? Math.max(...compVals) : null;

    const r = pushRow([fee.label, fee.getSubject(), avg, low, high]);
    for (let c = 1; c <= 4; c++) currencyCells.push([r, c]);
  }

  pushRow([]); // blank

  // ── Amenity Summary ──
  const amR = pushRow(["AMENITY SUMMARY"]);
  sectionHeaderRows.push(amR);

  const subjCommunity = subjectProperty?.communityAmenities ?? [];
  const subjUnit = subjectProperty?.unitAmenities ?? [];

  pushRow(["Community Amenities", subjCommunity.join(", ") || null]);
  pushRow(["In-Unit Amenities", subjUnit.join(", ") || null]);

  pushRow([]); // blank

  // ── Concessions Summary ──
  const conR = pushRow(["CONCESSIONS SUMMARY"]);
  sectionHeaderRows.push(conR);

  pushRow(["Property", "Concessions", "Notes"]);
  pushRow([property.name, subjectProperty?.concessions || null, subjectProperty?.otherNotes || null]);
  for (const c of comps) {
    pushRow([c.name, c.concessions || null, c.otherNotes || null]);
  }

  pushRow([]); // blank

  // ── Survey Details ──
  const sdR = pushRow(["SURVEY DETAILS"]);
  sectionHeaderRows.push(sdR);

  pushRow(["Number of Comps Analyzed", comps.length]);
  pushRow(["Comps Called", comps.filter((c) => c.called).length]);
  pushRow(["Comps Toured", comps.filter((c) => c.toured).length]);
  pushRow(["Prepared By", preparedBy]);
  pushRow(["Survey Date", surveyDate]);

  // ── Build worksheet ──
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Apply formats
  for (const [r, c] of currencyCells) setCellFmt(ws, r, c, FMT_CURRENCY);
  for (const [r, c] of pctCells) setCellFmt(ws, r, c, FMT_PCT);
  for (const [r, c] of psfCells) setCellFmt(ws, r, c, FMT_PSF);

  // Title style
  const titleAddr = cellAddr(0, 0);
  if (ws[titleAddr]) ws[titleAddr].s = { font: FONT_HEADER };

  // Section headers
  for (const r of sectionHeaderRows) {
    styleSectionHeader(ws, r, 0, 9);
    addMerge(ws, r, 0, r, 9);
  }

  // Column widths
  ws["!cols"] = [
    { wch: 20 }, // A
    { wch: 15 }, // B
    { wch: 15 }, // C
    { wch: 15 }, // D
    { wch: 15 }, // E
    { wch: 15 }, // F
    { wch: 15 }, // G
    { wch: 15 }, // H
    { wch: 15 }, // I
    { wch: 15 }, // J
  ];

  return ws;
}

/** Compute weighted average rent across floor plans. */
function computeAvgRent(plans: FloorPlan[]): number | null {
  const withRent = plans.filter((p) => p.rent != null);
  if (withRent.length === 0) return null;

  // Weight by unit count if available
  const hasUnitCount = withRent.some((p) => p.unitCount != null && p.unitCount > 0);
  if (hasUnitCount) {
    let totalUnits = 0;
    let weightedRent = 0;
    for (const p of withRent) {
      const count = p.unitCount ?? 1;
      totalUnits += count;
      weightedRent += (p.rent ?? 0) * count;
    }
    return totalUnits > 0 ? weightedRent / totalUnits : null;
  }

  // Simple average
  const sum = withRent.reduce((s, p) => s + (p.rent ?? 0), 0);
  return sum / withRent.length;
}

/* ── Main export function ───────────────────────────────────────────────────── */

export function exportToExcel(
  property: Property,
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
  preparedBy: string,
  surveyDate: string,
  comments: string,
): void {
  // Filter to non-excluded comps only, max 6
  const activeComps = comps.filter((c) => !c.excluded).slice(0, MAX_COMPS);

  const wb = XLSX.utils.book_new();

  // Sheet 1: Market Survey (main detail)
  const surveyWs = buildMarketSurveySheet(
    property, subjectProperty, activeComps, rentRoll, preparedBy, surveyDate, comments,
  );
  XLSX.utils.book_append_sheet(wb, surveyWs, "Market Survey");

  // Sheet 2: Executive Summary
  const summaryWs = buildExecutiveSummarySheet(
    property, subjectProperty, activeComps, rentRoll, preparedBy, surveyDate,
  );
  XLSX.utils.book_append_sheet(wb, summaryWs, "Executive Summary");

  // Generate filename
  const datePart = new Date().toISOString().slice(0, 10);
  const safeName = property.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
  const filename = `Market_Survey_${safeName}_${datePart}.xlsx`;

  XLSX.writeFile(wb, filename);
}
