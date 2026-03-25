import { useState, useEffect } from "react";
import type { SubjectProperty as SubjectPropertyType, OtherFee, FloorPlan, RentRollSummary } from "../lib/types";
import { FloorPlanTable } from "../components/FloorPlanTable";

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function createDefault(rentRoll: RentRollSummary | null): SubjectPropertyType {
  const floorPlans: FloorPlan[] = rentRoll
    ? rentRoll.byType.map((bt) => ({
        type: bt.type,
        sqft: bt.avgSqft ?? null,
        unitCount: bt.count,
        leasedPct: bt.leasedPct ?? null,
        rent: Math.round(bt.avgRent),
        adRent: null,
        psf:
          bt.avgSqft && bt.avgRent
            ? Math.round((bt.avgRent / bt.avgSqft) * 100) / 100
            : null,
      }))
    : [];

  return {
    yearBuilt: null,
    renovated: null,
    renoDate: null,
    furnished: null,
    leasedPct: null,
    occupancyPct: null,
    applicationFee: null,
    adminFee: null,
    securityDeposit: null,
    mtmFee: null,
    leaseTerms: "",
    utilitiesIncluded: "",
    otherFees: [],
    concessions: "",
    residentReferrals: null,
    referralAmount: null,
    communityAmenities: [],
    unitAmenities: [],
    petLimit: "",
    petDeposit: null,
    petRent: null,
    petFee: null,
    petRules: "",
    otherNotes: "",
    floorPlans,
  };
}

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
      {display || <span className="text-slate-400 italic">{placeholder || "\u2014"}</span>}
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

// ── Field Row & Section Header ───────────────────────────────────────────────

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
    <div className="border-b border-slate-200 mt-4 mb-2 pb-1">
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
            &#10005;
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

// ── SubjectProperty Stage ────────────────────────────────────────────────────

interface SubjectPropertyStageProps {
  subjectProperty: SubjectPropertyType | null;
  propertyName: string;
  rentRoll: RentRollSummary | null;
  onChange: (sp: SubjectPropertyType) => void;
}

