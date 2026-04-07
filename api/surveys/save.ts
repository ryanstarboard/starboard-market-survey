import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { propertyId, state } = req.body as {
    propertyId: string;
    state: unknown;
  };

  if (!propertyId || !state) {
    return res.status(400).json({ error: "propertyId and state are required" });
  }

  try {
    const blob = await put(
      `surveys/${propertyId}.json`,
      JSON.stringify(state),
      {
        contentType: "application/json",
        access: "public",
        addRandomSuffix: false,
      },
    );

    return res.status(200).json({ ok: true, url: blob.url });
  } catch (err) {
    console.error("Survey save error:", err);
    return res.status(500).json({ error: "Failed to save survey" });
  }
}
