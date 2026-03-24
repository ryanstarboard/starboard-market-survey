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
      max_tokens: 16000,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 10,
        },
      ],
      system: `You are a real estate market analyst finding comparable apartment communities for a market survey.

IMPORTANT: Use web search to find REAL, CURRENT data. Search for apartment communities near the subject property on sites like Apartments.com, Zillow, and property websites. Get actual rent prices, unit counts, and amenity details.

For each comp, search for its current rent prices by unit type (studio, 1BR, 2BR, 3BR etc).

After searching, return your results as a JSON array. Each object must have:
- name: property name
- address: street address
- cityState: "City, ST"
- distanceFromSubject: approximate distance (e.g. "0.5 miles")
- phone: phone number if found
- totalUnits: number of units
- leaseTerms: available lease terms
- utilitiesIncluded: which utilities are included
- floorPlans: array of {type: "1BR/1BA", sqft: number, rent: number} with actual current rents
- leasedPct: occupancy/leased percentage if available
- applicationFee: application fee if found
- adminFee: admin fee if found
- petDeposit: pet deposit if found
- petRent: monthly pet rent if found
- concessions: any current concessions/specials
- yearBuilt: year built if found
- communityAmenities: array of community amenity strings from this list ONLY: "Pool", "Fitness Center", "Clubhouse", "Business Center", "Dog Park", "Playground", "BBQ/Grill Area", "Package Lockers", "EV Charging", "Gated Access", "Garage Parking", "Covered Parking", "Storage Units", "On-Site Laundry", "Bike Storage"
- unitAmenities: array of in-unit amenity strings from this list ONLY: "Washer/Dryer", "W/D Hookups", "Dishwasher", "Microwave", "Stainless Appliances", "Granite/Quartz Counters", "Hardwood/Vinyl Plank", "Carpet", "Patio/Balcony", "Walk-In Closet", "Fireplace", "Central AC", "Smart Thermostat", "USB Outlets"
- reasoning: 1-2 sentences on why this is a good comp

Return ONLY the JSON array — no markdown fences, no extra text.`,
      messages: [
        {
          role: "user",
          content: `Subject property: ${propertyName} at ${address}.
Unit mix: ${JSON.stringify(unitMix)}.

Search the web for 5-7 comparable apartment communities near this property. Get real, current rent data for each one.`,
        },
      ],
    });

    // Extract text from response (may have multiple content blocks with web search)
    let text = "";
    for (const block of message.content) {
      if (block.type === "text") {
        text += block.text;
      }
    }

    // Extract JSON array from response — Claude may wrap it in conversational text
    let parsed;
    // Try 1: raw parse
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      // Try 2: strip markdown fences
      const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
      if (fenceMatch) {
        parsed = JSON.parse(fenceMatch[1].trim());
      } else {
        // Try 3: find the JSON array in the text
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          parsed = JSON.parse(arrayMatch[0]);
        } else {
          throw new Error("Could not extract JSON from AI response");
        }
      }
    }

    const suggestions = Array.isArray(parsed) ? parsed : [parsed];
    res.json({ suggestions });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Claude comp-suggestions error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
