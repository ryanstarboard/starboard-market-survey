import { useState } from "react";
import type { Comp, RentRollSummary, Property } from "../lib/types";
import { CompCard } from "../components/CompCard";
import ExcludeModal from "../components/ExcludeModal";
import { fetchCompSuggestions } from "../lib/api";
import type { CompSuggestion } from "../lib/api";

interface CompDataProps {
  comps: Comp[];
  onCompsChange: (comps: Comp[]) => void;
  property: Property | null;
  rentRoll: RentRollSummary | null;
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

function suggestionToComp(s: CompSuggestion): Comp {
  return {
    ...blankComp(),
    id: generateId(),
    name: s.name,
    address: s.address,
    cityState: s.cityState,
    distanceFromSubject: s.distanceFromSubject,
    phone: s.phone || "",
    totalUnits: s.totalUnits || 0,
    leaseTerms: s.leaseTerms || "",
    utilitiesIncluded: s.utilitiesIncluded || "",
    otherNotes: s.reasoning || "",
    source: "AI Suggestion",
  };
}

export default function CompData({ comps, onCompsChange, property, rentRoll }: CompDataProps) {
  const [excludedOpen, setExcludedOpen] = useState(false);
  const [excludingCompId, setExcludingCompId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const activeComps = comps.filter((c) => !c.excluded);
  const excludedComps = comps.filter((c) => c.excluded);

  const handleCompChange = (updated: Comp) => {
    onCompsChange(comps.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleExclude = (compId: string) => {
    setExcludingCompId(compId);
  };

  const confirmExclude = (reasons: string[]) => {
    if (!excludingCompId) return;
    onCompsChange(
      comps.map((c) =>
        c.id === excludingCompId
          ? { ...c, excluded: true, excludeReasons: reasons }
          : c
      )
    );
    setExcludingCompId(null);
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

  const findCompsWithAI = async () => {
    if (!property) return;
    setAiLoading(true);
    setAiError(null);

    const unitMix = rentRoll
      ? rentRoll.byType.map((t) => ({
          type: t.type,
          count: t.count,
          avgRent: t.avgRent,
        }))
      : [];

    try {
      const suggestions = await fetchCompSuggestions(
        property.name,
        property.address,
        unitMix
      );
      const newComps = suggestions.map(suggestionToComp);
      onCompsChange([...comps, ...newComps]);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to find comps");
    } finally {
      setAiLoading(false);
    }
  };

  const excludingComp = comps.find((c) => c.id === excludingCompId);

  const canSearchAI = !!property && !aiLoading;

  return (
    <div className="space-y-4">
      <ExcludeModal
        isOpen={!!excludingCompId}
        compName={excludingComp?.name || "this comp"}
        onConfirm={confirmExclude}
        onCancel={() => setExcludingCompId(null)}
      />

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
        <div className="flex items-center gap-2">
          <button
            onClick={findCompsWithAI}
            disabled={!canSearchAI}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm inline-flex items-center gap-2"
          >
            {aiLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find Comps with AI
              </>
            )}
          </button>
          <button
            onClick={addComp}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            + Add Manually
          </button>
        </div>
      </div>

      {/* AI Error */}
      {aiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{aiError}</span>
          <button onClick={() => setAiError(null)} className="text-red-400 hover:text-red-600 ml-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Empty state */}
      {activeComps.length === 0 && excludedComps.length === 0 && !aiLoading && (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">No comps yet</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
            Click "Find Comps with AI" to automatically search for comparable properties near {property?.name || "your property"}.
          </p>
          <button
            onClick={findCompsWithAI}
            disabled={!canSearchAI}
            className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-sm inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find Comps with AI
          </button>
        </div>
      )}

      {/* Loading state */}
      {aiLoading && activeComps.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <svg className="w-10 h-10 mx-auto mb-3 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-medium text-slate-600">Searching for comparable properties...</p>
          <p className="text-xs text-slate-400 mt-1">This may take 15-30 seconds</p>
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
