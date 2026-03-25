import { useState } from "react";
import type { Comp, Property, SubjectProperty, RentRollSummary } from "../lib/types";
import { exportToExcel } from "../lib/export";
import { exportPdfSummary, exportPdfDetail } from "../lib/exportPdf";

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
  property: Property | null;
  subjectProperty: SubjectProperty | null;
  rentRoll: RentRollSummary | null;
}

/* ── main component ──────────────────────────────────────────────────── */

export default function SurveyMeta({
  comps,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCompsChange: _onCompsChange,
  preparedBy,
  surveyDate,
  comments,
  onFieldChange,
  property,
  subjectProperty,
  rentRoll,
}: SurveyMetaProps) {
  const [pdfSummaryLoading, setPdfSummaryLoading] = useState(false);
  const [pdfDetailLoading, setPdfDetailLoading] = useState(false);

  const handlePdfSummary = async () => {
    if (!property) return;
    setPdfSummaryLoading(true);
    try {
      await exportPdfSummary(
        property,
        subjectProperty,
        comps,
        rentRoll,
        preparedBy,
        surveyDate,
        comments,
      );
    } catch (err) {
      console.error("PDF summary export failed:", err);
      alert("Failed to generate PDF summary. Please try again.");
    } finally {
      setPdfSummaryLoading(false);
    }
  };

  const handlePdfDetail = async () => {
    if (!property) return;
    setPdfDetailLoading(true);
    try {
      await exportPdfDetail(
        property,
        subjectProperty,
        comps,
        rentRoll,
        preparedBy,
        surveyDate,
        comments,
      );
    } catch (err) {
      console.error("PDF detail export failed:", err);
      alert("Failed to generate PDF detail. Please try again.");
    } finally {
      setPdfDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* ── Export ─────────────────────────────────────────────────── */}
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
            disabled={!property}
            onClick={() => {
              if (!property) return;
              exportToExcel(
                property,
                subjectProperty,
                comps,
                rentRoll,
                preparedBy,
                surveyDate,
                comments,
              );
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${
              property
                ? "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
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

          {/* PDF Summary */}
          <button
            disabled={!property || pdfSummaryLoading}
            onClick={handlePdfSummary}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${
              property && !pdfSummaryLoading
                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
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
            {pdfSummaryLoading ? "Generating..." : "Download PDF Summary"}
          </button>

          {/* PDF Detail */}
          <button
            disabled={!property || pdfDetailLoading}
            onClick={handlePdfDetail}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${
              property && !pdfDetailLoading
                ? "bg-slate-600 text-white hover:bg-slate-700 cursor-pointer"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
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
            {pdfDetailLoading ? "Generating..." : "Download PDF Detail"}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Google Sheets export coming soon.
        </p>
      </section>
    </div>
  );
}
