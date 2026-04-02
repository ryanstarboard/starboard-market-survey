import { Document, Page, Text, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import type {
  Property,
  SubjectProperty,
  Comp,
  RentRollSummary,
  FloorPlan,
} from "./types";

/* ── shorthand ────────────────────────────────────────────────────────────── */
const el = createElement;

/* ── colors ───────────────────────────────────────────────────────────────── */
const NAVY = "#1e3a5f";
const BLUE = "#2563eb";
const POS = "#059669";
const NEG = "#dc2626";
const WHITE = "#ffffff";
const ROW_ALT = "#f8fafc";
const GRAY = "#94a3b8";
const BORDER = "#cbd5e1";

/* ── helpers ──────────────────────────────────────────────────────────────── */

function normPct(v: number | null | undefined): number | null {
  if (v == null) return null;
  return v > 1 ? v / 100 : v;
}

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return "$" + Math.round(v).toLocaleString("en-US");
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  const n = normPct(v);
  if (n == null) return "—";
  return (n * 100).toFixed(1) + "%";
}

function fmtDiff(v: number | null | undefined): string {
  if (v == null) return "—";
  const r = Math.round(v);
  const prefix = r > 0 ? "+" : "";
  return prefix + "$" + r.toLocaleString("en-US");
}

function fmtDiffPct(v: number | null | undefined): string {
  if (v == null) return "—";
  const prefix = v > 0 ? "+" : "";
  return prefix + v.toFixed(1) + "%";
}

function diffColor(v: number | null | undefined): string {
  if (v == null) return NAVY;
  return v >= 0 ? POS : NEG;
}

/** Truncate text to maxLen chars, appending "..." if truncated */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

/** Get non-excluded comps */
function activeComps(comps: Comp[]): Comp[] {
  return comps.filter((c) => !c.excluded);
}

/** Collect all unique floor plan types across subject + comps. */
function collectFloorPlanTypes(
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
): string[] {
  const set = new Set<string>();
  if (subjectProperty) {
    for (const fp of subjectProperty.floorPlans) set.add(fp.type);
  }
  if (rentRoll) {
    for (const t of rentRoll.byType) set.add(t.type);
  }
  for (const c of comps) {
    for (const fp of c.floorPlans) set.add(fp.type);
  }
  return Array.from(set).sort();
}

function findPlan(plans: FloorPlan[], type: string): FloorPlan | undefined {
  return plans.find((p) => p.type === type);
}

/** Compute market averages for a given unit type across active comps */
function marketStats(comps: Comp[], unitType: string) {
  const plans = comps
    .map((c) => findPlan(c.floorPlans, unitType))
    .filter((p): p is FloorPlan => p != null && p.rent != null);
  if (plans.length === 0) return { avg: null, low: null, high: null, avgPsf: null };
  const rents = plans.map((p) => p.rent!);
  const avg = rents.reduce((a, b) => a + b, 0) / rents.length;
  const low = Math.min(...rents);
  const high = Math.max(...rents);
  const psfPlans = plans.filter((p) => p.psf != null);
  const avgPsf =
    psfPlans.length > 0
      ? psfPlans.reduce((a, b) => a + b.psf!, 0) / psfPlans.length
      : null;
  return { avg, low, high, avgPsf };
}

/** Compute overall average rent from subject floor plans or rent roll */
function subjectAvgRent(
  subjectProperty: SubjectProperty | null,
  rentRoll: RentRollSummary | null,
): number | null {
  // Prefer rent roll data
  if (rentRoll && rentRoll.byType.length > 0) {
    const total = rentRoll.byType.reduce((s, t) => s + t.avgRent * t.count, 0);
    const count = rentRoll.byType.reduce((s, t) => s + t.count, 0);
    return count > 0 ? total / count : null;
  }
  if (subjectProperty && subjectProperty.floorPlans.length > 0) {
    const plans = subjectProperty.floorPlans.filter((p) => p.rent != null);
    if (plans.length === 0) return null;
    return plans.reduce((s, p) => s + p.rent!, 0) / plans.length;
  }
  return null;
}

/** Compute overall market average rent from active comps */
function marketAvgRent(comps: Comp[]): number | null {
  const allRents: number[] = [];
  for (const c of comps) {
    for (const fp of c.floorPlans) {
      if (fp.rent != null) allRents.push(fp.rent);
    }
  }
  if (allRents.length === 0) return null;
  return allRents.reduce((a, b) => a + b, 0) / allRents.length;
}

/** Get subject rent for a unit type (prefer rent roll, then floor plans) */
function subjectRentForType(
  unitType: string,
  subjectProperty: SubjectProperty | null,
  rentRoll: RentRollSummary | null,
): { rent: number | null; psf: number | null; sqft: number | null } {
  if (rentRoll) {
    const t = rentRoll.byType.find((r) => r.type === unitType);
    if (t) {
      const sqft = t.avgSqft ?? null;
      const psf = sqft != null && sqft > 0 ? t.avgRent / sqft : null;
      return { rent: t.avgRent, psf, sqft };
    }
  }
  if (subjectProperty) {
    const fp = findPlan(subjectProperty.floorPlans, unitType);
    if (fp) return { rent: fp.rent, psf: fp.psf, sqft: fp.sqft };
  }
  return { rent: null, psf: null, sqft: null };
}

