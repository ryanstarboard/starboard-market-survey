import { useState } from "react";
import type { Comp, OtherFee } from "../lib/types";
import { FloorPlanTable } from "./FloorPlanTable";

interface CompCardProps {
  comp: Comp;
  onChange: (updated: Comp) => void;
  onExclude: () => void;
  unitTypes?: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function avgRent(comp: Comp): string {
  const rents = comp.floorPlans.filter((fp) => fp.rent !== null).map((fp) => fp.rent as number);
  if (rents.length === 0) return "—";
  const avg = rents.reduce((a, b) => a + b, 0) / rents.length;
  return formatCurrency(Math.round(avg));
}

const SOURCE_COLORS: Record<string, string> = {
  Zillow: "bg-blue-100 text-blue-700",
  "Apartments.com": "bg-green-100 text-green-700",
  Manual: "bg-slate-100 text-slate-600",
  "Property website": "bg-purple-100 text-purple-700",
};

function sourceBadge(source: string) {
  const cls = SOURCE_COLORS[source] || "bg-slate-100 text-slate-600";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {source || "Manual"}
    </span>
  );
}

// ── Amenity Options ─────────────────────────────────────────────────────────

const COMMUNITY_AMENITIES = [
  "Pool", "Fitness Center", "Clubhouse", "Business Center", "Dog Park",
  "Playground", "BBQ/Grill Area", "Package Lockers", "EV Charging",
  "Gated Access", "Garage Parking", "Covered Parking", "Storage Units",
  "On-Site Laundry", "Bike Storage",
];

const UNIT_AMENITIES = [
  "Washer/Dryer", "W/D Hookups", "Dishwasher", "Microwave",
  "Stainless Appliances", "Granite/Quartz Counters", "Hardwood/Vinyl Plank",
  "Carpet", "Patio/Balcony", "Walk-In Closet", "Fireplace", "Central AC",
  "Smart Thermostat", "USB Outlets",
];

// ── Inline Editable Fields ───────────────────────────────────────────────────

