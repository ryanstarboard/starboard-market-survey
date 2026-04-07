import type { VercelRequest, VercelResponse } from "@vercel/node";
import { list } from "@vercel/blob";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { blobs } = await list({ prefix: "surveys/" });

    // Extract property IDs and last-modified timestamps
    const surveys = blobs.map((b) => ({
      propertyId: b.pathname.replace("surveys/", "").replace(".json", ""),
      lastModified: b.uploadedAt.toISOString(),
      url: b.url,
    }));

    return res.status(200).json({ surveys });
  } catch (err) {
    console.error("Survey list error:", err);
    return res.status(500).json({ error: "Failed to list surveys" });
  }
}