/** Fee value for subject */
function subjectFee(
  fee: string,
  sp: SubjectProperty | null,
): number | null {
  if (!sp) return null;
  switch (fee) {
    case "Application Fee": return sp.applicationFee;
    case "Admin Fee": return sp.adminFee;
    case "Security Deposit": return sp.securityDeposit;
    case "MTM Fee": return sp.mtmFee;
    case "Pet Deposit": return sp.petDeposit;
    case "Pet Rent": return sp.petRent;
    default: return null;
  }
}

/** Fee value for a comp */
function compFee(fee: string, c: Comp): number | null {
  switch (fee) {
    case "Application Fee": return c.applicationFee;
    case "Admin Fee": return c.adminFee;
    case "Security Deposit": return c.securityDeposit;
    case "MTM Fee": return c.mtmFee;
    case "Pet Deposit": return c.petDeposit;
    case "Pet Rent": return c.petRent;
    default: return null;
  }
}

/** Compute fee market stats across active comps */
function feeStats(comps: Comp[], fee: string) {
  const vals = comps.map((c) => compFee(fee, c)).filter((v): v is number => v != null);
  if (vals.length === 0) return { avg: null, low: null, high: null };
  return {
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    low: Math.min(...vals),
    high: Math.max(...vals),
  };
}

/** Collect all unique amenities across subject + comps */
function collectAmenities(
  sp: SubjectProperty | null,
  comps: Comp[],
  field: "communityAmenities" | "unitAmenities",
): string[] {
  const set = new Set<string>();
  if (sp) for (const a of sp[field]) set.add(a);
  for (const c of comps) for (const a of c[field]) set.add(a);
  return Array.from(set).sort();
}

/* ── styles ───────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  /* Cover page uses default 40pt padding */
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: NAVY,
  },
  /* Detail / summary pages use tighter 30pt padding */
  pageCompact: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 7,
    color: NAVY,
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  brandName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
  },
  subtitle: {
    fontSize: 10,
    color: BLUE,
    marginBottom: 2,
  },
  propertyName: {
    fontSize: 9,
    color: NAVY,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerRightText: {
    fontSize: 7,
    color: GRAY,
  },
  divider: {
    height: 1.5,
    backgroundColor: BLUE,
    marginBottom: 8,
  },
  // Section
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 4,
    marginTop: 6,
  },
  // Compact section title for detail pages
  sectionTitleCompact: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 3,
    marginTop: 4,
  },
  // Section header with navy background
  sectionHeaderBar: {
    backgroundColor: NAVY,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 4,
    marginBottom: 3,
  },
  sectionHeaderBarText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },
  // KPI boxes
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: WHITE,
    border: `1 solid ${BORDER}`,
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 7,
    color: GRAY,
    marginBottom: 3,
    textTransform: "uppercase" as const,
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
  },
  // Tables
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    color: WHITE,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderBottom: `0.5 solid ${BORDER}`,
  },
  tableCell: {
    fontSize: 6.5,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `0.5 solid ${BORDER}`,
    paddingTop: 3,
  },
  footerText: {
    fontSize: 6,
    color: GRAY,
  },
  // Amenity
  amenityRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  amenityCol: {
    flex: 1,
  },
  amenityColTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 2,
  },
  // Detail page styles — compact 3-column grid
  detailRow: {
    flexDirection: "row",
    paddingVertical: 1.5,
    paddingHorizontal: 3,
  },
  detailLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: GRAY,
    width: 70,
  },
  detailValue: {
    fontSize: 6.5,
    color: NAVY,
    flex: 1,
  },
  detailThreeCol: {
    flexDirection: "row",
    gap: 8,
  },
  detailColThird: {
    flex: 1,
  },
  detailTwoCol: {
    flexDirection: "row",
    gap: 8,
  },
  detailColHalf: {
    flex: 1,
  },
  notesText: {
    fontSize: 6.5,
    color: NAVY,
    paddingHorizontal: 3,
    paddingVertical: 3,
    backgroundColor: ROW_ALT,
    borderRadius: 2,
  },
  // Map placeholder
  mapPlaceholder: {
    height: 250,
    backgroundColor: ROW_ALT,
    borderRadius: 4,
    border: `1 solid ${BORDER}`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  mapPlaceholderText: {
    fontSize: 8,
    color: GRAY,
    textAlign: "center",
  },
  // Cover page styles
  coverPropertyName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 3,
  },
  coverAddress: {
    fontSize: 10,
    color: GRAY,
    marginBottom: 12,
  },
  coverMeta: {
    fontSize: 8,
    color: GRAY,
    marginTop: 2,
  },
});

/* ── Rent comparison column widths (proportional) ─────────────────────────── */
const RENT_COLS = [
  { label: "Unit Type", flex: 1.4 },
  { label: "Your Rent", flex: 1 },
  { label: "Your PSF", flex: 0.8 },
  { label: "Market Avg", flex: 1 },
  { label: "Mkt Low", flex: 0.9 },
  { label: "Mkt High", flex: 0.9 },
  { label: "Mkt Avg PSF", flex: 0.9 },
  { label: "Diff ($)", flex: 0.8 },
  { label: "Diff (%)", flex: 0.8 },
];

