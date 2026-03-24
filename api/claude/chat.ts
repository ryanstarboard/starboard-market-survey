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
    const { messages, systemPrompt } = req.body;
    const client = new Anthropic({ apiKey });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system:
        systemPrompt ||
        "You are a helpful real estate market survey assistant.",
      messages,
    });

    stream.on("text", (text) => {
      res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
    });

    stream.on("message", () => {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    });

    stream.on("error", (error) => {
      console.error("Claude chat stream error:", error);
      res.write(
        `data: ${JSON.stringify({ type: "error", error: String(error) })}\n\n`
      );
      res.end();
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Claude chat error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
