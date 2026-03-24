import { useCallback, useRef, useState } from "react";
import type { RentRollSummary, RentRollRow } from "../lib/types";
import { parseRentRoll, summarizeRentRoll } from "../lib/rentroll";

type RRTab = "all" | "avgMI" | "recent" | "recentAvgMI";

interface RentRollProps {
  rentRoll: RentRollSummary | null;
  rrTab: RRTab;
  onRentRollParsed: (summary: RentRollSummary) => void;
  onTabChange: (tab: RRTab) => void;
}

// ── Formatting helpers ───────────────────────────────────────────────────────

function fmtCurrency(value: number | null): string {
  if (value == null) return "—";
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

// ── Tab definitions ──────────────────────────────────────────────────────────

const TABS: { key: RRTab; label: string }[] = [
  { key: "all", label: "All Units" },
  { key: "avgMI", label: "Avg Move-In" },
  { key: "recent", label: "Most Recent" },
  { key: "recentAvgMI", label: "Recent Avg MI" },
];

// ── Upload area ──────────────────────────────────────────────────────────────

function UploadArea({
  onFile,
  loading,
  error,
}: {
  onFile: (file: File) => void;
  loading: boolean;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-xl">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={handleChange}
          />

          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <svg
                className="w-10 h-10 text-blue-500 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm text-slate-600 font-medium">
                Parsing rent roll...
              </p>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                Upload Rent Roll
              </h3>
              <p className="text-sm text-slate-500 mb-1">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-xs text-slate-400">
                Accepts .xlsx and .csv files
              </p>
            </>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* AppFolio instructions */}
        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">
            AppFolio Download Instructions
          </h4>
          <ol className="text-sm text-slate-600 space-y-1.5 list-decimal list-inside">
            <li>Log in to AppFolio</li>
            <li>
              Search for{" "}
              <span className="font-medium text-slate-700">Market Survey</span>
            </li>
            <li>
              Navigate to the{" "}
              <span className="font-medium text-slate-700">Market Survey Rent Roll</span>{" "}
              report
            </li>
            <li>Select the property</li>
            <li>
              Click{" "}
              <span className="font-medium text-slate-700">Export</span> &rarr;
              choose{" "}
              <span className="font-medium text-slate-700">Excel (.xlsx)</span>
            </li>
            <li>Upload the file here</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ── Data tables ──────────────────────────────────────────────────────────────

function AllUnitsTable({ data }: { data: RentRollSummary }) {
  return (
    <Table
      columns={["Type", "Count", "Avg Rent", "Low", "High"]}
      rows={data.byType.map((t) => [
        t.type,
        String(t.count),
        fmtCurrency(t.avgRent),
        fmtCurrency(t.low),
        fmtCurrency(t.high),
      ])}
    />
  );
}

function AvgMoveInTable({ data }: { data: RentRollSummary }) {
  return (
    <Table
      columns={["Type", "Count", "Avg Rent", "Avg Move-In", "Tenure (mo)"]}
      rows={data.byType.map((t) => [
        t.type,
        String(t.count),
        fmtCurrency(t.avgRent),
        fmtDate(t.avgMoveInDate),
        String(Math.round(t.avgTenureMonths)),
      ])}
    />
  );
}

function MostRecentTable({ recent }: { recent: RentRollRow[] }) {
  return (
    <Table
      columns={["Unit", "Type", "Sqft", "Rent", "Move-In"]}
      rows={recent.map((r) => [
        r.unit,
        r.bdBa || r.unitType,
        r.sqft != null ? String(r.sqft) : "—",
        fmtCurrency(r.rent),
        fmtDate(r.moveIn),
      ])}
    />
  );
}

function RecentAvgMITable({ recent }: { recent: RentRollRow[] }) {
  // Group recent rows by bdBa and compute averages
  const grouped = new Map<
    string,
    { count: number; totalRent: number; moveInDates: number[] }
  >();

  for (const r of recent) {
    const key = r.bdBa || r.unitType;
    const entry = grouped.get(key) || { count: 0, totalRent: 0, moveInDates: [] };
    entry.count++;
    if (r.rent != null) entry.totalRent += r.rent;
    if (r.moveIn) {
      const ts = new Date(r.moveIn).getTime();
      if (!isNaN(ts)) entry.moveInDates.push(ts);
    }
    grouped.set(key, entry);
  }

  const rows = Array.from(grouped.entries()).map(([type, g]) => {
    const avgRent = g.count > 0 ? Math.round(g.totalRent / g.count) : 0;
    const avgMI =
      g.moveInDates.length > 0
        ? new Date(
            g.moveInDates.reduce((a, b) => a + b, 0) / g.moveInDates.length,
          ).toISOString()
        : null;
    return [type, String(g.count), fmtCurrency(avgRent), fmtDate(avgMI)];
  });

  return (
    <Table columns={["Type", "Count", "Avg Rent", "Avg Move-In"]} rows={rows} />
  );
}

function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100 text-slate-600">
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-2.5 text-left font-semibold whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-slate-400"
              >
                No data available
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-4 py-2 text-slate-700 whitespace-nowrap"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function RentRoll({
  rentRoll,
  rrTab,
  onRentRollParsed,
  onTabChange,
}: RentRollProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        const rows = await parseRentRoll(file);
        const summary = summarizeRentRoll(rows);
        onRentRollParsed(summary);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to parse rent roll";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [onRentRollParsed],
  );

  // Before upload
  if (!rentRoll) {
    return <UploadArea onFile={handleFile} loading={loading} error={error} />;
  }

  // After upload
  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Header with Re-upload */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">
          Rent Roll Summary
        </h3>
        <button
          onClick={() => onRentRollParsed(null as unknown as RentRollSummary)}
          className="text-sm text-slate-500 hover:text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Re-upload
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              rrTab === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {rrTab === "all" && <AllUnitsTable data={rentRoll} />}
      {rrTab === "avgMI" && <AvgMoveInTable data={rentRoll} />}
      {rrTab === "recent" && <MostRecentTable recent={rentRoll.recent} />}
      {rrTab === "recentAvgMI" && (
        <RecentAvgMITable recent={rentRoll.recent} />
      )}
    </div>
  );
}