const FEE_COLS = [
  { label: "Fee", flex: 1.5 },
  { label: "Subject", flex: 1 },
  { label: "Market Avg", flex: 1 },
  { label: "Mkt Low", flex: 1 },
  { label: "Mkt High", flex: 1 },
];

const COMP_COLS = [
  { label: "Property", flex: 1.8 },
  { label: "Address", flex: 2.2 },
  { label: "Units", flex: 0.6 },
  { label: "Leased%", flex: 0.7 },
  { label: "Avg Rent", flex: 0.9 },
  { label: "Distance", flex: 0.9 },
  { label: "Called", flex: 0.6 },
  { label: "Toured", flex: 0.6 },
];

const CONCESSION_COLS = [
  { label: "Comp Name", flex: 1.5 },
  { label: "Concessions", flex: 3 },
];

const DETAIL_FP_COLS = [
  { label: "Type", flex: 1.2 },
  { label: "SF", flex: 0.8 },
  { label: "# Units", flex: 0.8 },
  { label: "Leased%", flex: 0.8 },
  { label: "Rent", flex: 1 },
  { label: "PSF", flex: 0.8 },
];

/* ── table building helpers ───────────────────────────────────────────────── */

function tableHeaderRow(columns: { label: string; flex: number }[]) {
  return el(
    View,
    { style: s.tableHeader },
    ...columns.map((col, i) =>
      el(
        View,
        { key: String(i), style: { flex: col.flex } },
        el(Text, { style: s.tableHeaderText }, col.label),
      ),
    ),
  );
}

function tableDataRow(
  columns: { flex: number }[],
  values: string[],
  index: number,
  colorIndices?: number[],
  colorValues?: (number | null)[],
) {
  const bg = index % 2 === 1 ? ROW_ALT : WHITE;
  return el(
    View,
    { key: String(index), style: { ...s.tableRow, backgroundColor: bg } },
    ...columns.map((col, i) => {
      let color = NAVY;
      if (colorIndices && colorValues) {
        const ci = colorIndices.indexOf(i);
        if (ci !== -1 && colorValues[ci] != null) {
          color = diffColor(colorValues[ci]);
        }
      }
      return el(
        View,
        { key: String(i), style: { flex: col.flex } },
        el(Text, { style: { ...s.tableCell, color } }, values[i] ?? ""),
      );
    }),
  );
}

/* ── Section header bar component ─────────────────────────────────────────── */

function SectionBar(title: string) {
  return el(
    View,
    { style: s.sectionHeaderBar },
    el(Text, { style: s.sectionHeaderBarText }, title),
  );
}

/* ── Detail field row component ───────────────────────────────────────────── */

function DetailField(label: string, value: string, bgAlt?: boolean) {
  return el(
    View,
    { style: { ...s.detailRow, backgroundColor: bgAlt ? ROW_ALT : WHITE } },
    el(Text, { style: s.detailLabel }, label),
    el(Text, { style: s.detailValue }, value),
  );
}

/* ── Map placeholder / image component ────────────────────────────────────── */

/**
 * Renders the map section on the Cover Page.
 * If mapDataUri is available, renders the actual map image.
 * If not, renders a placeholder with the listed addresses.
 */
function MapSection(
  property: Property,
  comps: Comp[],
  mapDataUri: string | null,
) {
  if (mapDataUri) {
    // Render actual map image — larger 250pt for cover page
    return el(
      View,
      { style: { marginBottom: 10 } },
      el(Image, {
        src: mapDataUri,
        style: { width: "100%", height: 250 },
      }),
    );
  }

  // Placeholder — list addresses so the user knows what would appear
  const active = activeComps(comps);
  const addresses = [
    property.address + ", " + property.city,
    ...active.map((c) => c.address + (c.cityState ? ", " + c.cityState : "")),
  ];

  return el(
    View,
    { style: s.mapPlaceholder },
    el(
      Text,
      { style: s.mapPlaceholderText },
      "Map: [" + addresses.join("; ") + "]",
    ),
  );
}

/* ── Header component ─────────────────────────────────────────────────────── */

function Header(
  property: Property,
  preparedBy: string,
  surveyDate: string,
) {
  return el(
    View,
    null,
    el(
      View,
      { style: s.headerRow },
      el(
        View,
        null,
        el(Text, { style: s.brandName }, "STARBOARD REAL ESTATE"),
        el(Text, { style: s.subtitle }, "MARKET SURVEY"),
        el(Text, { style: s.propertyName }, property.name),
        el(Text, { style: { fontSize: 7, color: GRAY } }, property.address + ", " + property.city),
      ),
      el(
        View,
        { style: s.headerRight },
        el(Text, { style: s.headerRightText }, "Date: " + surveyDate),
        el(Text, { style: s.headerRightText }, "Prepared by: " + preparedBy),
      ),
    ),
    el(View, { style: s.divider }),
  );
}

/* ── Footer component ─────────────────────────────────────────────────────── */

