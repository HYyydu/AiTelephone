"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Send, Phone, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { QuoteSlots, QuoteState } from "@/lib/types";
import type { ClinicSearchResult } from "@/lib/types";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: Date;
}

const DEFAULT_QUOTE_STATE: QuoteState = {
  quote_type: "vet_clinic",
  status: "collecting_info",
  slots: {},
  max_clinics_to_call: 3,
  clinics_called: 0,
  updated_at: new Date().toISOString(),
};

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get("message") ?? "";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationTitle, setConversationTitle] = useState<string | null>(
    null,
  );
  const [lastIntent, setLastIntent] = useState<{
    intent: string;
    confidence: number;
    needs_followup: boolean;
  } | null>(null);
  const [quoteState, setQuoteState] = useState<QuoteState | null>(null);
  const [validateResult, setValidateResult] = useState<{
    valid: boolean;
    missingRequired: string[];
  } | null>(null);
  const [quoteCallPhone, setQuoteCallPhone] = useState("");
  const [quoteCallSubmitting, setQuoteCallSubmitting] = useState(false);
  const [clinicsList, setClinicsList] = useState<ClinicSearchResult[] | null>(
    null,
  );
  const [clinicsSearching, setClinicsSearching] = useState(false);
  const [selectedClinicIds, setSelectedClinicIds] = useState<Set<string>>(
    new Set(),
  );
  const [callStubMessage, setCallStubMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const quoteCardRef = useRef<HTMLDivElement>(null);
  const hasInitialSend = useRef(false);

  const isGetQuote = lastIntent?.intent === "get_quote";

  /** Try to extract procedure and location from a user message (e.g. "cat neuter in 90024") */
  function extractSlotsFromMessage(text: string): Partial<QuoteSlots> {
    const t = text.trim().toLowerCase();
    const slots: Partial<QuoteSlots> = {};
    const zipMatch = t.match(/\b(\d{5})\b/);
    if (zipMatch) slots.location = zipMatch[1];
    const procedurePatterns = [
      /cat\s+neuter|cat\s+spay|cat\s+spaying|cat\s+neutering/i,
      /dog\s+neuter|dog\s+spay|dog\s+spaying|dog\s+neutering/i,
      /neuter|spay|neutering|spaying|vaccination/i,
    ];
    for (const p of procedurePatterns) {
      const m = t.match(p);
      if (m) {
        slots.procedure = m[0].trim();
        break;
      }
    }
    return slots;
  }

  const handleMoveForwardAnyway = () => {
    if (!quoteState || !quoteType) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const extracted = lastUserMsg?.content
      ? extractSlotsFromMessage(lastUserMsg.content)
      : {};
    const mergedSlots: QuoteSlots = {
      ...quoteState.slots,
      ...(extracted.location && !quoteState.slots.location
        ? { location: extracted.location }
        : {}),
      ...(extracted.procedure && !quoteState.slots.procedure
        ? { procedure: extracted.procedure }
        : {}),
    };
    setQuoteState((prev) =>
      prev
        ? { ...prev, slots: mergedSlots, updated_at: new Date().toISOString() }
        : prev,
    );
    quoteCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    const hasLocation = Boolean(mergedSlots.location?.trim());
    const hasPhone = Boolean(mergedSlots.phone_number?.trim());
    const hasProcedure = Boolean(mergedSlots.procedure?.trim());
    if (hasProcedure && (hasLocation || hasPhone)) {
      api
        .validateQuote(quoteType, mergedSlots)
        .then((result) => {
          setValidateResult({
            valid: result.valid,
            missingRequired: result.missingRequired ?? [],
          });
          if (result.readyToSearch) {
            setQuoteState((prev) =>
              prev
                ? {
                    ...prev,
                    status: "ready_to_search",
                    updated_at: new Date().toISOString(),
                  }
                : prev,
            );
          }
        })
        .catch(() => {});
    }
  };
  const quoteType = isGetQuote ? "vet_clinic" : null;

  type IntentResult = {
    intent: string;
    confidence: number;
    needs_followup: boolean;
  } | null;

  const classifyIntent = async (message: string): Promise<IntentResult> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    try {
      const res = await fetch(`${apiUrl}/api/chat/classify-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && data.intent != null) {
        const result: IntentResult = {
          intent: data.intent,
          confidence: Number(data.confidence) || 0,
          needs_followup: Boolean(data.needs_followup),
        };
        setLastIntent(result);
        return result;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When intent becomes get_quote, init quote state and autofill from last user message
  useEffect(() => {
    if (lastIntent?.intent !== "get_quote" || quoteState) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const extracted = lastUserMsg?.content
      ? extractSlotsFromMessage(lastUserMsg.content)
      : {};
    setQuoteState({
      ...DEFAULT_QUOTE_STATE,
      slots: { ...DEFAULT_QUOTE_STATE.slots, ...extracted },
      updated_at: new Date().toISOString(),
    });
  }, [lastIntent?.intent, quoteState, messages]);

  // When user sends another message in get_quote flow, autofill form from message (only fill empty slots)
  useEffect(() => {
    if (!isGetQuote || !quoteState || messages.length === 0) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg?.content) return;
    const extracted = extractSlotsFromMessage(lastUserMsg.content);
    const merged = {
      ...quoteState.slots,
      ...(extracted.location && !quoteState.slots.location
        ? { location: extracted.location }
        : {}),
      ...(extracted.procedure && !quoteState.slots.procedure
        ? { procedure: extracted.procedure }
        : {}),
    };
    if (
      merged.location === quoteState.slots.location &&
      merged.procedure === quoteState.slots.procedure
    )
      return;
    setQuoteState((prev) =>
      prev
        ? { ...prev, slots: merged, updated_at: new Date().toISOString() }
        : prev,
    );
  }, [
    messages,
    isGetQuote,
    quoteState?.slots?.location,
    quoteState?.slots?.procedure,
  ]);

  // If we landed with an initial message, classify intent first then fetch reply so backend uses vet quote prompt
  useEffect(() => {
    if (!initialMessage || hasInitialSend.current) return;
    hasInitialSend.current = true;
    setConversationTitle(
      initialMessage.slice(0, 50) + (initialMessage.length > 50 ? "…" : ""),
    );
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: initialMessage,
      createdAt: new Date(),
    };
    setMessages([userMsg]);

    (async () => {
      const intentResult = await classifyIntent(initialMessage);
      const isGetQuoteIntent = intentResult?.intent === "get_quote";
      const initialSlots = extractSlotsFromMessage(initialMessage);
      if (isGetQuoteIntent) {
        const stateWithSlots: QuoteState = {
          ...DEFAULT_QUOTE_STATE,
          slots: { ...DEFAULT_QUOTE_STATE.slots, ...initialSlots },
          updated_at: new Date().toISOString(),
        };
        setQuoteState(stateWithSlots);
      }
      const overrides: {
        quoteType: string | null;
        quoteState: QuoteState | null;
      } = isGetQuoteIntent
        ? {
            quoteType: "vet_clinic",
            quoteState: {
              ...DEFAULT_QUOTE_STATE,
              slots: { ...DEFAULT_QUOTE_STATE.slots, ...initialSlots },
              updated_at: new Date().toISOString(),
            },
          }
        : { quoteType: null, quoteState: null };
      fetchReply([userMsg], null, overrides);
    })();
  }, [initialMessage]);

  const fetchReply = async (
    currentMessages: ChatMessage[],
    currentQuoteState?: QuoteState | null,
    overrides?: { quoteType: string | null; quoteState: QuoteState | null },
  ) => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("auth_token")
          : null;
      const effectiveQuoteType = overrides?.quoteType ?? quoteType;
      const effectiveQuoteState =
        overrides?.quoteState ?? currentQuoteState ?? quoteState;
      const body: Record<string, unknown> = {
        messages: currentMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };
      if (effectiveQuoteType) {
        body.quote_type = effectiveQuoteType;
        body.quote_state = effectiveQuoteState
          ? {
              slots: effectiveQuoteState.slots,
              status: effectiveQuoteState.status,
            }
          : undefined;
      }
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const content =
        typeof data.content === "string"
          ? data.content
          : (data.message ?? data.text ?? "");
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          content.trim() || "I’m not sure how to respond. Try rephrasing.",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const isNetworkError =
        e instanceof TypeError && e.message === "Failed to fetch";
      const errMsg = isNetworkError
        ? "Can't reach the server. Make sure the backend is running (e.g. on http://localhost:3001) and NEXT_PUBLIC_API_URL is set correctly."
        : e instanceof Error
          ? e.message
          : "Something went wrong. Try again.";
      const fallback: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Sorry, I couldn’t get a response: ${errMsg}`,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date(),
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!conversationTitle)
      setConversationTitle(text.slice(0, 50) + (text.length > 50 ? "…" : ""));
    classifyIntent(text);
    fetchReply(nextMessages, quoteState);
  };

  const updateQuoteSlots = (updates: Partial<QuoteSlots>) => {
    setQuoteState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slots: { ...prev.slots, ...updates },
        updated_at: new Date().toISOString(),
      };
    });
    setValidateResult(null);
  };

  const handleValidateQuote = async () => {
    if (!quoteState || !quoteType) return;
    try {
      const result = await api.validateQuote(quoteType, quoteState.slots);
      setValidateResult({
        valid: result.valid,
        missingRequired: result.missingRequired ?? [],
      });
      if (result.readyToSearch) {
        setQuoteState((prev) =>
          prev
            ? {
                ...prev,
                status: "ready_to_search",
                updated_at: new Date().toISOString(),
              }
            : prev,
        );
      }
      setClinicsList(null);
      setSelectedClinicIds(new Set());
      setCallStubMessage(null);
    } catch {
      setValidateResult({ valid: false, missingRequired: ["Request failed"] });
    }
  };

  const handleSearchClinics = async () => {
    const location = quoteState?.slots?.location?.trim();
    if (!location || !quoteType || clinicsSearching) return;
    setClinicsSearching(true);
    setCallStubMessage(null);
    try {
      const res = await api.searchQuoteClinics(location, quoteType);
      if (res.success && res.clinics?.length) {
        setClinicsList(res.clinics);
        setQuoteState((prev) =>
          prev
            ? {
                ...prev,
                status: "search_done",
                updated_at: new Date().toISOString(),
              }
            : prev,
        );
        setSelectedClinicIds(new Set());
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I found ${res.clinics.length} clinic${
            res.clinics.length === 1 ? "" : "s"
          } near ${
            res.location
          }. Select the clinic(s) you'd like me to call in the panel on the right.`,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      setClinicsList(null);
    } finally {
      setClinicsSearching(false);
    }
  };

  const toggleClinicSelection = (id: string) => {
    setSelectedClinicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCallSelectedClinics = () => {
    if (selectedClinicIds.size === 0) return;
    setCallStubMessage(
      "Search succeeded. Call feature will be enabled when you're ready to place real calls.",
    );
  };

  const handleCallThisNumber = async () => {
    const phone = quoteState?.slots?.phone_number?.trim();
    if (!phone || !quoteType || quoteCallSubmitting) return;
    setQuoteCallSubmitting(true);
    setCallStubMessage(null);
    try {
      await api.createCall({
        phone_number: phone,
        purpose: "Quote call",
        quote_type: quoteType,
        quote_slots: quoteState!.slots,
      });
      setCallStubMessage("Call started. You can track it from the dashboard.");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      setCallStubMessage(
        err instanceof Error ? err.message : "Failed to start call.",
      );
    } finally {
      setQuoteCallSubmitting(false);
    }
  };

  const handleCreateQuoteCall = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = quoteCallPhone.trim().replace(/\D/g, "");
    if (!phone || !quoteState || !quoteType || quoteCallSubmitting) return;
    setQuoteCallSubmitting(true);
    try {
      await api.createCall({
        phone_number: quoteCallPhone.trim(),
        purpose: "Quote call", // backend overwrites with generated script when quote_slots provided
        quote_type: quoteType,
        quote_slots: quoteState.slots,
      });
      setQuoteCallPhone("");
      setValidateResult(null);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      setQuoteCallSubmitting(false);
    }
  };

  return (
    <div className="flex h-full bg-background min-w-0">
      {/* Left: Conversation - close to sidebar, no extra margin */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-border">
        <header className="shrink-0 flex items-center gap-3 pl-4 pr-4 py-3 border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1"
            onClick={() => router.push("/home")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
            {conversationTitle && (
              <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
                {conversationTitle}
              </span>
            )}
            {lastIntent && (
              <span className="text-xs text-muted-foreground tabular-nums">
                Intent: {lastIntent.intent} (
                {(lastIntent.confidence * 100).toFixed(0)}%)
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 pl-4">
          <div className="max-w-2xl space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    H
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 max-w-[85%]",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                  </div>
                </div>
                {msg.role === "user" && <div className="w-8 shrink-0" />}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  H
                </div>
                <div className="rounded-2xl px-4 py-3 bg-muted text-muted-foreground text-sm">
                  Thinking…
                </div>
              </div>
            )}
            {/* Move forward anyway — proceed without providing optional info */}
            {isGetQuote && messages.some((m) => m.role === "assistant") && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 shrink-0" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleMoveForwardAnyway}
                >
                  <ArrowRight className="h-4 w-4" />
                  Move forward anyway
                </Button>
              </div>
            )}
            {/* Quote form: show only once after first assistant reply (for confirmation), pre-filled from user message */}
            {isGetQuote &&
              quoteState &&
              messages.some((m) => m.role === "assistant") && (
                <div ref={quoteCardRef} className="flex gap-3 justify-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    H
                  </div>
                  <div className="flex-1 max-w-[85%] rounded-2xl px-4 py-3 bg-muted text-foreground border border-border/50">
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Provide either a location (to search) or a clinic phone
                        number (to call directly), plus the procedure.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Location (to search nearby)
                          </Label>
                          <Input
                            placeholder="e.g. 90024 or Austin, TX"
                            value={quoteState.slots.location ?? ""}
                            onChange={(e) =>
                              updateQuoteSlots({
                                location: e.target.value || null,
                              })
                            }
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Clinic phone (to call directly)
                          </Label>
                          <Input
                            placeholder="e.g. 9452644540 or hospital number"
                            value={quoteState.slots.phone_number ?? ""}
                            onChange={(e) =>
                              updateQuoteSlots({
                                phone_number: e.target.value || null,
                              })
                            }
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">
                            Procedure (required)
                          </Label>
                          <Input
                            placeholder="e.g. cat spay / neuter"
                            value={quoteState.slots.procedure ?? ""}
                            onChange={(e) =>
                              updateQuoteSlots({
                                procedure: e.target.value || null,
                              })
                            }
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Pet age (optional)</Label>
                          <Input
                            placeholder="e.g. 2 years"
                            value={quoteState.slots.pet_age ?? ""}
                            onChange={(e) =>
                              updateQuoteSlots({
                                pet_age: e.target.value || null,
                              })
                            }
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Pet breed (optional)
                          </Label>
                          <Input
                            placeholder="e.g. Domestic shorthair"
                            value={quoteState.slots.pet_breed ?? ""}
                            onChange={(e) =>
                              updateQuoteSlots({
                                pet_breed: e.target.value || null,
                              })
                            }
                            className="h-9"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleValidateQuote}
                      >
                        Validate & proceed
                      </Button>
                      {validateResult && (
                        <div
                          className={cn(
                            "rounded-lg border p-2 text-xs",
                            validateResult.valid
                              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
                              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
                          )}
                        >
                          {validateResult.valid
                            ? "Ready to search / call a clinic."
                            : `Missing: ${validateResult.missingRequired.join(
                                ", ",
                              )}`}
                        </div>
                      )}
                      {validateResult?.valid && !clinicsList && (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {quoteState.slots.location?.trim() && (
                              <Button
                                type="button"
                                size="sm"
                                className="gap-1"
                                onClick={handleSearchClinics}
                                disabled={clinicsSearching}
                              >
                                {clinicsSearching
                                  ? "Searching…"
                                  : "Search clinics"}
                              </Button>
                            )}
                            {quoteState.slots.phone_number?.trim() && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="gap-1"
                                onClick={handleCallThisNumber}
                                disabled={quoteCallSubmitting}
                              >
                                <Phone className="h-4 w-4" />
                                {quoteCallSubmitting
                                  ? "Starting…"
                                  : "Call this number"}
                              </Button>
                            )}
                          </div>
                          {callStubMessage && (
                            <p className="text-xs text-muted-foreground rounded border border-border bg-muted/30 p-2">
                              {callStubMessage}
                            </p>
                          )}
                        </>
                      )}
                      {clinicsList && clinicsList.length > 0 && (
                        <div className="space-y-3 border-t border-border/50 pt-3">
                          <p className="text-sm font-medium text-foreground">
                            Clinics near {quoteState?.slots?.location ?? ""}
                          </p>
                          <ul className="space-y-2">
                            {clinicsList.map((clinic) => (
                              <li
                                key={clinic.id}
                                className={cn(
                                  "rounded-lg border p-2 cursor-pointer transition-colors",
                                  selectedClinicIds.has(clinic.id)
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:bg-muted/50",
                                )}
                                onClick={() => toggleClinicSelection(clinic.id)}
                              >
                                <div className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedClinicIds.has(clinic.id)}
                                    onChange={() =>
                                      toggleClinicSelection(clinic.id)
                                    }
                                    className="mt-0.5 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-foreground text-xs">
                                      {clinic.name}
                                    </p>
                                    <p className="text-muted-foreground text-xs truncate">
                                      {clinic.address}
                                    </p>
                                    {clinic.distance && (
                                      <p className="text-muted-foreground text-xs">
                                        {clinic.distance}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="gap-1"
                            onClick={handleCallSelectedClinics}
                            disabled={selectedClinicIds.size === 0}
                          >
                            <Phone className="h-4 w-4" />
                            Call selected ({selectedClinicIds.size})
                          </Button>
                          {callStubMessage && (
                            <p className="text-xs text-muted-foreground rounded border border-border bg-muted/30 p-2">
                              {callStubMessage}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <div className="shrink-0 border-t border-border/50 p-3 pl-4">
          <form
            onSubmit={handleSubmit}
            className="max-w-2xl flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          >
            <button
              type="button"
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Add attachment"
            >
              <Plus className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Holdless..."
              disabled={isLoading}
              className="flex-1 min-w-0 bg-transparent py-2 px-1 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="rounded-full h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Right: Live Transcript */}
      <aside className="flex flex-col flex-1 min-w-[280px] w-0 bg-background">
        <div className="shrink-0 px-4 py-3 border-b border-border/50">
          <h2 className="text-sm font-semibold text-foreground">
            Live Transcript
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-4 text-sm">
          <p className="text-muted-foreground">
            Live transcript will appear here during a call.
          </p>
        </div>
      </aside>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
