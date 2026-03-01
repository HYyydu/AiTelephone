// Chat API - ChatGPT-like text conversation (OpenAI Chat Completions)
import { Router, Request, Response } from "express";
import OpenAI from "openai";
import { config } from "../../config";
import { authenticateUser } from "../../utils/auth-middleware";
import { getQuoteCollectionPrompt } from "../../quote";
import type { QuoteSlots } from "../../quote";

const router = Router();
const openai = new OpenAI({ apiKey: config.openai.apiKey });

const CHAT_SYSTEM_PROMPT = `You are Holdless, an AI customer service assistant. You help users with:
- Getting quotes and pricing
- Refunds and disputing charges
- Cancelling subscriptions
- Fixing billing issues
- Calling customer service on their behalf, waiting on hold, and getting things done

Be helpful, concise, and friendly. When the user describes a task, clarify what they need and suggest next steps (e.g. gathering details, starting a call). You can offer to create a task for your AI to call customer service for them.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

router.post(
  "/",
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { messages, quote_type, quote_state } = req.body as {
        messages?: ChatMessage[];
        quote_type?: string;
        quote_state?: { slots?: QuoteSlots; status?: string };
      };
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({
          success: false,
          error: "messages array is required and must not be empty",
        });
        return;
      }

      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role !== "user") {
        res.status(400).json({
          success: false,
          error: "Last message must be from user",
        });
        return;
      }

      // When in get_quote flow, use quote collection prompt so we ask grouped and allow "I don't know"
      const systemContent =
        quote_type === "vet_clinic"
          ? getQuoteCollectionPrompt(quote_type, quote_state?.slots)
          : CHAT_SYSTEM_PROMPT;

      const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemContent },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ];

      const completion = await openai.chat.completions.create({
        model: config.openai.model,
        messages: openaiMessages,
        temperature: config.openai.temperature,
        max_tokens: 1024,
        frequency_penalty: config.openai.frequencyPenalty,
        presence_penalty: config.openai.presencePenalty,
      });

      const content =
        completion.choices[0]?.message?.content?.trim() ||
        "I'm not sure how to respond. Could you rephrase?";

      res.json({ success: true, content });
    } catch (error) {
      console.error("Chat API error:", error);
      const message =
        error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({ success: false, error: message });
    }
  },
);

// Intent classification prompt
const INTENT_CLASSIFY_PROMPT = `You are an intent classification system for an AI assistant that handles customer service phone calls.

Your job is to classify the user's intent based on their message.

Possible intents:
- get_quote (user wants pricing, quotes, or estimates for items/services)
- refund
- cancel_subscription
- billing_issue
- talk_to_human
- insurance
- banking
- unknown

Rules:
- Choose the closest matching intent
- If the intent is unclear, return "unknown"
- Do NOT explain your reasoning
- Only return valid JSON

Return format:
{
  "intent": "...",
  "confidence": 0.0 - 1.0,
  "needs_followup": true | false
}

User message:
<<<USER_INPUT>>>`;

interface IntentResult {
  intent: string;
  confidence: number;
  needs_followup: boolean;
}

router.post(
  "/classify-intent",
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { message } = req.body as { message?: string };
      if (typeof message !== "string" || !message.trim()) {
        res.status(400).json({
          success: false,
          error: "message string is required",
        });
        return;
      }

      const prompt = INTENT_CLASSIFY_PROMPT.replace(
        "<<<USER_INPUT>>>",
        message.trim(),
      );

      const completion = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 150,
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "{}";
      // Strip markdown code fence if present
      const jsonStr = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
      let result: IntentResult;
      try {
        result = JSON.parse(jsonStr) as IntentResult;
      } catch {
        res.status(500).json({
          success: false,
          error: "Invalid JSON from model",
          raw,
        });
        return;
      }

      if (!result.intent || typeof result.confidence !== "number") {
        res.status(500).json({
          success: false,
          error: "Missing intent or confidence in response",
          raw: result,
        });
        return;
      }

      res.json({
        success: true,
        intent: result.intent,
        confidence: Math.max(0, Math.min(1, result.confidence)),
        needs_followup: Boolean(result.needs_followup),
      });
    } catch (error) {
      console.error("Intent classification error:", error);
      const msg =
        error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({ success: false, error: msg });
    }
  },
);

export default router;
