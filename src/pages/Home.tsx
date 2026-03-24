import { useNavigate } from "react-router-dom";
import type { Property } from "../lib/types";

export const SAMPLE_PROPERTIES: Property[] = [
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Properties</h2>
        <p className="mt-1 text-slate-500">
          Select a property to start or continue a market survey.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {SAMPLE_PROPERTIES.map((property) => (
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
                    // TODO: Property settings
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
        ))}
      </div>
    </div>
  );
}
