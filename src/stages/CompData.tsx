import { useState } from "react";
import type { Comp } from "../lib/types";
import { CompCard } from "../components/CompCard";

interface CompDataProps {
  comps: Comp[];
  onCompsChange: (comps: Comp[]) => void;
}

function generateId(): string {
  return "comp_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
}

function blankComp(): Comp {
  return {
    id: generateId(),
    name: "",
    address: "",
    cityState: "",
    distanceFromSubject: "",
    phone: "",
    totalUnits: 0,
    leasedPct: null,
    occupancyPct: null,
    applicationFee: null,
    adminFee: null,
    mtmFee: null,
    corporateUnits: null,
    residentReferrals: null,
    leaseTerms: "",
    utilitiesIncluded: "",
    petLimit: "",
    petDeposit: null,
    petRent: null,
    petFee: null,
    petRules: "",
    renovated: null,
    renoDate: null,
    concessions: "",
    otherNotes: "",
    floorPlans: [],
    called: false,
    toured: false,
    excluded: false,
    excludeReasons: [],
    source: "Manual",
  };
}

export default function CompData({ comps, onCompsChange }: CompDataProps) {
  const [excludedOpen, setExcludedOpen] = useState(false);

  const activeComps = comps.filter((c) => !c.excluded);
  const excludedComps = comps.filter((c) => c.excluded);

  const handleCompChange = (updated: Comp) => {
    onCompsChange(comps.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleExclude = (compId: string) => {
    // For now, directly mark as excluded with a placeholder reason.
    // In the future, this opens ExcludeModal.
    onCompsChange(
      comps.map((c) =>
        c.id === compId
          ? { ...c, excluded: true, excludeReasons: c.excludeReasons.length ? c.excludeReasons : ["Excluded by user"] }
          : c
      )
    );
  };

  const handleReinclude = (compId: string) => {
    onCompsChange(
      comps.map((c) =>
        c.id === compId ? { ...c, excluded: false, excludeReasons: [] } : c
      )
    );
  };

  const addComp = () => {
    onCompsChange([...comps, blankComp()]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Comp Data</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {activeComps.length} Comp{activeComps.length !== 1 ? "s" : ""}
          </span>
          {excludedComps.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
              {excludedComps.length} Excluded
            </span>
          )}
        </div>
        <button
          onClick={addComp}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          + Add Comp
        </button>
      </div>

      {/* Active Comps */}
      {activeComps.length === 0 && excludedComps.length === 0 && (
        <div className="text-center py-12 text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
          <p className="text-sm">No comps yet. Add manually or use AI suggestions in a future update.</p>
        </div>
      )}

      <div className="space-y-3">
        {activeComps.map((comp) => (
          <CompCard
            key={comp.id}
            comp={comp}
            onChange={handleCompChange}
            onExclude={() => handleExclude(comp.id)}
          />
        ))}
      </div>

      {/* Excluded Section */}
      {excludedComps.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setExcludedOpen(!excludedOpen)}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${excludedOpen ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Excluded ({excludedComps.length})
          </button>

          {excludedOpen && (
            <div className="mt-3 space-y-2">
              {excludedComps.map((comp) => (
                <div
                  key={comp.id}
                  className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-3 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-600">
                        {comp.name || "Unnamed Comp"}
                      </div>
                      <div className="text-xs text-slate-400">{comp.address || "No address"}</div>
                      {comp.excludeReasons.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {comp.excludeReasons.map((reason, i) => (
                            <span
                              key={i}
                              className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleReinclude(comp.id)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                    >
                      Re-include
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
