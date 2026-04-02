import type { Property, SubjectProperty, Comp, RentRollSummary, FloorPlan } from "../lib/types";
import { MapEmbed } from "../components/MapEmbed";

interface MarketSummaryProps {
  property: Property | null;
  subjectProperty: SubjectProperty | null;
  comps: Comp[];
  rentRoll: RentRollSummary | null;
}

/* ── helpers ──────────────────────────────────────────────────────────── */

function activeComps(comps: Comp[]): Comp[] {
  return comps.filter((c) => !c.excluded);
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function fmt$(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPsf(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return "$" + n.toFixed(2);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(1) + "%";
}

function psfCalc(rent: number | null, sqft: number | null): number | null {
  if (!rent || !sqft || sqft === 0) return null;
  return rent / sqft;
}

/** Collect all unique unit types from subject + comps */
function collectUnitTypes(
  subjectPlans: FloorPlan[],
  compPlans: FloorPlan[][],
): string[] {
  const set = new Set<string>();
  subjectPlans.forEach((p) => set.add(p.type));
  compPlans.forEach((plans) => plans.forEach((p) => set.add(p.type)));
  return Array.from(set).sort();
}

interface RentRow {
  type: string;
  yourRent: number | null;
  yourAdRent: number | null;
  yourSqft: number | null;
  yourPsf: number | null;
  yourAdPsf: number | null;
  marketRent: number | null;
  marketSqft: number | null;
  marketPsf: number | null;
  diff: number | null;
  diffPct: number | null;
  diffAd: number | null;
  diffAdPct: number | null;
}

function buildRentRows(
  subjectPlans: FloorPlan[],
  rrByType: RentRollSummary["byType"] | undefined,
  comps: Comp[],
): RentRow[] {
  const active = activeComps(comps);
  const compPlanSets = active.map((c) => c.floorPlans);
  const unitTypes = collectUnitTypes(subjectPlans, compPlanSets);

  return unitTypes.map((type) => {
    // Subject data
    const sp = subjectPlans.find((p) => p.type === type);
    const rrRow = rrByType?.find((r) => r.type === type);
    const yourRent = sp?.rent ?? rrRow?.avgRent ?? null;
    const yourAdRent = sp?.adRent ?? null;
    const yourSqft = sp?.sqft ?? rrRow?.avgSqft ?? null;
    const yourPsf = psfCalc(yourRent, yourSqft);
    const yourAdPsf = psfCalc(yourAdRent, yourSqft);

    // Market avg from comps
    const matchingPlans = active.flatMap((c) =>
      c.floorPlans.filter((p) => p.type === type),
    );
    const rents = matchingPlans.map((p) => p.rent).filter((r): r is number => r != null);
    const sqfts = matchingPlans.map((p) => p.sqft).filter((s): s is number => s != null);
    const marketRent = rents.length > 0 ? avg(rents) : null;
    const marketSqft = sqfts.length > 0 ? avg(sqfts) : null;
    const marketPsf = psfCalc(marketRent, marketSqft);

    const diff = yourRent != null && marketRent != null ? yourRent - marketRent : null;
    const diffPct =
      diff != null && marketRent != null && marketRent !== 0
        ? (diff / marketRent) * 100
        : null;

    const diffAd = yourAdRent != null && marketRent != null ? yourAdRent - marketRent : null;
    const diffAdPct =
      diffAd != null && marketRent != null && marketRent !== 0
        ? (diffAd / marketRent) * 100
        : null;

    return { type, yourRent, yourAdRent, yourSqft, yourPsf, yourAdPsf, marketRent, marketSqft, marketPsf, diff, diffPct, diffAd, diffAdPct };
  });
}

function diffColor(val: number | null): string {
  if (val == null) return "text-slate-500";
  return val >= 0 ? "text-emerald-600" : "text-red-600";
}

/* ── sub-components ───────────────────────────────────────────────────── */

function OverviewCards({
  subjectPlans,
  rrByType,
  subjectProperty,
  comps,
}: {
  subjectPlans: FloorPlan[];
  rrByType: RentRollSummary["byType"] | undefined;
  subjectProperty: SubjectProperty | null;
  comps: Comp[];
}) {
  const active = activeComps(comps);

  // Your avg rent
  const yourRents = subjectPlans
    .map((p) => p.rent)
    .filter((r): r is number => r != null);
  const rrRents = rrByType?.map((r) => r.avgRent) ?? [];
  const yourAvgRent = yourRents.length > 0 ? avg(yourRents) : rrRents.length > 0 ? avg(rrRents) : null;

  // Market avg rent
  const compAvgRents = active.map((c) => {
    const rents = c.floorPlans.map((p) => p.rent).filter((r): r is number => r != null);
    return rents.length > 0 ? avg(rents) : null;
  }).filter((r): r is number => r != null);
  const marketAvgRent = compAvgRents.length > 0 ? avg(compAvgRents) : null;

  // Occupancy
  const yourOcc = subjectProperty?.occupancyPct ?? null;
  const compOccs = active.map((c) => c.occupancyPct).filter((o): o is number => o != null);
  const marketAvgOcc = compOccs.length > 0 ? avg(compOccs) : null;

  // Ad rent avg
  const yourAdRents = subjectPlans
    .map((p) => p.adRent)
    .filter((r): r is number => r != null);
  const yourAvgAdRent = yourAdRents.length > 0 ? avg(yourAdRents) : null;

  // Rent position (in-place)
  let positionLabel = "—";
  let positionColor = "text-slate-600";
  let positionPct: number | null = null;
  if (yourAvgRent != null && marketAvgRent != null && marketAvgRent !== 0) {
    positionPct = ((yourAvgRent - marketAvgRent) / marketAvgRent) * 100;
    if (Math.abs(positionPct) < 1) {
      positionLabel = "At Market";
      positionColor = "text-slate-600";
    } else if (positionPct > 0) {
      positionLabel = "Above Market";
      positionColor = "text-emerald-600";
    } else {
      positionLabel = "Below Market";
      positionColor = "text-red-600";
    }
  }

  // Ad rent position
  let adPositionLabel = "—";
  let adPositionColor = "text-slate-600";
  let adPositionPct: number | null = null;
  if (yourAvgAdRent != null && marketAvgRent != null && marketAvgRent !== 0) {
    adPositionPct = ((yourAvgAdRent - marketAvgRent) / marketAvgRent) * 100;
    if (Math.abs(adPositionPct) < 1) {
      adPositionLabel = "At Market";
      adPositionColor = "text-slate-600";
    } else if (adPositionPct > 0) {
      adPositionLabel = "Above Market";
      adPositionColor = "text-emerald-600";
    } else {
      adPositionLabel = "Below Market";
      adPositionColor = "text-red-600";
    }
  }

  const cards = [
    {
      label: "In-Place Rent vs Market",
      value: fmt$(yourAvgRent) + " / " + fmt$(marketAvgRent),
      color:
        yourAvgRent != null && marketAvgRent != null
          ? yourAvgRent >= marketAvgRent
            ? "text-emerald-600"
            : "text-red-600"
          : "text-slate-600",
    },
    {
      label: "Ad Rent vs Market",
      value: fmt$(yourAvgAdRent) + " / " + fmt$(marketAvgRent),
      color:
        yourAvgAdRent != null && marketAvgRent != null
          ? yourAvgAdRent >= marketAvgRent
            ? "text-emerald-600"
            : "text-red-600"
          : "text-slate-600",
    },
    {
      label: "In-Place Position",
      value: positionLabel + (positionPct != null ? ` (${positionPct > 0 ? "+" : ""}${positionPct.toFixed(1)}%)` : ""),
      color: positionColor,
    },
    {
      label: "Ad Rent Position",
      value: yourAvgAdRent != null ? adPositionLabel + (adPositionPct != null ? ` (${adPositionPct > 0 ? "+" : ""}${adPositionPct.toFixed(1)}%)` : "") : "Not set",
      color: yourAvgAdRent != null ? adPositionColor : "text-slate-400",
    },
    {
      label: "Your Occupancy vs Market",
      value: fmtPct(yourOcc) + " / " + fmtPct(marketAvgOcc),
      color:
        yourOcc != null && marketAvgOcc != null
          ? yourOcc >= marketAvgOcc
            ? "text-emerald-600"
            : "text-red-600"
          : "text-slate-600",
    },
    {
      label: "Comps Analyzed",
      value: String(active.length),
      color: "text-blue-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col items-center text-center"
        >
          <span className={`text-xl font-bold ${c.color}`}>{c.value}</span>
          <span className="mt-1 text-xs font-medium text-slate-500">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

function RentComparisonTable({ rows }: { rows: RentRow[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">
        Rent Comparison by Unit Type
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-4">Unit Type</th>
              <th className="py-2 pr-4 text-right">In-Place Rent</th>
              <th className="py-2 pr-4 text-right">Ad Rent</th>
              <th className="py-2 pr-4 text-right">Your PSF</th>
              <th className="py-2 pr-4 text-right">Ad PSF</th>
              <th className="py-2 pr-4 text-right">Market Avg</th>
              <th className="py-2 pr-4 text-right">Market PSF</th>
              <th className="py-2 pr-4 text-right">Diff vs In-Place</th>
              <th className="py-2 text-right">Diff vs Ad</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-slate-400">
                  No floor plan data available.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.type} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium text-slate-700">{r.type}</td>
                <td className="py-2 pr-4 text-right text-slate-700">{fmt$(r.yourRent)}</td>
                <td className="py-2 pr-4 text-right text-slate-700">{fmt$(r.yourAdRent)}</td>
                <td className="py-2 pr-4 text-right text-slate-700">{fmtPsf(r.yourPsf)}</td>
                <td className="py-2 pr-4 text-right text-slate-700">{fmtPsf(r.yourAdPsf)}</td>
                <td className="py-2 pr-4 text-right text-slate-700">{fmt$(r.marketRent)}</td>
                <td className="py-2 pr-4 text-right text-slate-700">{fmtPsf(r.marketPsf)}</td>
                <td className={`py-2 pr-4 text-right font-medium ${diffColor(r.diff)}`}>
                  {r.diff != null ? (r.diff >= 0 ? "+" : "") + fmt$(r.diff) + ` (${(r.diffPct ?? 0) >= 0 ? "+" : ""}${r.diffPct?.toFixed(1) ?? ""}%)` : "\u2014"}
                </td>
                <td className={`py-2 text-right font-medium ${diffColor(r.diffAd)}`}>
                  {r.diffAd != null ? (r.diffAd >= 0 ? "+" : "") + fmt$(r.diffAd) + ` (${(r.diffAdPct ?? 0) >= 0 ? "+" : ""}${r.diffAdPct?.toFixed(1) ?? ""}%)` : "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── Unit Type Tables — one table per unit type, properties on Y axis ──── */

function UnitTypeTables({
  property,
  subjectProperty,
  comps,
  rentRoll,
}: {
  property: Property | null;
  subjectProperty: SubjectProperty | null;
  comps: Comp[];
  rentRoll: RentRollSummary | null;
}) {
  const active = activeComps(comps);
  const subjectPlans = subjectProperty?.floorPlans ?? [];
  const compPlanSets = active.map((c) => c.floorPlans);
  const unitTypes = collectUnitTypes(subjectPlans, compPlanSets);

  // Also include types from rent roll
  const rrTypes = rentRoll?.byType.map((r) => r.type) ?? [];
  const allTypes = Array.from(new Set([...unitTypes, ...rrTypes])).sort();

  if (allTypes.length === 0) return null;

  // Helper to get subject data for a unit type
  function getSubjectData(type: string) {
    const sp = subjectPlans.find((p) => p.type === type);
    const rr = rentRoll?.byType.find((r) => r.type === type);
    const rent = sp?.rent ?? rr?.avgRent ?? null;
    const sqft = sp?.sqft ?? rr?.avgSqft ?? null;
    const psf = rent != null && sqft != null && sqft > 0 ? rent / sqft : null;
    return { rent, sqft, psf };
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">
        Unit Type Breakdown
      </h2>
      <div className="space-y-6">
        {allTypes.map((type) => {
          const subj = getSubjectData(type);
          // Market average
          const matchingPlans = active.flatMap((c) =>
            c.floorPlans.filter((p) => p.type === type),
          );
          const mktRents = matchingPlans.map((p) => p.rent).filter((r): r is number => r != null);
          const mktSqfts = matchingPlans.map((p) => p.sqft).filter((s): s is number => s != null);
          const mktAvgRent = mktRents.length > 0 ? avg(mktRents) : null;
          const mktAvgSqft = mktSqfts.length > 0 ? avg(mktSqfts) : null;
          const mktAvgPsf = mktAvgRent != null && mktAvgSqft != null && mktAvgSqft > 0 ? mktAvgRent / mktAvgSqft : null;

          return (
            <div key={type}>
              <h3 className="mb-2 text-sm font-bold text-blue-600">{type}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-2 pr-4">Property</th>
                      <th className="py-2 pr-4 text-right">SF</th>
                      <th className="py-2 pr-4 text-right">$</th>
                      <th className="py-2 text-right">$/SF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Subject row */}
                    <tr className="border-b border-slate-100 bg-blue-50/40">
                      <td className="py-2 pr-4 font-semibold text-blue-700">
                        {property?.name ?? "Subject"} (Subject)
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-700">
                        {subj.sqft != null ? Math.round(subj.sqft).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-700">{fmt$(subj.rent)}</td>
                      <td className="py-2 text-right text-slate-700">{fmtPsf(subj.psf)}</td>
                    </tr>
                    {/* Comp rows */}
                    {active.map((c) => {
                      const fp = c.floorPlans.find((p) => p.type === type);
                      return (
                        <tr key={c.id} className="border-b border-slate-100">
                          <td className="py-2 pr-4 font-medium text-slate-700">{c.name}</td>
                          <td className="py-2 pr-4 text-right text-slate-700">
                            {fp?.sqft != null ? Math.round(fp.sqft).toLocaleString() : "—"}
                          </td>
                          <td className="py-2 pr-4 text-right text-slate-700">{fmt$(fp?.rent)}</td>
                          <td className="py-2 text-right text-slate-700">{fmtPsf(psfCalc(fp?.rent ?? null, fp?.sqft ?? null))}</td>
                        </tr>
                      );
                    })}
                    {/* Market average row */}
                    <tr className="border-t-2 border-slate-300 font-semibold">
                      <td className="py-2 pr-4 text-slate-800">Market Average</td>
                      <td className="py-2 pr-4 text-right text-slate-800">
                        {mktAvgSqft != null ? Math.round(mktAvgSqft).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-800">{fmt$(mktAvgRent)}</td>
                      <td className="py-2 text-right text-slate-800">{fmtPsf(mktAvgPsf)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FeeComparisonTable({
  subjectProperty,
  comps,
}: {
  subjectProperty: SubjectProperty | null;
  comps: Comp[];
}) {
  const active = activeComps(comps);

  type FeeKey = "applicationFee" | "adminFee" | "securityDeposit" | "mtmFee" | "petDeposit" | "petRent";
  const fees: { label: string; key: FeeKey }[] = [
    { label: "Application Fee", key: "applicationFee" },
    { label: "Admin Fee", key: "adminFee" },
    { label: "Security Deposit", key: "securityDeposit" },
    { label: "MTM Fee", key: "mtmFee" },
    { label: "Pet Deposit", key: "petDeposit" },
    { label: "Pet Rent", key: "petRent" },
  ];

  function compFeeValues(key: FeeKey): number[] {
    return active.map((c) => c[key]).filter((v): v is number => v != null);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Fee Comparison</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-4">Fee</th>
              <th className="py-2 pr-4 text-right">Subject</th>
              <th className="py-2 pr-4 text-right">Market Avg</th>
              <th className="py-2 pr-4 text-right">Market Low</th>
              <th className="py-2 text-right">Market High</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((f) => {
              const subVal = subjectProperty ? subjectProperty[f.key] : null;
              const vals = compFeeValues(f.key);
              const mktAvg = vals.length > 0 ? avg(vals) : null;
              const mktLow = vals.length > 0 ? Math.min(...vals) : null;
              const mktHigh = vals.length > 0 ? Math.max(...vals) : null;
              return (
                <tr key={f.key} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-700">{f.label}</td>
                  <td className="py-2 pr-4 text-right text-slate-700">{fmt$(subVal)}</td>
                  <td className="py-2 pr-4 text-right text-slate-700">{fmt$(mktAvg)}</td>
                  <td className="py-2 pr-4 text-right text-slate-700">{fmt$(mktLow)}</td>
                  <td className="py-2 text-right text-slate-700">{fmt$(mktHigh)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AmenitySection({
  title,
  subjectAmenities,
  comps,
  amenityKey,
}: {
  title: string;
  subjectAmenities: string[];
  comps: Comp[];
  amenityKey: "communityAmenities" | "unitAmenities";
}) {
  const active = activeComps(comps);
  const totalComps = active.length;

  // Collect all unique amenities
  const allAmenities = new Set<string>();
  subjectAmenities.forEach((a) => allAmenities.add(a));
  active.forEach((c) => c[amenityKey].forEach((a) => allAmenities.add(a)));
  const sorted = Array.from(allAmenities).sort();

  // Count comps that have each amenity
  const compCounts = new Map<string, number>();
  sorted.forEach((a) => {
    compCounts.set(a, active.filter((c) => c[amenityKey].includes(a)).length);
  });

  const subjectSet = new Set(subjectAmenities);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400">No amenity data available.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((a) => {
            const hasSub = subjectSet.has(a);
            const count = compCounts.get(a) ?? 0;
            const mostCompsHave = totalComps > 0 && count >= totalComps * 0.5;
            const isDifferentiator = hasSub && !mostCompsHave;
            const isGap = !hasSub && mostCompsHave;

            let bg = "bg-slate-50";
            let border = "border-slate-200";
            if (isDifferentiator) {
              bg = "bg-emerald-50";
              border = "border-emerald-200";
            } else if (isGap) {
              bg = "bg-red-50";
              border = "border-red-200";
            }

            return (
              <div
                key={a}
                className={`flex items-center justify-between rounded-lg border ${border} ${bg} px-3 py-2 text-sm`}
              >
                <div className="flex items-center gap-2">
                  {hasSub ? (
                    <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="inline-block h-4 w-4 text-center text-xs text-slate-400">—</span>
                  )}
                  <span className="text-slate-700">{a}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {count}/{totalComps} comps
                </span>
              </div>
            );
          })}
        </div>
      )}
      {sorted.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-300" /> Differentiator (you have, most don&apos;t)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-300" /> Gap (most have, you don&apos;t)
          </span>
        </div>
      )}
    </div>
  );
}

function ConcessionsTable({
  subjectProperty,
  comps,
}: {
  subjectProperty: SubjectProperty | null;
  comps: Comp[];
}) {
  const active = activeComps(comps);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Concessions Overview</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-4">Property</th>
              <th className="py-2">Concessions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 bg-blue-50/40">
              <td className="py-2 pr-4 font-medium text-blue-700">Subject Property</td>
              <td className="py-2 text-slate-700">
                {subjectProperty?.concessions || "None listed"}
              </td>
            </tr>
            {active.map((c) => (
              <tr key={c.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium text-slate-700">{c.name}</td>
                <td className="py-2 text-slate-700">{c.concessions || "None listed"}</td>
              </tr>
            ))}
            {active.length === 0 && (
              <tr>
                <td colSpan={2} className="py-4 text-center text-slate-400">
                  No comp data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NotesSection({ comps }: { comps: Comp[] }) {
  const active = activeComps(comps);
  const withNotes = active.filter((c) => c.otherNotes.trim());

  if (withNotes.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Comp Notes</h2>
      <ul className="space-y-3">
        {withNotes.map((c) => (
          <li key={c.id} className="text-sm">
            <span className="font-medium text-slate-700">{c.name}:</span>{" "}
            <span className="text-slate-600">{c.otherNotes}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── map section ─────────────────────────────────────────────────────── */

function MapSection({
  property,
  comps,
}: {
  property: Property | null;
  comps: Comp[];
}) {
  const active = activeComps(comps);

  if (!property?.address) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-400 text-center">Map unavailable</p>
      </section>
    );
  }

  return (
    <div>
      <MapEmbed
        subjectAddress={property.address}
        subjectName={property.name}
        comps={active.map((c) => ({ address: c.address, name: c.name, cityState: c.cityState }))}
        height={350}
      />
      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 px-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
          Subject: {property.name}
        </span>
        {active.map((c, i) => (
          <span key={c.id} className="inline-flex items-center gap-1.5">
            <span className="relative inline-flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 text-[7px] font-bold leading-none text-white">
              {i + 1}
            </span>
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────────── */

export default function MarketSummary({
  property,
  subjectProperty,
  comps,
  rentRoll,
}: MarketSummaryProps) {
  const subjectPlans = subjectProperty?.floorPlans ?? [];
  const rrByType = rentRoll?.byType;
  const rentRows = buildRentRows(subjectPlans, rrByType, comps);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">
          Market Summary{property ? ` — ${property.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Side-by-side comparison of your property versus {activeComps(comps).length} market comp{activeComps(comps).length !== 1 ? "s" : ""}.
        </p>
      </div>

      {/* 0. Map */}
      <MapSection property={property} comps={comps} />

      {/* 1. Overview Cards */}
      <OverviewCards
        subjectPlans={subjectPlans}
        rrByType={rrByType}
        subjectProperty={subjectProperty}
        comps={comps}
      />

      {/* 2. Rent Comparison */}
      <RentComparisonTable rows={rentRows} />

      {/* 2b. Unit Type Breakdown — one table per type */}
      <UnitTypeTables
        property={property}
        subjectProperty={subjectProperty}
        comps={comps}
        rentRoll={rentRoll}
      />

      {/* 3. Fee Comparison */}
      <FeeComparisonTable subjectProperty={subjectProperty} comps={comps} />

      {/* 4. Amenity Comparison */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-semibold text-slate-800">Amenity Comparison</h2>
        <AmenitySection
          title="Community Amenities"
          subjectAmenities={subjectProperty?.communityAmenities ?? []}
          comps={comps}
          amenityKey="communityAmenities"
        />
        <AmenitySection
          title="In-Unit Amenities"
          subjectAmenities={subjectProperty?.unitAmenities ?? []}
          comps={comps}
          amenityKey="unitAmenities"
        />
      </section>

      {/* 5. Concessions */}
      <ConcessionsTable subjectProperty={subjectProperty} comps={comps} />

      {/* 6. Notes */}
      <NotesSection comps={comps} />
    </div>
  );
}
