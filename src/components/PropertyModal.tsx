import { useState, useEffect } from "react";
import type { Property } from "../lib/types";

interface PropertyModalProps {
  isOpen: boolean;
  property: Property | null; // null = adding new, non-null = editing
  onSave: (property: Property) => void;
  onCancel: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export default function PropertyModal({
  isOpen,
  property,
  onSave,
  onCancel,
}: PropertyModalProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [totalUnits, setTotalUnits] = useState<number | "">("");

  useEffect(() => {
    if (isOpen) {
      if (property) {
        setName(property.name);
        setAddress(property.address);
        setCity(property.city);
        setTotalUnits(property.totalUnits);
      } else {
        setName("");
        setAddress("");
        setCity("");
        setTotalUnits("");
      }
    }
  }, [isOpen, property]);

  if (!isOpen) return null;

  const canSave = name.trim() !== "" && address.trim() !== "" && city.trim() !== "";

  const handleSave = () => {
    if (!canSave) return;

    const saved: Property = {
      id: property ? property.id : slugify(name),
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      totalUnits: typeof totalUnits === "number" ? totalUnits : 0,
      lastSurveyDate: property ? property.lastSurveyDate : null,
      compsConfig: property ? property.compsConfig : [],
    };

    onSave(saved);
  };

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
          {property ? "Edit Property" : "Add Property"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {property
            ? "Update the property details below."
            : "Enter the details for the new property."}
        </p>

        {/* Fields */}
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Property Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The James"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 4828 123rd St SW, Lakewood, WA"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              City, State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Lakewood, WA"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Total Units
            </label>
            <input
              type="number"
              value={totalUnits}
              onChange={(e) =>
                setTotalUnits(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="e.g. 144"
              min={0}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