function Footer(preparedBy: string, surveyDate: string, pageNum: number) {
  return el(
    View,
    { style: s.footer, fixed: true },
    el(
      Text,
      { style: s.footerText },
      "Prepared by " + preparedBy + " | " + surveyDate + " | Starboard Real Estate",
    ),
    el(Text, { style: s.footerText }, "Page " + pageNum),
  );
}

/* ── Page 1: Cover Page (light & visual) ──────────────────────────────────── */

function CoverPage(
  property: Property,
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
  preparedBy: string,
  surveyDate: string,
  mapDataUri: string | null,
) {
  const active = activeComps(comps);
  const subjAvg = subjectAvgRent(subjectProperty, rentRoll);
  const mktAvg = marketAvgRent(active);
  const varianceDollar = subjAvg != null && mktAvg != null ? subjAvg - mktAvg : null;
  const variancePct =
    varianceDollar != null && mktAvg != null && mktAvg !== 0
      ? (varianceDollar / mktAvg) * 100
      : null;

  return el(
    Page,
    { size: "LETTER", orientation: "landscape", style: s.page },

    // Map section (image or placeholder) — large, visual
    MapSection(property, comps, mapDataUri),

    // Property name — large & bold
    el(Text, { style: s.coverPropertyName }, property.name),
    el(Text, { style: s.coverAddress }, property.address + ", " + property.city),

    // 4 KPI boxes
    el(
      View,
      { style: s.kpiRow },
      el(
        View,
        { style: s.kpiBox },
        el(Text, { style: s.kpiLabel }, "Subject Avg Rent"),
        el(Text, { style: { ...s.kpiValue, color: NAVY } }, fmtCurrency(subjAvg)),
      ),
      el(
        View,
        { style: s.kpiBox },
        el(Text, { style: s.kpiLabel }, "Market Avg Rent"),
        el(Text, { style: { ...s.kpiValue, color: NAVY } }, fmtCurrency(mktAvg)),
      ),
      el(
        View,
        { style: s.kpiBox },
        el(Text, { style: s.kpiLabel }, "Variance $"),
        el(Text, { style: { ...s.kpiValue, color: diffColor(varianceDollar) } }, fmtDiff(varianceDollar)),
      ),
      el(
        View,
        { style: s.kpiBox },
        el(Text, { style: s.kpiLabel }, "Variance %"),
        el(Text, { style: { ...s.kpiValue, color: diffColor(variancePct) } }, fmtDiffPct(variancePct)),
      ),
    ),

    // Metadata row
    el(
      View,
      { style: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 } },
      el(
        View,
        null,
        el(Text, { style: s.coverMeta }, "Prepared by: " + preparedBy),
        el(Text, { style: s.coverMeta }, "Date: " + surveyDate),
      ),
      el(
        View,
        { style: { alignItems: "flex-end" } },
        el(Text, { style: s.coverMeta }, "Comps Analyzed: " + active.length),
      ),
    ),

    Footer(preparedBy, surveyDate, 1),
  );
}

/* ── Page 2: Executive Summary (tables) ───────────────────────────────────── */