export default function SubjectPropertyStage({
  subjectProperty,
  propertyName,
  rentRoll,
  onChange,
}: SubjectPropertyStageProps) {
  const [sp, setSp] = useState<SubjectPropertyType>(() =>
    subjectProperty ?? createDefault(rentRoll)
  );

  // Sync parent when sp was initialized from null
  useEffect(() => {
    if (!subjectProperty) {
      onChange(sp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = <K extends keyof SubjectPropertyType>(field: K, value: SubjectPropertyType[K]) => {
    const updated = { ...sp, [field]: value };
    setSp(updated);
    onChange(updated);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">{propertyName}</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter the subject property details. These will appear in the subject column of the market survey export.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-6 py-4">
        {/* Property Info */}
        <SectionHeader title="Property Info" />
        <div className="grid grid-cols-3 gap-x-6">
          <FieldRow label="Year Built">
            <EditableText value={sp.yearBuilt || ""} onChange={(v) => update("yearBuilt", v || null)} placeholder="e.g. 2005" />
          </FieldRow>
          <FieldRow label="Leased %">
            <EditableNumber value={sp.leasedPct} onChange={(v) => update("leasedPct", v)} suffix="%" />
          </FieldRow>
          <FieldRow label="Occupancy %">
            <EditableNumber value={sp.occupancyPct} onChange={(v) => update("occupancyPct", v)} suffix="%" />
          </FieldRow>
          <FieldRow label="Lease Terms">
            <EditableText value={sp.leaseTerms} onChange={(v) => update("leaseTerms", v)} placeholder="e.g. 3, 6, 12 mo" />
          </FieldRow>
        </div>
        <div className="flex gap-6 mt-1">
          <EditableToggle label="Renovated" value={sp.renovated} onChange={(v) => update("renovated", v)} />
          {sp.renovated && (
            <FieldRow label="Reno Date">
              <EditableText value={sp.renoDate || ""} onChange={(v) => update("renoDate", v || null)} placeholder="e.g. 2023" />
            </FieldRow>
          )}
          <EditableToggle label="Furnished" value={sp.furnished} onChange={(v) => update("furnished", v)} />
        </div>

        {/* Floor Plans */}
        <SectionHeader title="Floor Plans" />
        <FloorPlanTable
          floorPlans={sp.floorPlans}
          onChange={(plans) => update("floorPlans", plans)}
        />

        {/* Cost to Rent */}
        <SectionHeader title="Cost to Rent" />
        <div className="grid grid-cols-3 gap-x-6">
          <FieldRow label="Application Fee">
            <EditableCurrency value={sp.applicationFee} onChange={(v) => update("applicationFee", v)} />
          </FieldRow>
          <FieldRow label="Admin Fee">
            <EditableCurrency value={sp.adminFee} onChange={(v) => update("adminFee", v)} />
          </FieldRow>
          <FieldRow label="Security Deposit">
            <EditableCurrency value={sp.securityDeposit} onChange={(v) => update("securityDeposit", v)} />
          </FieldRow>
          <FieldRow label="MTM Fee">
            <EditableCurrency value={sp.mtmFee} onChange={(v) => update("mtmFee", v)} />
          </FieldRow>
          <FieldRow label="Utilities Incl.">
            <EditableText value={sp.utilitiesIncluded} onChange={(v) => update("utilitiesIncluded", v)} placeholder="e.g. Water/Trash" />
          </FieldRow>
        </div>
        <div className="mt-2">
          <span className="text-xs font-medium text-slate-500">Other Fees</span>
          <OtherFeesEditor
            fees={sp.otherFees}
            onChange={(fees) => update("otherFees", fees)}
          />
        </div>

        {/* Specials */}
        <SectionHeader title="Specials" />
        <div className="grid grid-cols-2 gap-x-6">
          <FieldRow label="Concessions">
            <EditableText value={sp.concessions} onChange={(v) => update("concessions", v)} placeholder="e.g. 1 month free" />
          </FieldRow>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <EditableToggle label="Resident Referrals" value={sp.residentReferrals} onChange={(v) => update("residentReferrals", v)} />
          {sp.residentReferrals && (
            <FieldRow label="Referral Amount">
              <EditableCurrency value={sp.referralAmount} onChange={(v) => update("referralAmount", v)} placeholder="Amount" />
            </FieldRow>
          )}
        </div>

        {/* Amenities */}
        <SectionHeader title="Amenities" />
        <div className="space-y-3">
          <div>
            <span className="text-xs font-medium text-slate-500">Community Amenities</span>
            <AmenityGrid
              options={COMMUNITY_AMENITIES}
              selected={sp.communityAmenities}
              onChange={(v) => update("communityAmenities", v)}
            />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500">In-Unit Amenities</span>
            <AmenityGrid
              options={UNIT_AMENITIES}
              selected={sp.unitAmenities}
              onChange={(v) => update("unitAmenities", v)}
            />
          </div>
        </div>

        {/* Pets */}
        <SectionHeader title="Pets" />
        <div className="grid grid-cols-3 gap-x-6">
          <FieldRow label="Pet Limit">
            <EditableText value={sp.petLimit} onChange={(v) => update("petLimit", v)} placeholder="e.g. 2 pets" />
          </FieldRow>
          <FieldRow label="Pet Deposit">
            <EditableCurrency value={sp.petDeposit} onChange={(v) => update("petDeposit", v)} />
          </FieldRow>
          <FieldRow label="Pet Rent">
            <EditableCurrency value={sp.petRent} onChange={(v) => update("petRent", v)} />
          </FieldRow>
          <FieldRow label="Pet Fee">
            <EditableCurrency value={sp.petFee} onChange={(v) => update("petFee", v)} />
          </FieldRow>
          <FieldRow label="Pet Rules">
            <EditableText value={sp.petRules} onChange={(v) => update("petRules", v)} placeholder="Rules" className="w-full" />
          </FieldRow>
        </div>

        {/* Notes */}
        <SectionHeader title="Notes" />
        <FieldRow label="Other Notes">
          <EditableText value={sp.otherNotes} onChange={(v) => update("otherNotes", v)} placeholder="Notes" />
        </FieldRow>
      </div>
    </div>
  );
}
