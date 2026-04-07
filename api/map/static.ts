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

  // Build markers manually — URLSearchParams double-encodes pipe-delimited
  // marker strings, so we construct the query string by hand.
  const subjectMarker = `color:red|label:S|${subject.address}`;

  const labels = "123456";
  const activeComps = (comps || []).slice(0, 6);
  const compMarkers = activeComps.map((c, i) => {
    const label = labels[i] || String(i + 1);
    return `color:blue|label:${label}|${c.address}`;
  });

  const baseParams = new URLSearchParams();
  baseParams.set("size", "800x400");
  baseParams.set("scale", "2");
  baseParams.set("maptype", "roadmap");
  baseParams.set("key", apiKey);

  const markerParams = [subjectMarker, ...compMarkers]
    .map((m) => "markers=" + encodeURIComponent(m))
    .join("&");

  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?${baseParams.toString()}&${markerParams}`;

  // Fetch the image server-side and return as base64 data URI
  // (browser fetch of Google Static Maps hits CORS restrictions)
  try {
    const imgResp = await fetch(mapUrl);
    if (!imgResp.ok) {
      return res.status(200).json({ mapUrl, mapDataUri: null, error: `Google API returned ${imgResp.status}` });
    }
    const contentType = imgResp.headers.get("content-type") || "";
    // Google returns text/html on errors (invalid key, over quota, etc.)
    if (!contentType.startsWith("image/")) {
      const body = await imgResp.text();
      return res.status(200).json({ mapUrl, mapDataUri: null, error: "Google returned non-image: " + body.slice(0, 200) });
    }
    const arrayBuf = await imgResp.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString("base64");
    const dataUri = `data:${contentType};base64,${base64}`;
    return res.status(200).json({ mapUrl, mapDataUri: dataUri });
  } catch (err) {
    // Fall back to URL-only if server-side fetch fails
    return res.status(200).json({ mapUrl, mapDataUri: null, error: String(err) });
  }
}