function EditableText({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        className={`border border-blue-400 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${className || ""}`}
        defaultValue={value}
        onBlur={(e) => {
          onChange(e.target.value);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <span
      className={`cursor-pointer hover:bg-blue-50 rounded px-1 transition-colors ${className || ""}`}
      onClick={() => setEditing(true)}
    >
      {value || <span className="text-slate-400 italic">{placeholder || "Click to edit"}</span>}
    </span>
  );
}

function EditableNumber({
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        className="border border-blue-400 rounded px-2 py-0.5 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
        defaultValue={value !== null ? String(value) : ""}
        onBlur={(e) => {
          const raw = e.target.value.trim();
          onChange(raw === "" ? null : Number(raw));
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  const display =
    value !== null && value !== undefined
      ? `${prefix || ""}${value.toLocaleString()}${suffix || ""}`
      : null;

  return (
    <span
      className="cursor-pointer hover:bg-blue-50 rounded px-1 transition-colors"
      onClick={() => setEditing(true)}
    >
      {display || <span className="text-slate-400 italic">{placeholder || "—"}</span>}
    </span>
  );
}

function EditableCurrency({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return <EditableNumber value={value} onChange={onChange} prefix="$" placeholder={placeholder} />;
}

function EditableToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  const isOn = value === true;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600">{label}</span>
      <button
        onClick={() => onChange(!isOn)}
        className={`relative w-9 h-5 rounded-full transition-colors ${isOn ? "bg-blue-500" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isOn ? "translate-x-4" : ""}`}
        />
      </button>
    </div>
  );
}

// ── Field Row Helper ─────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs font-medium text-slate-500 w-32 shrink-0">{label}</span>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-200 mt-3 mb-2 pb-1">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h4>
    </div>
  );
}

// ── Amenity Pill Grid ────────────────────────────────────────────────────────

function AmenityGrid({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (updated: string[]) => void;
}) {
  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((s) => s !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {options.map((name) => {
        const isOn = selected.includes(name);
        return (
          <button
            key={name}
            onClick={() => toggle(name)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              isOn
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-300"
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

// ── Other Fees Editor ────────────────────────────────────────────────────────

function OtherFeesEditor({
  fees,
  onChange,
}: {
  fees: OtherFee[];
  onChange: (updated: OtherFee[]) => void;
}) {
  const updateFee = (index: number, patch: Partial<OtherFee>) => {
    const updated = fees.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(updated);
  };

  const addFee = () => {
    onChange([...fees, { name: "", amount: null, type: "monthly" }]);
  };

  const removeFee = (index: number) => {
    onChange(fees.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2 mt-1">
      {fees.map((fee, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            className="border border-slate-300 rounded px-2 py-1 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
            placeholder="Fee name"
            value={fee.name}
            onChange={(e) => updateFee(i, { name: e.target.value })}
          />
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate-500">$</span>
            <input
              type="number"
              className="border border-slate-300 rounded px-2 py-1 text-sm w-20 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
              placeholder="0"
              value={fee.amount !== null ? String(fee.amount) : ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                updateFee(i, { amount: raw === "" ? null : Number(raw) });
              }}
            />
          </div>
          <div className="flex rounded-full border border-slate-300 overflow-hidden text-xs">
            <button
              onClick={() => updateFee(i, { type: "move-in" })}
              className={`px-2.5 py-1 transition-colors ${
                fee.type === "move-in"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Move-in
            </button>
            <button
              onClick={() => updateFee(i, { type: "monthly" })}
              className={`px-2.5 py-1 transition-colors ${
                fee.type === "monthly"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Monthly
            </button>
          </div>
          <button
            onClick={() => removeFee(i)}
            className="text-slate-400 hover:text-red-500 transition-colors text-sm font-bold ml-1"
            title="Remove fee"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={addFee}
        className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
      >
        + Add Fee
      </button>
    </div>
  );
}

// ── CompCard ─────────────────────────────────────────────────────────────────

export function CompCard({ comp, onChange, onExclude, unitTypes }: CompCardProps) {
  const [expanded, setExpanded] = useState(false);

  const update = <K extends keyof Comp>(field: K, value: Comp[K]) => {
    onChange({ ...comp, [field]: value });
  };

  // ── Collapsed View ──
  if (!expanded) {
    return (
      <div
        className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-3 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 truncate">
                {comp.name || "Unnamed Comp"}
              </div>
              <div className="text-xs text-slate-500 truncate">{comp.address || "No address"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-medium text-slate-700">
              Avg Rent: {avgRent(comp)}
            </span>
            {/* Called / Toured pill toggles */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => update("called", !comp.called)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                  comp.called
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                Called
              </button>
              <button
                onClick={() => update("toured", !comp.toured)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                  comp.toured
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                Toured
              </button>
            </div>
            {sourceBadge(comp.source)}
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // ── Expanded View ──
  return (
    <div className="bg-white rounded-lg shadow-md border border-blue-200 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <div className="font-semibold text-slate-800">
            <EditableText value={comp.name} onChange={(v) => update("name", v)} placeholder="Comp name" />
          </div>
          {sourceBadge(comp.source)}
        </div>
        <button
          onClick={onExclude}
          className="px-3 py-1 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
        >
          Exclude
        </button>
      </div>

      <div className="px-4 py-3 space-y-1">
        {/* ── 1. Location & Contact ── */}
        <SectionHeader title="Location & Contact" />
        <div className="grid grid-cols-2 gap-x-6">
          <FieldRow label="Address">
            <EditableText value={comp.address} onChange={(v) => update("address", v)} placeholder="Address" />
          </FieldRow>
          <FieldRow label="City/State">
            <EditableText value={comp.cityState} onChange={(v) => update("cityState", v)} placeholder="City, ST" />
          </FieldRow>
          <FieldRow label="Distance">
            <EditableText value={comp.distanceFromSubject} onChange={(v) => update("distanceFromSubject", v)} placeholder="e.g. 0.5 mi" />
          </FieldRow>
          <FieldRow label="Phone">
            <EditableText value={comp.phone} onChange={(v) => update("phone", v)} placeholder="Phone" />
          </FieldRow>
        </div>

        {/* ── 2. Property Info ── */}
        <SectionHeader title="Property Info" />
        <div className="grid grid-cols-3 gap-x-6">
          <FieldRow label="Total Units">
            <EditableNumber value={comp.totalUnits} onChange={(v) => update("totalUnits", v ?? 0)} />
          </FieldRow>
          <FieldRow label="Year Built">
            <EditableText value={comp.yearBuilt || ""} onChange={(v) => update("yearBuilt", v || null)} placeholder="e.g. 2005" />
          </FieldRow>
          <FieldRow label="Leased %">
            <EditableNumber value={comp.leasedPct} onChange={(v) => update("leasedPct", v)} suffix="%" />
          </FieldRow>
          <FieldRow label="Occupancy %">
            <EditableNumber value={comp.occupancyPct} onChange={(v) => update("occupancyPct", v)} suffix="%" />
          </FieldRow>
          <FieldRow label="Lease Terms">
            <EditableText value={comp.leaseTerms} onChange={(v) => update("leaseTerms", v)} placeholder="e.g. 3, 6, 12 mo" />
          </FieldRow>
        </div>
        <div className="flex gap-6 mt-1">
          <EditableToggle label="Renovated" value={comp.renovated} onChange={(v) => update("renovated", v)} />
          {comp.renovated && (
            <FieldRow label="Reno Date">
              <EditableText value={comp.renoDate || ""} onChange={(v) => update("renoDate", v || null)} placeholder="e.g. 2023" />
            </FieldRow>
          )}
          <EditableToggle label="Furnished" value={comp.furnished} onChange={(v) => update("furnished", v)} />
          <EditableToggle label="Corporate Units" value={comp.corporateUnits} onChange={(v) => update("corporateUnits", v)} />
        </div>

        {/* ── 3. Floor Plans ── */}
        <SectionHeader title="Floor Plans" />
        <FloorPlanTable
          floorPlans={comp.floorPlans}
          onChange={(plans) => update("floorPlans", plans)}
          unitTypes={unitTypes}
        />

        {/* ── 4. Cost to Rent ── */}
        <SectionHeader title="Cost to Rent" />
        <div className="grid grid-cols-3 gap-x-6">
          <FieldRow label="Application Fee">
            <EditableCurrency value={comp.applicationFee} onChange={(v) => update("applicationFee", v)} />
          </FieldRow>
          <FieldRow label="Admin Fee">
            <EditableCurrency value={comp.adminFee} onChange={(v) => update("adminFee", v)} />
          </FieldRow>
          <FieldRow label="Security Deposit">
            <EditableCurrency value={comp.securityDeposit} onChange={(v) => update("securityDeposit", v)} />
          </FieldRow>
          <FieldRow label="MTM Fee">
            <EditableCurrency value={comp.mtmFee} onChange={(v) => update("mtmFee", v)} />
          </FieldRow>
          <FieldRow label="Utilities Incl.">
            <EditableText value={comp.utilitiesIncluded} onChange={(v) => update("utilitiesIncluded", v)} placeholder="e.g. Water/Trash" />
          </FieldRow>
        </div>
        <div className="mt-2">
          <span className="text-xs font-medium text-slate-500">Other Fees</span>
          <OtherFeesEditor
            fees={comp.otherFees}
            onChange={(fees) => update("otherFees", fees)}
          />
        </div>

        {/* ── 5. Specials ── */}
        <SectionHeader title="Specials" />
        <div className="grid grid-cols-2 gap-x-6">
          <FieldRow label="Concessions">
            <EditableText value={comp.concessions} onChange={(v) => update("concessions", v)} placeholder="e.g. 1 month free" />
          </FieldRow>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <EditableToggle label="Resident Referrals" value={comp.residentReferrals} onChange={(v) => update("residentReferrals", v)} />
          {comp.residentReferrals && (
            <FieldRow label="Referral Amount">
              <EditableCurrency value={comp.referralAmount} onChange={(v) => update("referralAmount", v)} placeholder="Amount" />
            </FieldRow>
          )}
        </div>

        {/* ── 6. Amenities ── */}
        <SectionHeader title="Amenities" />
        <div className="space-y-3">
          <div>
            <span className="text-xs font-medium text-slate-500">Community Amenities</span>
            <AmenityGrid
              options={COMMUNITY_AMENITIES}
              selected={comp.communityAmenities}
              onChange={(v) => update("communityAmenities", v)}
            />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500">In-Unit Amenities</span>
            <AmenityGrid
              options={UNIT_AMENITIES}
              selected={comp.unitAmenities}
              onChange={(v) => update("unitAmenities", v)}
            />
          </div>
        </div>

        {/* ── 7. Pets ── */}
        <SectionHeader title="Pets" />
        <div className="grid grid-cols-3 gap-x-6">
          <FieldRow label="Pet Limit">
            <EditableText value={comp.petLimit} onChange={(v) => update("petLimit", v)} placeholder="e.g. 2 pets" />
          </FieldRow>
          <FieldRow label="Pet Deposit">
            <EditableCurrency value={comp.petDeposit} onChange={(v) => update("petDeposit", v)} />
          </FieldRow>
          <FieldRow label="Pet Rent">
            <EditableCurrency value={comp.petRent} onChange={(v) => update("petRent", v)} />
          </FieldRow>
          <FieldRow label="Pet Fee">
            <EditableCurrency value={comp.petFee} onChange={(v) => update("petFee", v)} />
          </FieldRow>
          <FieldRow label="Pet Rules">
            <EditableText value={comp.petRules} onChange={(v) => update("petRules", v)} placeholder="Rules" className="w-full" />
          </FieldRow>
        </div>

        {/* ── 8. Notes ── */}
        <SectionHeader title="Notes" />
        <FieldRow label="Other Notes">
          <EditableText value={comp.otherNotes} onChange={(v) => update("otherNotes", v)} placeholder="Notes" />
        </FieldRow>
      </div>
    </div>
  );
}