function ExecutiveSummaryPage(
  property: Property,
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
  preparedBy: string,
  surveyDate: string,
) {
  const active = activeComps(comps);
  const unitTypes = collectFloorPlanTypes(subjectProperty, active, rentRoll);
  const feeNames = [
    "Application Fee",
    "Admin Fee",
    "Security Deposit",
    "MTM Fee",
    "Pet Deposit",
    "Pet Rent",
  ];

  // Community & unit amenities as comma-separated summaries
  const communityAmenities = collectAmenities(subjectProperty, active, "communityAmenities");
  const unitAmenities = collectAmenities(subjectProperty, active, "unitAmenities");

  // Concessions
  const concessionsData = active
    .filter((c) => c.concessions && c.concessions.trim().length > 0)
    .map((c) => ({ name: c.name, concessions: truncate(c.concessions, 80) }));

  return el(
    Page,
    { size: "LETTER", orientation: "landscape", style: s.pageCompact },

    Header(property, preparedBy, surveyDate),

    // Rent Comparison Table
    el(Text, { style: s.sectionTitleCompact }, "Rent Comparison by Unit Type"),
    tableHeaderRow(RENT_COLS),
    ...unitTypes.map((ut, idx) => {
      const subj = subjectRentForType(ut, subjectProperty, rentRoll);
      const mkt = marketStats(active, ut);
      const diffDollar =
        subj.rent != null && mkt.avg != null ? subj.rent - mkt.avg : null;
      const diffPctVal =
        diffDollar != null && mkt.avg != null && mkt.avg !== 0
          ? (diffDollar / mkt.avg) * 100
          : null;
      return tableDataRow(
        RENT_COLS,
        [
          ut,
          fmtCurrency(subj.rent),
          subj.psf != null ? "$" + subj.psf.toFixed(2) : "—",
          fmtCurrency(mkt.avg),
          fmtCurrency(mkt.low),
          fmtCurrency(mkt.high),
          mkt.avgPsf != null ? "$" + mkt.avgPsf.toFixed(2) : "—",
          fmtDiff(diffDollar),
          fmtDiffPct(diffPctVal),
        ],
        idx,
        [7, 8],
        [diffDollar, diffPctVal],
      );
    }),

    // Fee Comparison Table
    el(Text, { style: { ...s.sectionTitleCompact, marginTop: 8 } }, "Fee Comparison"),
    tableHeaderRow(FEE_COLS),
    ...feeNames.map((fee, idx) => {
      const sv = subjectFee(fee, subjectProperty);
      const fs = feeStats(active, fee);
      return tableDataRow(
        FEE_COLS,
        [
          fee,
          fmtCurrency(sv),
          fmtCurrency(fs.avg),
          fmtCurrency(fs.low),
          fmtCurrency(fs.high),
        ],
        idx,
      );
    }),

    // Amenity summary — compact comma-separated
    el(Text, { style: { ...s.sectionTitleCompact, marginTop: 8 } }, "Amenity Comparison"),
    el(
      View,
      { style: s.amenityRow },
      el(
        View,
        { style: s.amenityCol },
        el(Text, { style: s.amenityColTitle }, "Community Amenities"),
        el(Text, { style: { fontSize: 6.5, color: NAVY } }, communityAmenities.join(", ") || "—"),
      ),
      el(
        View,
        { style: s.amenityCol },
        el(Text, { style: s.amenityColTitle }, "In-Unit Amenities"),
        el(Text, { style: { fontSize: 6.5, color: NAVY } }, unitAmenities.join(", ") || "—"),
      ),
    ),

    // Concessions
    concessionsData.length > 0
      ? el(
          View,
          null,
          el(Text, { style: { ...s.sectionTitleCompact, marginTop: 6 } }, "Concessions"),
          tableHeaderRow(CONCESSION_COLS),
          ...concessionsData.map((cd, idx) =>
            tableDataRow(CONCESSION_COLS, [cd.name, cd.concessions], idx),
          ),
        )
      : null,

    // Comp Overview Table
    el(Text, { style: { ...s.sectionTitleCompact, marginTop: 8 } }, "Comp Overview"),
    tableHeaderRow(COMP_COLS),
    ...active.map((c, idx) => {
      const avgRent =
        c.floorPlans.filter((fp) => fp.rent != null).length > 0
          ? c.floorPlans
              .filter((fp) => fp.rent != null)
              .reduce((s2, fp) => s2 + fp.rent!, 0) /
            c.floorPlans.filter((fp) => fp.rent != null).length
          : null;
      return tableDataRow(
        COMP_COLS,
        [
          c.name,
          c.address,
          String(c.totalUnits),
          fmtPct(c.leasedPct),
          fmtCurrency(avgRent),
          c.distanceFromSubject || "—",
          c.called ? "Yes" : "No",
          c.toured ? "Yes" : "No",
        ],
        idx,
      );
    }),

    Footer(preparedBy, surveyDate, 2),
  );
}

/* ── Subject Property Detail Page (compact, one-pager) ────────────────────── */

function SubjectDetailPage(
  property: Property,
  subjectProperty: SubjectProperty | null,
  preparedBy: string,
  surveyDate: string,
  pageNum: number,
) {
  const sp = subjectProperty;

  return el(
    Page,
    { size: "LETTER", orientation: "landscape", style: s.pageCompact },

    Header(property, preparedBy, surveyDate),

    // Title
    SectionBar("Subject Property Detail — " + property.name),

    // Property Info — 3-column grid
    el(
      View,
      { style: s.detailThreeCol },
      el(
        View,
        { style: s.detailColThird },
        DetailField("Name", property.name),
        DetailField("Address", property.address, true),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("City", property.city),
        DetailField("Total Units", String(property.totalUnits), true),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("Year Built", sp?.yearBuilt || "—"),
        DetailField("Leased%", fmtPct(sp?.leasedPct), true),
      ),
    ),

    // Floor Plans table
    SectionBar("Floor Plans"),
    tableHeaderRow(DETAIL_FP_COLS),
    ...(sp?.floorPlans || []).map((fp, idx) =>
      tableDataRow(
        DETAIL_FP_COLS,
        [
          fp.type,
          fp.sqft != null ? String(fp.sqft) : "—",
          fp.unitCount != null ? String(fp.unitCount) : "—",
          fmtPct(fp.leasedPct),
          fmtCurrency(fp.rent),
          fp.psf != null ? "$" + fp.psf.toFixed(2) : "—",
        ],
        idx,
      ),
    ),

    // Cost to Rent — 3-column grid
    SectionBar("Cost to Rent"),
    el(
      View,
      { style: s.detailThreeCol },
      el(
        View,
        { style: s.detailColThird },
        DetailField("App Fee", fmtCurrency(sp?.applicationFee)),
        DetailField("Admin Fee", fmtCurrency(sp?.adminFee), true),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("Deposit", fmtCurrency(sp?.securityDeposit)),
        DetailField("MTM Fee", fmtCurrency(sp?.mtmFee), true),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("Utilities", sp?.utilitiesIncluded || "—"),
        DetailField(
          "Other Fees",
          sp?.otherFees && sp.otherFees.length > 0
            ? truncate(sp.otherFees.map((f) => f.name + ": " + fmtCurrency(f.amount)).join(", "), 60)
            : "—",
          true,
        ),
      ),
    ),

    // Specials — inline
    SectionBar("Specials"),
    el(
      View,
      { style: s.detailTwoCol },
      el(
        View,
        { style: s.detailColHalf },
        DetailField("Concessions", truncate(sp?.concessions || "—", 80)),
      ),
      el(
        View,
        { style: s.detailColHalf },
        DetailField(
          "Referrals",
          sp?.residentReferrals ? "Yes" + (sp.referralAmount != null ? " — " + fmtCurrency(sp.referralAmount) : "") : "No",
        ),
      ),
    ),

    // Amenities — comma-separated text
    SectionBar("Amenities"),
    DetailField("Community", truncate(sp?.communityAmenities?.join(", ") || "—", 120)),
    DetailField("In-Unit", truncate(sp?.unitAmenities?.join(", ") || "—", 120), true),

    // Pets — 3-column grid
    SectionBar("Pets"),
    el(
      View,
      { style: s.detailThreeCol },
      el(
        View,
        { style: s.detailColThird },
        DetailField("Pet Limit", sp?.petLimit || "—"),
        DetailField("Pet Deposit", fmtCurrency(sp?.petDeposit), true),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("Pet Rent", fmtCurrency(sp?.petRent)),
        DetailField("Pet Fee", fmtCurrency(sp?.petFee), true),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("Pet Rules", truncate(sp?.petRules || "—", 60)),
      ),
    ),

    // Notes — truncated
    SectionBar("Notes"),
    el(
      View,
      { style: { paddingHorizontal: 3, marginTop: 2 } },
      el(Text, { style: s.notesText }, truncate(sp?.otherNotes || "—", 200)),
    ),

    Footer(preparedBy, surveyDate, pageNum),
  );
}

