import * as XLSX from "xlsx";
import type {
  Property,
  SubjectProperty,
  Comp,
  RentRollSummary,
  FloorPlan,
} from "./types";

/* ── helpers ────────────────────────────────────────────────────────────── */

function fmt$(v: number | null): string {
  if (v == null) return "";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(v: number | null): string {
  if (v == null) return "";
  return `${(v * 100).toFixed(1)}%`;
}

function yn(v: boolean): string {
  return v ? "Yes" : "No";
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

/* ── Executive Summary sheet ────────────────────────────────────────────── */

function buildSummarySheet(
  property: Property,
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
): XLSX.WorkSheet {
  const data: (string | number | null)[][] = [];

  // Header row
  const header: string[] = ["Metric", "Subject"];
  comps.forEach((c) => header.push(c.name || "Comp"));
  data.push(header);

  // Helper to push a metric row
  function row(label: string, subjectVal: string | number | null, compVals: (string | number | null)[]) {
    data.push([label, subjectVal, ...compVals]);
  }

  // Property Name
  row("Property Name", property.name, comps.map((c) => c.name));
  // Address
  row("Address", property.address, comps.map((c) => c.address));
  // City/State
  row("City/State", property.city, comps.map((c) => c.cityState));
  // Distance from Subject
  row("Distance from Subject", "—", comps.map((c) => c.distanceFromSubject || ""));
  // Total Units
  row("Total Units", property.totalUnits, comps.map((c) => c.totalUnits));
  // Year Built
  row("Year Built", subjectProperty?.yearBuilt ?? "", comps.map((c) => c.yearBuilt ?? ""));
  // Leased %
  row(
    "Leased %",
    fmtPct(subjectProperty?.leasedPct ?? (rentRoll ? computeOverallLeasedPct(rentRoll) : null)),
    comps.map((c) => fmtPct(c.leasedPct)),
  );
  // Application Fee
  row("Application Fee", fmt$(subjectProperty?.applicationFee ?? null), comps.map((c) => fmt$(c.applicationFee)));
  // Admin Fee
  row("Admin Fee", fmt$(subjectProperty?.adminFee ?? null), comps.map((c) => fmt$(c.adminFee)));
  // Security Deposit
  row("Security Deposit", fmt$(subjectProperty?.securityDeposit ?? null), comps.map((c) => fmt$(c.securityDeposit)));
  // MTM Fee
  row("MTM Fee", fmt$(subjectProperty?.mtmFee ?? null), comps.map((c) => fmt$(c.mtmFee)));
  // Lease Terms
  row("Lease Terms", subjectProperty?.leaseTerms ?? "", comps.map((c) => c.leaseTerms));
  // Utilities Included
  row("Utilities Included", subjectProperty?.utilitiesIncluded ?? "", comps.map((c) => c.utilitiesIncluded));
  // Concessions
  row("Concessions", subjectProperty?.concessions ?? "", comps.map((c) => c.concessions));

  // Blank row
  data.push([]);

  // Floor Plans header
  const fpHeader: string[] = ["Floor Plans"];
  for (let i = 0; i < comps.length + 1; i++) fpHeader.push("");
  data.push(fpHeader);

  // Floor plan sub-header
  const fpSubHeader: string[] = ["Type / SF / Rent / PSF", "Subject"];
  comps.forEach((c) => fpSubHeader.push(c.name || "Comp"));
  data.push(fpSubHeader);

  const fpTypes = collectFloorPlanTypes(subjectProperty, comps);
  for (const fpType of fpTypes) {
    const subjPlan = subjectProperty ? findPlan(subjectProperty.floorPlans, fpType) : undefined;
    const subjCell = subjPlan
      ? `${subjPlan.sqft ?? "—"} SF | ${fmt$(subjPlan.rent)} | ${subjPlan.psf != null ? fmt$(subjPlan.psf) + "/SF" : "—"}`
      : "";

    const compCells = comps.map((c) => {
      const plan = findPlan(c.floorPlans, fpType);
      if (!plan) return "";
      return `${plan.sqft ?? "—"} SF | ${fmt$(plan.rent)} | ${plan.psf != null ? fmt$(plan.psf) + "/SF" : "—"}`;
    });

    row(fpType, subjCell, compCells);
  }

  // Blank row
  data.push([]);

  // Amenities header
  data.push(["Amenities"]);
  row(
    "Community Amenities",
    subjectProperty?.communityAmenities.join(", ") ?? "",
    comps.map((c) => c.communityAmenities.join(", ")),
  );
  row(
    "In-Unit Amenities",
    subjectProperty?.unitAmenities.join(", ") ?? "",
    comps.map((c) => c.unitAmenities.join(", ")),
  );

  // Blank row
  data.push([]);

  // Pets
  row("Pet Deposit", fmt$(subjectProperty?.petDeposit ?? null), comps.map((c) => fmt$(c.petDeposit)));
  row("Pet Rent", fmt$(subjectProperty?.petRent ?? null), comps.map((c) => fmt$(c.petRent)));
  row("Pet Fee", fmt$(subjectProperty?.petFee ?? null), comps.map((c) => fmt$(c.petFee)));

  // Blank row
  data.push([]);

  // Called / Toured
  row("Called", "—", comps.map((c) => yn(c.called)));
  row("Toured", "—", comps.map((c) => yn(c.toured)));
  // Notes
  row("Notes", subjectProperty?.otherNotes ?? "", comps.map((c) => c.otherNotes));

  // Build worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  const colWidths: XLSX.ColInfo[] = [{ wch: 22 }]; // col A
  for (let i = 0; i < comps.length + 1; i++) {
    colWidths.push({ wch: 20 });
  }
  ws["!cols"] = colWidths;

  return ws;
}

function computeOverallLeasedPct(rr: RentRollSummary): number | null {
  if (!rr.byType.length) return null;
  const totalCount = rr.byType.reduce((s, t) => s + t.count, 0);
  if (totalCount === 0) return null;
  const weightedSum = rr.byType.reduce((s, t) => s + t.leasedPct * t.count, 0);
  return weightedSum / totalCount;
}

/* ── Detail sheet ───────────────────────────────────────────────────────── */

function buildDetailSheet(
  property: Property,
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
): XLSX.WorkSheet {
  const data: (string | number | null)[][] = [];

  // Subject property section
  data.push(["SUBJECT PROPERTY"]);
  data.push(["Name", property.name]);
  data.push(["Address", property.address]);
  data.push(["City", property.city]);
  data.push(["Total Units", property.totalUnits]);

  if (subjectProperty) {
    data.push(["Year Built", subjectProperty.yearBuilt ?? ""]);
    data.push(["Renovated", subjectProperty.renovated != null ? yn(subjectProperty.renovated) : ""]);
    data.push(["Reno Date", subjectProperty.renoDate ?? ""]);
    data.push(["Furnished", subjectProperty.furnished != null ? yn(subjectProperty.furnished) : ""]);
    data.push(["Leased %", fmtPct(subjectProperty.leasedPct)]);
    data.push(["Occupancy %", fmtPct(subjectProperty.occupancyPct ?? null)]);
    data.push(["Application Fee", fmt$(subjectProperty.applicationFee)]);
    data.push(["Admin Fee", fmt$(subjectProperty.adminFee)]);
    data.push(["Security Deposit", fmt$(subjectProperty.securityDeposit)]);
    data.push(["MTM Fee", fmt$(subjectProperty.mtmFee)]);
    data.push(["Lease Terms", subjectProperty.leaseTerms]);
    data.push(["Utilities Included", subjectProperty.utilitiesIncluded]);
    data.push(["Concessions", subjectProperty.concessions]);
    data.push(["Resident Referrals", subjectProperty.residentReferrals != null ? yn(subjectProperty.residentReferrals) : ""]);
    data.push(["Referral Amount", fmt$(subjectProperty.referralAmount ?? null)]);

    // Floor plans sub-table
    if (subjectProperty.floorPlans.length > 0) {
      data.push([]);
      data.push(["Floor Plans", "Type", "SF", "Units", "Leased %", "Rent", "PSF"]);
      for (const fp of subjectProperty.floorPlans) {
        data.push(["", fp.type, fp.sqft, fp.unitCount, fmtPct(fp.leasedPct), fmt$(fp.rent), fp.psf != null ? `$${fp.psf.toFixed(2)}` : ""]);
      }
    }

    // Other fees
    if (subjectProperty.otherFees.length > 0) {
      data.push([]);
      data.push(["Other Fees", "Name", "Amount", "Type"]);
      for (const f of subjectProperty.otherFees) {
        data.push(["", f.name, fmt$(f.amount), f.type]);
      }
    }

    // Amenities
    data.push([]);
    data.push(["Community Amenities", subjectProperty.communityAmenities.join(", ")]);
    data.push(["In-Unit Amenities", subjectProperty.unitAmenities.join(", ")]);

    // Pets
    data.push([]);
    data.push(["Pet Limit", subjectProperty.petLimit]);
    data.push(["Pet Deposit", fmt$(subjectProperty.petDeposit)]);
    data.push(["Pet Rent", fmt$(subjectProperty.petRent)]);
    data.push(["Pet Fee", fmt$(subjectProperty.petFee)]);
    data.push(["Pet Rules", subjectProperty.petRules]);

    // Notes
    data.push([]);
    data.push(["Notes", subjectProperty.otherNotes]);
  }

  // Rent roll summary if available
  if (rentRoll && rentRoll.byType.length > 0) {
    data.push([]);
    data.push(["Rent Roll Summary", "Type", "Count", "Avg Rent", "Low", "High", "Avg SF"]);
    for (const t of rentRoll.byType) {
      data.push(["", t.type, t.count, fmt$(t.avgRent), fmt$(t.low), fmt$(t.high), t.avgSqft ?? ""]);
    }
  }

  // Blank separator
  data.push([]);
  data.push([]);

  // Each comp
  for (const comp of comps) {
    data.push([`COMP: ${comp.name || "Unnamed"}`]);
    data.push(["Name", comp.name]);
    data.push(["Address", comp.address]);
    data.push(["City/State", comp.cityState]);
    data.push(["Distance from Subject", comp.distanceFromSubject]);
    data.push(["Phone", comp.phone]);
    data.push(["Total Units", comp.totalUnits]);
    data.push(["Year Built", comp.yearBuilt ?? ""]);
    data.push(["Leased %", fmtPct(comp.leasedPct)]);
    data.push(["Occupancy %", fmtPct(comp.occupancyPct)]);
    data.push(["Application Fee", fmt$(comp.applicationFee)]);
    data.push(["Admin Fee", fmt$(comp.adminFee)]);
    data.push(["Security Deposit", fmt$(comp.securityDeposit)]);
    data.push(["MTM Fee", fmt$(comp.mtmFee)]);
    data.push(["Corporate Units", comp.corporateUnits != null ? yn(comp.corporateUnits) : ""]);
    data.push(["Furnished", comp.furnished != null ? yn(comp.furnished) : ""]);
    data.push(["Resident Referrals", comp.residentReferrals != null ? yn(comp.residentReferrals) : ""]);
    data.push(["Referral Amount", fmt$(comp.referralAmount)]);
    data.push(["Lease Terms", comp.leaseTerms]);
    data.push(["Utilities Included", comp.utilitiesIncluded]);
    data.push(["Renovated", comp.renovated != null ? yn(comp.renovated) : ""]);
    data.push(["Reno Date", comp.renoDate ?? ""]);
    data.push(["Concessions", comp.concessions]);

    // Floor plans
    if (comp.floorPlans.length > 0) {
      data.push([]);
      data.push(["Floor Plans", "Type", "SF", "Units", "Leased %", "Rent", "PSF"]);
      for (const fp of comp.floorPlans) {
        data.push(["", fp.type, fp.sqft, fp.unitCount, fmtPct(fp.leasedPct), fmt$(fp.rent), fp.psf != null ? `$${fp.psf.toFixed(2)}` : ""]);
      }
    }

    // Other fees
    if (comp.otherFees.length > 0) {
      data.push([]);
      data.push(["Other Fees", "Name", "Amount", "Type"]);
      for (const f of comp.otherFees) {
        data.push(["", f.name, fmt$(f.amount), f.type]);
      }
    }

    // Amenities
    data.push([]);
    data.push(["Community Amenities", comp.communityAmenities.join(", ")]);
    data.push(["In-Unit Amenities", comp.unitAmenities.join(", ")]);

    // Pets
    data.push([]);
    data.push(["Pet Limit", comp.petLimit]);
    data.push(["Pet Deposit", fmt$(comp.petDeposit)]);
    data.push(["Pet Rent", fmt$(comp.petRent)]);
    data.push(["Pet Fee", fmt$(comp.petFee)]);
    data.push(["Pet Rules", comp.petRules]);

    // Survey metadata
    data.push([]);
    data.push(["Called", yn(comp.called)]);
    data.push(["Toured", yn(comp.toured)]);
    data.push(["Source", comp.source]);
    data.push(["Notes", comp.otherNotes]);

    // Separator
    data.push([]);
    data.push([]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];

  return ws;
}

/* ── Main export function ───────────────────────────────────────────────── */

export function exportToExcel(
  property: Property,
  subjectProperty: SubjectProperty | null,
  comps: Comp[],
  rentRoll: RentRollSummary | null,
  _preparedBy: string,
  _surveyDate: string,
  _comments: string,
): void {
  // Filter to non-excluded comps only
  const activeComps = comps.filter((c) => !c.excluded);

  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  const summaryWs = buildSummarySheet(property, subjectProperty, activeComps, rentRoll);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Executive Summary");

  // Sheet 2: Detail
  const detailWs = buildDetailSheet(property, subjectProperty, activeComps, rentRoll);
  XLSX.utils.book_append_sheet(wb, detailWs, "Detail");

  // Generate filename
  const datePart = new Date().toISOString().slice(0, 10);
  const safeName = property.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
  const filename = `Market_Survey_${safeName}_${datePart}.xlsx`;

  XLSX.writeFile(wb, filename);
}
