import type { VercelRequest, VercelResponse } from "@vercel/node";
import { list } from "@vercel/blob";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const propertyId = req.query.propertyId as string;

  if (!propertyId) {
    return res.status(400).json({ error: "propertyId query param is required" });
  }

  try {
    // List blobs with the exact prefix to find the survey file
    const { blobs } = await list({ prefix: `surveys/${propertyId}.json` });

    if (blobs.length === 0) {
      return res.status(200).json({ state: null });
    }

    // Fetch the blob content
    const blobUrl = blobs[0].url;
    const resp = await fetch(blobUrl);
    if (!resp.ok) {
      return res.status(200).json({ state: null });
    }

    const state = await resp.json();
    return res.status(200).json({ state });
  } catch (err) {
    console.error("Survey load error:", err);
    return res.status(500).json({ error: "Failed to load survey" });
  }
}
