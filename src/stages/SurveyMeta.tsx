import type { Comp } from "../lib/types";

interface SurveyMetaProps {
  comps: Comp[];
  onCompsChange: (comps: Comp[]) => void;
  preparedBy: string;
  surveyDate: string;
  comments: string;
  onFieldChange: (
    field: "preparedBy" | "surveyDate" | "comments",
    value: string,
  ) => void;
}

/* ── pill-shaped toggle ──────────────────────────────────────────────── */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/* ── main component ──────────────────────────────────────────────────── */

export default function SurveyMeta({
  comps,
  onCompsChange,
  preparedBy,
  surveyDate,
  comments,
  onFieldChange,
}: SurveyMetaProps) {
  const activeComps = comps.filter((c) => !c.excluded);

  function toggleField(compId: string, field: "called" | "toured") {
    onCompsChange(
      comps.map((c) =>
        c.id === compId ? { ...c, [field]: !c[field] } : c,
      ),
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Called / Toured ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Called / Toured
        </h2>

        {activeComps.length === 0 ? (
          <p className="text-sm text-slate-500">
            No active comps. Add comps in Stage 2 first.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeComps.map((comp) => (
              <div
                key={comp.id}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 first:pt-0 last:pb-0"
              >
                {/* name + address */}
                <div className="min-w-[200px] flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {comp.name || "Unnamed comp"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {comp.address || "No address"}
                  </p>
                </div>

                {/* called toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">
                    Called
                  </span>
                  <Toggle
                    checked={comp.called}
                    onChange={() => toggleField(comp.id, "called")}
                    label={`Mark ${comp.name} as called`}
                  />
                </div>

                {/* toured toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">
                    Toured
                  </span>
                  <Toggle
                    checked={comp.toured}
                    onChange={() => toggleField(comp.id, "toured")}
                    label={`Mark ${comp.name} as toured`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Survey Info ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Survey Info
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="preparedBy"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Prepared By
            </label>
            <input
              id="preparedBy"
              type="text"
              value={preparedBy}
              onChange={(e) => onFieldChange("preparedBy", e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="surveyDate"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Survey Date
            </label>
            <input
              id="surveyDate"
              type="date"
              value={surveyDate}
              onChange={(e) => onFieldChange("surveyDate", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* ── Comments ────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Comments</h2>

        <textarea
          value={comments}
          onChange={(e) => onFieldChange("comments", e.target.value)}
          rows={5}
          placeholder="Add any notes about this survey..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </section>

      {/* ── Export (placeholder) ─────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Export</h2>

        <div className="flex flex-wrap gap-3">
          {/* Google Sheets */}
          <button
            disabled
            title="Coming soon"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400 shadow-sm cursor-not-allowed"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Export to Google Sheets
          </button>

          {/* Excel */}
          <button
            disabled
            title="Coming soon"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400 shadow-sm cursor-not-allowed"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Excel
          </button>

          {/* PDF */}
          <button
            disabled
            title="Coming soon"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400 shadow-sm cursor-not-allowed"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Download PDF
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Export functionality is coming soon.
        </p>
      </section>
    </div>
  );
}
