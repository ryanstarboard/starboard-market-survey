// ── Frontend API Client ──────────────────────────────────────────────────────
// All calls route through /api/* Vercel serverless functions.
// API keys never touch the browser.

export interface CompSuggestion {
  name: string;
  address: string;
  cityState: string;
  distanceFromSubject: string;
  phone: string;
  totalUnits: number;
  leaseTerms: string;
  utilitiesIncluded: string;
  reasoning: string;
  floorPlans?: { type: string; sqft: number; rent: number }[];
  leasedPct?: number;
  applicationFee?: number;
  adminFee?: number;
  petDeposit?: number;
  petRent?: number;
  concessions?: string;
  yearBuilt?: string;
}

// ── Comp Suggestions ────────────────────────────────────────────────────────

export async function fetchCompSuggestions(
  propertyName: string,
  address: string,
  unitMix: { type: string; count: number; avgRent: number }[]
): Promise<CompSuggestion[]> {
  const res = await fetch("/api/claude/comp-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyName, address, unitMix }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }

  const data = await res.json();
  return data.suggestions as CompSuggestion[];
}

// ── Streaming Chat ──────────────────────────────────────────────────────────

export function streamChat(
  messages: { role: "user" | "assistant"; content: string }[],
  systemPrompt: string,
  onText: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch("/api/claude/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, systemPrompt }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        onError(body.error ?? `Request failed with status ${res.status}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        onError("Response body is not readable");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split("\n");
        // Keep the last (possibly incomplete) chunk in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const json = trimmed.slice(6);
          try {
            const event = JSON.parse(json) as
              | { type: "text"; text: string }
              | { type: "done" }
              | { type: "error"; error: string };

            switch (event.type) {
              case "text":
                onText(event.text);
                break;
              case "done":
                onDone();
                return;
              case "error":
                onError(event.error);
                return;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // If the stream ended without a "done" event, still notify
      onDone();
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      onError((err as Error).message ?? "Stream failed");
    }
  })();

  // Return abort function so callers can cancel the stream
  return () => controller.abort();
}