/* ── Comp Detail Page (compact, one comp per page) ────────────────────────── */

function CompDetailPage(
  property: Property,
  comp: Comp,
  preparedBy: string,
  surveyDate: string,
  pageNum: number,
) {
  return el(
    Page,
    { size: "LETTER", orientation: "landscape", style: s.pageCompact },

    Header(property, preparedBy, surveyDate),

    // Title
    SectionBar("Comp Detail — " + comp.name),

    // Property Info — 3-column grid
    el(
      View,
      { style: s.detailThreeCol },
      el(
        View,
        { style: s.detailColThird },
        DetailField("Name", comp.name),
        DetailField("Address", comp.address, true),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("City/State", comp.cityState || "—"),
        DetailField("Total Units", String(comp.totalUnits), true),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("Year Built", comp.yearBuilt || "—"),
        DetailField("Distance", comp.distanceFromSubject || "—", true),
      ),
    ),

    // Status row — 3-column
    el(
      View,
      { style: s.detailThreeCol },
      el(
        View,
        { style: s.detailColThird },
        DetailField("Leased%", fmtPct(comp.leasedPct)),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("Occupancy%", fmtPct(comp.occupancyPct)),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("Called/Toured", (comp.called ? "Yes" : "No") + " / " + (comp.toured ? "Yes" : "No")),
      ),
    ),

    // Floor Plans table
    SectionBar("Floor Plans"),
    tableHeaderRow(DETAIL_FP_COLS),
    ...comp.floorPlans.map((fp, idx) =>
      tableDataRow(
        DETAIL_FP_COLS,
        [
          fp.type,
          fp.sqft != null ? String(fp.sqft) : "—",
          fp.unitCount != null ? String(fp.unitCount) : "—",
          fmtPct(fp.leasedPct),
          fmtCurrency(fp.rent),
          fp.psf != null ? "$" + fp.psf.toFixed(2) : "—",
        ],
        idx,
      ),
    ),

    // Cost to Rent — 3-column grid
    SectionBar("Cost to Rent"),
    el(
      View,
      { style: s.detailThreeCol },
      el(
        View,
        { style: s.detailColThird },
        DetailField("App Fee", fmtCurrency(comp.applicationFee)),
        DetailField("Admin Fee", fmtCurrency(comp.adminFee), true),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("Deposit", fmtCurrency(comp.securityDeposit)),
        DetailField("MTM Fee", fmtCurrency(comp.mtmFee), true),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("Utilities", comp.utilitiesIncluded || "—"),
        DetailField(
          "Other Fees",
          comp.otherFees && comp.otherFees.length > 0
            ? truncate(comp.otherFees.map((f) => f.name + ": " + fmtCurrency(f.amount)).join(", "), 60)
            : "—",
          true,
        ),
      ),
    ),

    // Specials — inline
    SectionBar("Specials"),
    el(
      View,
      { style: s.detailTwoCol },
      el(
        View,
        { style: s.detailColHalf },
        DetailField("Concessions", truncate(comp.concessions || "—", 80)),
      ),
      el(
        View,
        { style: s.detailColHalf },
        DetailField(
          "Referrals",
          comp.residentReferrals ? "Yes" + (comp.referralAmount != null ? " — " + fmtCurrency(comp.referralAmount) : "") : "No",
        ),
      ),
    ),

    // Amenities — comma-separated text
    SectionBar("Amenities"),
    DetailField("Community", truncate(comp.communityAmenities?.join(", ") || "—", 120)),
    DetailField("In-Unit", truncate(comp.unitAmenities?.join(", ") || "—", 120), true),

    // Pets — 3-column grid
    SectionBar("Pets"),
    el(
      View,
      { style: s.detailThreeCol },
      el(
        View,
        { style: s.detailColThird },
        DetailField("Pet Limit", comp.petLimit || "—"),
        DetailField("Pet Deposit", fmtCurrency(comp.petDeposit), true),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("Pet Rent", fmtCurrency(comp.petRent)),
        DetailField("Pet Fee", fmtCurrency(comp.petFee), true),
      ),
      el(
        View,
        { style: s.detailColThird },
        DetailField("Pet Rules", truncate(comp.petRules || "—", 60)),
      ),
    ),

    // Notes — truncated to ~200 chars
    SectionBar("Notes"),
    el(
      View,
      { style: { paddingHorizontal: 3, marginTop: 2 } },
      el(Text, { style: s.notesText }, truncate(comp.otherNotes || "—", 200)),
    ),

    Footer(preparedBy, surveyDate, pageNum),
  );
}

