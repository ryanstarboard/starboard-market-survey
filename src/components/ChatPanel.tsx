import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { streamChat } from "../lib/api";
import type { Property, RentRollSummary, Comp } from "../lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(
  stage: number,
  property: Property | null,
  rentRoll: RentRollSummary | null,
  comps: Comp[]
): string {
  let context = "You are a helpful real estate market survey assistant for Starboard Real Estate. Be concise and practical.\n\n";

  if (property) {
    context += `SUBJECT PROPERTY:\n- Name: ${property.name}\n- Address: ${property.address}\n- City: ${property.city}\n- Total Units: ${property.totalUnits}\n\n`;
  }

  if (rentRoll) {
    context += "RENT ROLL SUMMARY (already uploaded and parsed):\n";
    for (const t of rentRoll.byType) {
      context += `- ${t.type}: ${t.count} units, avg rent $${t.avgRent}, range $${t.low}-$${t.high}, avg tenure ${t.avgTenureMonths} months\n`;
    }
    context += `- ${rentRoll.recent.length} most recent leases loaded\n\n`;
  }

  if (comps.length > 0) {
    const active = comps.filter((c) => !c.excluded);
    const excluded = comps.filter((c) => c.excluded);
    context += `COMPS (${active.length} active, ${excluded.length} excluded):\n`;
    for (const c of active) {
      const avgRent = c.floorPlans.length > 0
        ? Math.round(c.floorPlans.reduce((s, fp) => s + (fp.rent ?? 0), 0) / c.floorPlans.length)
        : null;
      context += `- ${c.name || "Unnamed"}: ${c.address || "no address"}, ${c.totalUnits} units${avgRent ? `, ~$${avgRent} avg rent` : ""}\n`;
    }
    context += "\n";
  }

  switch (stage) {
    case 0:
      context += rentRoll
        ? "The rent roll has been uploaded and parsed. Help the user understand their data — unit mix, rent ranges, trends, and anything notable."
        : "The user needs to upload their AppFolio rent roll. Help them with the process if they have questions.";
      break;
    case 1:
      context += "Help the user evaluate comparable properties. You already know the subject property details and rent roll data above — never ask for this information. Help assess comps, compare rents, identify outliers.";
      break;
    case 2:
      context += "Help the user finalize the survey. Review data completeness, note gaps, and help prepare for export.";
      break;
  }

  return context;
}

const STAGE_WELCOME: Record<number, string> = {
  0: "Welcome! Upload your rent roll to get started. I can help you understand the data once it's loaded.",
  1: "I can help you find and evaluate comparable properties. Ask me about comps in this area or any data questions.",
  2: "You're almost done! I can help with any final details or answer questions about the survey data.",
};

interface ChatPanelProps {
  stage: number;
  property?: Property | null;
  rentRoll?: RentRollSummary | null;
  comps?: Comp[];
}

export default function ChatPanel({ stage, property = null, rentRoll = null, comps = [] }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: STAGE_WELCOME[stage] ?? STAGE_WELCOME[0] },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update welcome message when stage changes
  const prevStageRef = useRef(stage);
  useEffect(() => {
    if (stage !== prevStageRef.current) {
      prevStageRef.current = stage;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: STAGE_WELCOME[stage] ?? "" },
      ]);
    }
  }, [stage]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const assistantMsg: ChatMessage = { role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    const allMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt = buildSystemPrompt(stage, property, rentRoll, comps);

    const abort = streamChat(
      allMessages,
      systemPrompt,
      (chunk) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + chunk,
            };
          }
          return updated;
        });
      },
      () => setStreaming(false),
      (error) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant" && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content: `Error: ${error}`,
            };
          }
          return updated;
        });
        setStreaming(false);
      }
    );

    abortRef.current = abort;
  }, [input, streaming, messages, stage, property, rentRoll, comps]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">AI Assistant</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Ask questions about your survey
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {msg.content || (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <span className="animate-pulse">Thinking</span>
                  <span className="animate-bounce">...</span>
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={streaming}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
