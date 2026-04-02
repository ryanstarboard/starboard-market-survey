import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Property } from "../lib/types";
import PropertyModal from "../components/PropertyModal";
import { hasSavedSurvey } from "./Survey";

const STORAGE_KEY = "starboard_properties";

const SEED_PROPERTIES: Property[] = [
  {
    id: "the-james",
    name: "The James",
    address: "4828 123rd St SW, Lakewood, WA",
    city: "Lakewood, WA",
    totalUnits: 144,
    lastSurveyDate: "2025-11-15",
    compsConfig: [],
  },
  {
    id: "bridgeport-crossing",
    name: "Bridgeport Crossing",
    address: "3200 Bridgeport Way W, University Place, WA",
    city: "University Place, WA",
    totalUnits: 96,
    lastSurveyDate: "2025-09-22",
    compsConfig: [],
  },
  {
    id: "pacific-ridge",
    name: "Pacific Ridge",
    address: "7601 Pacific Ave, Tacoma, WA",
    city: "Tacoma, WA",
    totalUnits: 210,
    lastSurveyDate: null,
    compsConfig: [],
  },
];

function loadProperties(): Property[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fall through to seed
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PROPERTIES));
  return SEED_PROPERTIES;
}

function saveProperties(properties: Property[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
}

/** Read properties from localStorage. Used by Survey.tsx to look up a property. */
export function getProperties(): Property[] {
  return loadProperties();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Home() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  useEffect(() => {
    setProperties(loadProperties());
  }, []);

  const openAddModal = () => {
    setEditingProperty(null);
    setModalOpen(true);
  };

  const openEditModal = (property: Property) => {
    setEditingProperty(property);
    setModalOpen(true);
  };

  const handleSave = (saved: Property) => {
    let updated: Property[];
    if (editingProperty) {
      // Edit existing
      updated = properties.map((p) => (p.id === editingProperty.id ? saved : p));
    } else {
      // Add new
      updated = [...properties, saved];
    }
    setProperties(updated);
    saveProperties(updated);
    setModalOpen(false);
    setEditingProperty(null);
  };

  const handleDelete = (propertyId: string) => {
    const updated = properties.filter((p) => p.id !== propertyId);
    setProperties(updated);
    saveProperties(updated);
    setModalOpen(false);
    setEditingProperty(null);
  };

  const handleCancel = () => {
    setModalOpen(false);
    setEditingProperty(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Properties</h2>
          <p className="mt-1 text-slate-500">
            Select a property to start or continue a market survey.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Property
        </button>
      </div>

      {/* TODO: remove this banner once Ryan confirms updates are live */}
      <div className="mb-4 rounded-lg bg-yellow-100 border border-yellow-300 px-4 py-2 text-sm text-yellow-800 font-medium">
        Code updated — if you see this, the build is live.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <div
            key={property.id}
            onClick={() => navigate(`/survey/${property.id}`)}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {property.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(property);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Property settings"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-4">{property.address}</p>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  {property.totalUnits} units
                </span>
                <div className="flex items-center gap-2">
                  {hasSavedSurvey(property.id) && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      In Progress
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      property.lastSurveyDate
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {property.lastSurveyDate
                      ? `Last survey: ${formatDate(property.lastSurveyDate)}`
                      : "No prior survey"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <PropertyModal
        isOpen={modalOpen}
        property={editingProperty}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleDelete}
      />
    </div>
  );
}
