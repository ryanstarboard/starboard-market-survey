import { useState } from "react";

interface ExcludeModalProps {
  isOpen: boolean;
  compName: string;
  onConfirm: (reasons: string[]) => void;
  onCancel: () => void;
}

const PRESET_REASONS = [
  "Outlier price",
  "Different submarket",
  "Furnished",
  "New construction",
  "Wrong unit type",
  "Data quality",
  "Other",
] as const;

export default function ExcludeModal({
  isOpen,
  compName,
  onConfirm,
  onCancel,
}: ExcludeModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [otherText, setOtherText] = useState("");

  if (!isOpen) return null;

  const toggle = (reason: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(reason)) next.delete(reason);
      else next.add(reason);
      return next;
    });
  };

  const handleConfirm = () => {
    const reasons = [...selected].filter((r) => r !== "Other");
    if (selected.has("Other") && otherText.trim()) {
      reasons.push(otherText.trim());
    }
    if (reasons.length === 0 && selected.has("Other")) return; // "Other" checked but empty
    onConfirm(reasons);
  };

  const canConfirm =
    selected.size > 0 &&
    !(selected.size === 1 && selected.has("Other") && !otherText.trim());

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Title */}
        <h2 className="text-lg font-semibold text-slate-800">
          Exclude {compName}?
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Select at least one reason for excluding this comp.
        </p>

        {/* Checkbox list */}
        <div className="mt-4 space-y-2">
          {PRESET_REASONS.map((reason) => (
            <label
              key={reason}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.has(reason)}
                onChange={() => toggle(reason)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              {reason}
            </label>
          ))}
        </div>

        {/* Other free-text input */}
        {selected.has("Other") && (
          <input
            type="text"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Describe reason..."
            className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Exclude
          </button>
        </div>
      </div>
    </div>
  );
}