/* ── Map image fetching helper ────────────────────────────────────────────── */

/**
 * Fetches a static map image from /api/map/static and returns it as a base64
 * data URI suitable for use with the react-pdf Image component.
 *
 * Returns null if the API key is not configured or if anything fails.
 * The map is optional — PDFs render fine without it.
 */
async function fetchMapImage(
  subject: string,
  compAddresses: string[],
): Promise<string | null> {
  try {
    // Add a timeout so a slow map API doesn't block PDF generation
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const resp = await fetch("/api/map/static", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: { address: subject },
        comps: compAddresses.map((addr) => ({ address: addr })),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;

    const data = await resp.json();

    // Prefer server-side base64 data URI (avoids CORS issues)
    if (data.mapDataUri && typeof data.mapDataUri === "string" && data.mapDataUri.startsWith("data:image/")) {
      return data.mapDataUri;
    }

    // Fallback: URL won't work in react-pdf (CORS), so skip
    return null;
  } catch {
    // Map is optional — gracefully degrade
    return null;
  }
}

/* ── Page 3 (or inserted): Unit Type Summary — Comps vs Subject ──────────── */
/* One mini-table per unit type. Y-axis = properties, columns = SF | $ | $/SF */

const UT_COLS = [
  { label: "Property", flex: 2.5 },
  { label: "SF", flex: 1 },
  { label: "$", flex: 1 },
  { label: "$/SF", flex: 1 },
];

function UnitTypeSummaryPage(
  property: Property,
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
  preparedBy: string,
  surveyDate: string,
  pageNum: number,
) {
  const active = activeComps(comps);
  const unitTypes = collectFloorPlanTypes(subjectProperty, active, rentRoll);

  const tables = unitTypes.flatMap((ut) => {
    const subj = subjectRentForType(ut, subjectProperty, rentRoll);
    const mkt = marketStats(active, ut);

    // Build rows: Subject first, then each comp, then market avg
    interface Row { name: string; sqft: number | null; rent: number | null; psf: number | null; isSubject?: boolean }
    const rows: Row[] = [];

    rows.push({ name: property.name + " (Subject)", sqft: subj.sqft, rent: subj.rent, psf: subj.psf, isSubject: true });

    for (const c of active) {
      const fp = findPlan(c.floorPlans, ut);
      rows.push({
        name: c.name,
        sqft: fp?.sqft ?? null,
        rent: fp?.rent ?? null,
        psf: fp?.psf ?? null,
      });
    }

    // Market average row
    const mktSqfts = active.map((c) => findPlan(c.floorPlans, ut)?.sqft).filter((v): v is number => v != null);
    const mktAvgSqft = mktSqfts.length > 0 ? mktSqfts.reduce((a, b) => a + b, 0) / mktSqfts.length : null;
    rows.push({ name: "Market Average", sqft: mktAvgSqft, rent: mkt.avg, psf: mkt.avgPsf });

    const fmtSqft = (v: number | null) => v != null ? Math.round(v).toLocaleString("en-US") : "—";
    const fmtPsfShort = (v: number | null) => v != null ? "$" + v.toFixed(2) : "—";

    return [
      // Unit type label
      el(View, { key: ut + "-label", style: { marginTop: 6, marginBottom: 2 } },
        el(Text, { style: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLUE } }, ut),
      ),
      // Header
      tableHeaderRow(UT_COLS),
      // Data rows
      ...rows.map((r, idx) => {
        const bg = r.isSubject ? "#eff6ff" : idx % 2 === 0 ? WHITE : ROW_ALT;
        const nameStyle = r.isSubject
          ? { ...s.tableCell, fontFamily: "Helvetica-Bold" as const, color: BLUE }
          : r.name === "Market Average"
            ? { ...s.tableCell, fontFamily: "Helvetica-Bold" as const, color: NAVY }
            : s.tableCell;
        return el(
          View,
          { key: ut + "-" + idx, style: { ...s.tableRow, backgroundColor: bg } },
          el(View, { style: { flex: UT_COLS[0].flex } }, el(Text, { style: nameStyle }, r.name)),
          el(View, { style: { flex: UT_COLS[1].flex } }, el(Text, { style: s.tableCell }, fmtSqft(r.sqft))),
          el(View, { style: { flex: UT_COLS[2].flex } }, el(Text, { style: s.tableCell }, fmtCurrency(r.rent))),
          el(View, { style: { flex: UT_COLS[3].flex } }, el(Text, { style: s.tableCell }, fmtPsfShort(r.psf))),
        );
      }),
    ];
  });

  return el(
    Page,
    { size: "LETTER", orientation: "landscape", style: s.pageCompact },

    Header(property, preparedBy, surveyDate),

    el(Text, { style: s.sectionTitleCompact }, "Unit Type Summary — Subject vs Comps"),
    ...tables,

    Footer(preparedBy, surveyDate, pageNum),
  );
}

