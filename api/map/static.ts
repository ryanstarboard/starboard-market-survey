import type { VercelRequest, VercelResponse } from "@vercel/node";

interface MarkerAddress {
  address: string;
  name?: string;
}

interface RequestBody {
  subject: MarkerAddress;
  comps: MarkerAddress[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ mapUrl: null, error: "API key not configured" });
  }

  const { subject, comps } = req.body as RequestBody;

  if (!subject?.address) {
    return res.status(400).json({ error: "Subject address is required" });
  }

  // Build Google Maps Static API URL
  const params = new URLSearchParams();
  params.set("size", "800x400");
  params.set("scale", "2");
  params.set("maptype", "roadmap");
  params.set("key", apiKey);

  // Subject marker — red, label "S"
  const subjectMarker = `color:red|label:S|${encodeURIComponent(subject.address)}`;
  params.append("markers", subjectMarker);

  // Comp markers — blue, labeled 1-6
  const labels = "123456";
  const activeComps = (comps || []).slice(0, 6);
  for (let i = 0; i < activeComps.length; i++) {
    const label = labels[i] || String(i + 1);
    const compMarker = `color:blue|label:${label}|${encodeURIComponent(activeComps[i].address)}`;
    params.append("markers", compMarker);
  }

  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;

  return res.status(200).json({ mapUrl });
}
