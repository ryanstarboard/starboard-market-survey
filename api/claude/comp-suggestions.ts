import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" });
  }

  try {
    const { propertyName, address, unitMix } = req.body;
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system:
        "You are a real estate market analyst. Given a subject property, suggest 5-7 comparable apartment communities nearby. Return a JSON array of comp objects. Each object should have: name, address, cityState, distanceFromSubject, phone, totalUnits, leaseTerms, utilitiesIncluded, and a reasoning field explaining why this is a good comp. Only return valid JSON — no markdown fences.",
      messages: [
        {
          role: "user",
          content: `Subject property: ${propertyName} at ${address}. Unit mix: ${JSON.stringify(unitMix)}. Find 5-7 comparable apartment communities.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "");

    res.json({ suggestions: JSON.parse(cleaned) });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Claude comp-suggestions error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
