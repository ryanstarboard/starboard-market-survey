import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // TODO: Implement Google Sheets export in Phase 3
  res.json({
    success: true,
    message: "Google Sheets export placeholder — not yet implemented",
  });
}
