import { useState } from "react";

interface MapEmbedProps {
  subjectAddress: string;
  subjectName: string;
  comps: { address: string; name: string; cityState?: string }[];
  height?: number;
}

export function MapEmbed({
  subjectAddress,
  subjectName,
  comps,
  height = 350,
}: MapEmbedProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filter out comps with no address, append cityState for better geocoding
  const validComps = comps.filter((c) => c.address && c.address.trim());
  const compAddresses = validComps.map((c) => {
    const addr = c.address.trim();
    // If address doesn't already contain city/state info, append it
    if (c.cityState && !addr.includes(",")) {
      return `${addr}, ${c.cityState}`;
    }
    return addr;
  }).join("|");
  const compNames = validComps.map((c) => c.name).join("|");

  const params = new URLSearchParams();
  params.set("subject", subjectAddress);
  params.set("subjectName", subjectName);
  if (compAddresses) {
    params.set("comps", compAddresses);
    params.set("names", compNames);
  }

  const iframeSrc = `/api/map/embed?${params.toString()}`;

  if (error) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-400 text-center">Interactive map unavailable</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      {loading && (
        <div
          className="flex items-center justify-center"
          style={{ height }}
        >
          <svg
            className="h-8 w-8 animate-spin text-slate-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      )}
      <iframe
        src={iframeSrc}
        title="Market survey map"
        className="w-full rounded-lg"
        style={{
          height,
          border: "none",
          display: loading ? "none" : "block",
        }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </section>
  );
}
