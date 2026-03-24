import { useState } from "react";
import type { FloorPlan } from "../lib/types";

interface FloorPlanTableProps {
  floorPlans: FloorPlan[];
  onChange: (plans: FloorPlan[]) => void;
}

function formatCurrency(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPsf(rent: number | null, sqft: number | null): string {
  if (!rent || !sqft || sqft === 0) return "—";
  return "$" + (rent / sqft).toFixed(2);
}

export function FloorPlanTable({ floorPlans, onChange }: FloorPlanTableProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);

  const updatePlan = (index: number, field: keyof FloorPlan, raw: string) => {
    const updated = [...floorPlans];
    const plan = { ...updated[index] };

    if (field === "type") {
      plan.type = raw;
    } else if (field === "psf") {
      // psf is auto-calculated, never manually set
      return;
    } else {
      const num = raw === "" ? null : Number(raw.replace(/[,$]/g, ""));
      (plan as any)[field] = isNaN(num as number) ? null : num;
    }

    // Auto-calculate psf
    plan.psf = plan.rent && plan.sqft && plan.sqft > 0 ? Math.round((plan.rent / plan.sqft) * 100) / 100 : null;

    updated[index] = plan;
    onChange(updated);
  };

  const addRow = () => {
    const blank: FloorPlan = {
      type: "",
      sqft: null,
      unitCount: null,
      leasedPct: null,
      rent: null,
      psf: null,
    };
    onChange([...floorPlans, blank]);
  };

  const deleteRow = (index: number) => {
    onChange(floorPlans.filter((_, i) => i !== index));
  };

  const columns: { key: keyof FloorPlan; label: string; width: string; format?: (v: any) => string; inputType?: string }[] = [
    { key: "type", label: "Floor Plan", width: "w-28" },
    { key: "sqft", label: "SF", width: "w-20", inputType: "number" },
    { key: "unitCount", label: "# Units", width: "w-20", inputType: "number" },
    { key: "leasedPct", label: "Leased %", width: "w-20", inputType: "number", format: (v: number | null) => (v !== null && v !== undefined ? `${v}%` : "—") },
    { key: "rent", label: "Rent", width: "w-24", inputType: "number", format: (v: number | null) => formatCurrency(v) },
    { key: "psf", label: "PSF", width: "w-20" },
  ];

  return (
    <div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100 text-slate-600 text-left">
            {columns.map((col) => (
              <th key={col.key} className={`px-2 py-1.5 font-medium ${col.width}`}>
                {col.label}
              </th>
            ))}
            <th className="w-8 px-1 py-1.5" />
          </tr>
        </thead>
        <tbody>
          {floorPlans.map((plan, rowIdx) => (
            <tr
              key={rowIdx}
              className={rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}
            >
              {columns.map((col) => {
                const isEditing = editingCell?.row === rowIdx && editingCell?.col === col.key;
                const isPsf = col.key === "psf";
                const rawValue = plan[col.key];

                if (isPsf) {
                  return (
                    <td key={col.key} className="px-2 py-1 text-slate-500 italic">
                      {formatPsf(plan.rent, plan.sqft)}
                    </td>
                  );
                }

                if (isEditing) {
                  return (
                    <td key={col.key} className="px-1 py-0.5">
                      <input
                        autoFocus
                        type={col.inputType || "text"}
                        className="w-full px-1 py-0.5 border border-blue-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        defaultValue={rawValue !== null && rawValue !== undefined ? String(rawValue) : ""}
                        onBlur={(e) => {
                          updatePlan(rowIdx, col.key, e.target.value);
                          setEditingCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          } else if (e.key === "Escape") {
                            setEditingCell(null);
                          }
                        }}
                      />
                    </td>
                  );
                }

                const display = col.format
                  ? col.format(rawValue)
                  : rawValue !== null && rawValue !== undefined && rawValue !== ""
                    ? String(rawValue)
                    : "—";

                return (
                  <td
                    key={col.key}
                    className="px-2 py-1 cursor-pointer hover:bg-blue-50 rounded transition-colors"
                    onClick={() => setEditingCell({ row: rowIdx, col: col.key })}
                  >
                    {display}
                  </td>
                );
              })}
              <td className="px-1 py-1 text-center">
                <button
                  onClick={() => deleteRow(rowIdx)}
                  className="text-slate-400 hover:text-red-500 transition-colors text-xs font-bold"
                  title="Remove row"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
          {floorPlans.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center text-slate-400 py-4 text-sm italic">
                No floor plans. Click "Add Row" to start.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <button
        onClick={addRow}
        className="mt-2 px-3 py-1 text-xs font-medium text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
      >
        + Add Row
      </button>
    </div>
  );
}
