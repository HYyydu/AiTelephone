"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Upload,
  Mic,
  Plus,
  FileText,
  DollarSign,
  XCircle,
  Phone,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTED_CARDS = [
  {
    id: "quote",
    title: "Get a quote",
    description: "Get pricing for various items",
    icon: FileText,
  },
  {
    id: "refund",
    title: "Get a refund",
    description: "Dispute a charge or recover money",
    icon: DollarSign,
  },
  {
    id: "cancel",
    title: "Cancel a subscription",
    description: "End a service you no longer use",
    icon: XCircle,
  },
  {
    id: "billing",
    title: "Fix a billing issue",
    description: "Resolve incorrect charges",
    icon: Phone,
  },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const startConversation = (initialMessage?: string) => {
    const message = initialMessage?.trim() || input.trim();
    const params = new URLSearchParams();
    if (message) params.set("message", message);
    router.push(`/chat${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startConversation();
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Main content: centered hero + input + cards */}
      <main className="flex-1 overflow-auto flex flex-col items-center justify-start pt-24 pb-12 px-4">
        <div className="w-full max-w-3xl flex flex-col items-center gap-8">
          {/* Heading */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#6B46C1]/10 text-[#6B46C1]">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Today, what can I help you handle?
            </h1>
            <p className="text-gray-500 text-sm md:text-base max-w-md">
              Your AI can call customer service, wait on hold, and get things
              done for you.
            </p>
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSubmit}
            className="w-full flex flex-col gap-4 items-center"
          >
            <div className="w-full relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Upload a bill, screenshot, or describe what you need help with..."
                className={cn(
                  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 pr-24 text-base text-gray-900 placeholder:text-gray-500",
                  "focus:outline-none focus:ring-2 focus:ring-[#6B46C1]/20 focus:border-[#6B46C1]/40"
                )}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                  aria-label="Upload"
                >
                  <Upload className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                  aria-label="Voice input"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-full bg-[#6B46C1] text-white hover:bg-[#5a3ab8] transition-colors"
                  aria-label="Add"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>

          {/* OR TRY ONE OF THESE */}
          <div className="w-full space-y-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 text-center">
              Or try one of these
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUGGESTED_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() =>
                      startConversation(
                        card.title +
                          (card.description ? ` — ${card.description}` : "")
                      )
                    }
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white text-left",
                      "hover:border-gray-300 hover:shadow-sm transition-all"
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#6B46C1]/10 text-[#6B46C1]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">
                        {card.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {card.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="w-full pt-8 relative">
            <p className="text-sm text-gray-700 text-center">
              Just describe the problem. Your AI will take it from here.
            </p>
          </div>
        </div>

        {/* Help icon - bottom right */}
        <button
          type="button"
          className="absolute bottom-6 right-6 p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          aria-label="Help"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </main>
    </div>
  );
}