/* ── Document builders ───────────────────────────────────────────────────── */

function SummaryDocument(
  property: Property,
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
  preparedBy: string,
  surveyDate: string,
  mapDataUri: string | null,
) {
  return el(
    Document,
    null,
    // Page 1: Cover page (light, visual)
    CoverPage(property, subjectProperty, comps, rentRoll, preparedBy, surveyDate, mapDataUri),
    // Page 2: Executive summary tables
    ExecutiveSummaryPage(property, subjectProperty, comps, rentRoll, preparedBy, surveyDate),
    // Page 3: Unit type summary — comps vs subject
    UnitTypeSummaryPage(property, subjectProperty, comps, rentRoll, preparedBy, surveyDate, 3),
  );
}

function DetailDocument(
  property: Property,
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
  preparedBy: string,
  surveyDate: string,
  mapDataUri: string | null,
) {
  const active = activeComps(comps);

  return el(
    Document,
    null,
    // Page 1: Cover page (light, visual)
    CoverPage(property, subjectProperty, comps, rentRoll, preparedBy, surveyDate, mapDataUri),
    // Page 2: Executive summary tables
    ExecutiveSummaryPage(property, subjectProperty, comps, rentRoll, preparedBy, surveyDate),
    // Page 3: Unit type summary — comps vs subject
    UnitTypeSummaryPage(property, subjectProperty, comps, rentRoll, preparedBy, surveyDate, 3),
    // Page 4: Subject property detail (compact, one-pager)
    SubjectDetailPage(property, subjectProperty, preparedBy, surveyDate, 4),
    // Pages 5+: One page per non-excluded comp (compact, one-pager each)
    ...active.map((comp, idx) =>
      CompDetailPage(property, comp, preparedBy, surveyDate, 5 + idx),
    ),
  );
}

/* ── Shared download helper ──────────────────────────────────────────────── */

async function downloadPdfBlob(blob: Blob, property: Property, surveyDate: string, suffix: string) {
  const safeName = property.name.replace(/[^a-zA-Z0-9]/g, "_");
  const dateStr = surveyDate || new Date().toISOString().slice(0, 10);
  const filename = "Market_Survey_" + suffix + "_" + safeName + "_" + dateStr + ".pdf";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Resolve map image for both exports ──────────────────────────────────── */

async function resolveMapImage(
  property: Property,
  comps: Comp[],
): Promise<string | null> {
  const active = activeComps(comps);
  const subjectAddr = property.address + ", " + property.city;
  // Always ensure city/state context — fall back to subject property's city
  // to prevent geocoding to wrong continent
  const fallbackCity = property.city || "";
  const compAddrs = active.map((c) => {
    const addr = (c.address || "").trim();
    if (!addr) return "";
    const city = (c.cityState || "").trim();
    if (city) return `${addr}, ${city}`;
    if (fallbackCity) return `${addr}, ${fallbackCity}`;
    return addr;
  }).filter(Boolean);
  return fetchMapImage(subjectAddr, compAddrs);
}

/* ── Public export functions ─────────────────────────────────────────────── */

export async function exportPdfSummary(
  property: Property,
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
  preparedBy: string,
  surveyDate: string,
  comments: string,
): Promise<void> {
  const mapDataUri = await resolveMapImage(property, comps);

  const doc = SummaryDocument(
    property,
    subjectProperty,
    comps,
    rentRoll,
    preparedBy || "—",
    surveyDate || new Date().toISOString().slice(0, 10),
    mapDataUri,
  );

  const blob = await pdf(doc).toBlob();
  await downloadPdfBlob(blob, property, surveyDate, "Summary");
}

export async function exportPdfDetail(
  property: Property,
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
  preparedBy: string,
  surveyDate: string,
  comments: string,
): Promise<void> {
  const mapDataUri = await resolveMapImage(property, comps);

  const doc = DetailDocument(
    property,
    subjectProperty,
    comps,
    rentRoll,
    preparedBy || "—",
    surveyDate || new Date().toISOString().slice(0, 10),
    mapDataUri,
  );

  const blob = await pdf(doc).toBlob();
  await downloadPdfBlob(blob, property, surveyDate, "Detail");
}
