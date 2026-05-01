// Call management routes
import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  CallService,
  TranscriptService,
} from "../../database/services/call-service";
import { CreateCallRequest, Call } from "../../types";
import { initiateCall, connectUserToOngoingConference } from "../../services/telephony";
import {
  validatePhoneNumber,
  validateCallPurpose,
  sanitizeInput,
} from "../../utils/validation";
import { callCreationLimiter } from "../../utils/rate-limiter";
import {
  authenticateUser,
  requireAuth,
  authenticateCallApiToken,
} from "../../utils/auth-middleware";
import { config } from "../../config";
import { io } from "../../server";

const router = Router();

function splitInstructionLines(input: string): string[] {
  return input
    .split(/\r?\n|[.;]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildTalkingPoints(
  talkingPoints: string[] | undefined,
  additionalInstructions: string,
): string[] {
  if (Array.isArray(talkingPoints)) {
    const clean = talkingPoints
      .map((point) => (typeof point === "string" ? point.trim() : ""))
      .filter(Boolean);
    if (clean.length > 0) {
      return clean;
    }
  }
  return splitInstructionLines(additionalInstructions);
}

function buildStructuredAdditionalInstructions(params: {
  purpose: string;
  agentPrompt?: string;
  additionalInstructions?: string;
  openingLine?: string;
  talkingPoints?: string[];
  callBrief?: {
    objective?: string;
    must_ask?: string[];
    preferences?: string[];
    constraints?: string[];
  };
}): string {
  const agentPrompt = (params.agentPrompt || "").trim();
  const additionalInstructions = (params.additionalInstructions || "").trim();
  const fallbackAdditionalInstructions = additionalInstructions || params.purpose;
  const openingLine = (params.openingLine || "").trim();
  const talkingPoints = buildTalkingPoints(
    params.talkingPoints,
    fallbackAdditionalInstructions,
  );

  const cleanList = (items?: string[]): string[] =>
    (items || [])
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);

  const lines: string[] = [];
  lines.push("[[PROMPT_CONTEXT_V1]]");

  if (agentPrompt) {
    lines.push(`[[AGENT_PROMPT]]\n${agentPrompt}\n[[/AGENT_PROMPT]]`);
  }

  if (openingLine) {
    lines.push(`[[OPENING_LINE]]\n${openingLine}\n[[/OPENING_LINE]]`);
  }

  if (talkingPoints.length > 0) {
    lines.push(
      `[[TALKING_POINTS]]\n${talkingPoints
        .map((point, idx) => `${idx + 1}. ${point}`)
        .join("\n")}\n[[/TALKING_POINTS]]`,
    );
  }

  lines.push(`Context: ${fallbackAdditionalInstructions}`);

  const objective = (params.callBrief?.objective || "").trim();
  const mustAsk = cleanList(params.callBrief?.must_ask);
  const preferences = cleanList(params.callBrief?.preferences);
  const constraints = cleanList(params.callBrief?.constraints);

  if (objective || mustAsk.length || preferences.length || constraints.length) {
    lines.push("[[CALL_BRIEF]]");
    lines.push("Call brief:");
    if (objective) {
      lines.push(`Objective: ${objective}`);
    }
    if (mustAsk.length > 0) {
      lines.push(`Must ask:\n${mustAsk.map((item) => `- ${item}`).join("\n")}`);
    }
    if (preferences.length > 0) {
      lines.push(
        `Preferences:\n${preferences.map((item) => `- ${item}`).join("\n")}`,
      );
    }
    if (constraints.length > 0) {
      lines.push(
        `Constraints:\n${constraints.map((item) => `- ${item}`).join("\n")}`,
      );
    }
    lines.push("[[/CALL_BRIEF]]");
  }

  lines.push(
    "[[GUARDRAILS]]\n- Use first-person singular (I), never we.\n- Do not proactively provide due date/service date unless asked or required.\n[[/GUARDRAILS]]",
  );

  return lines.join("\n\n");
}

// POST /api/calls - Create and initiate a new call (normal call: phone_number + purpose)
router.post(
  "/",
  authenticateCallApiToken,
  authenticateUser,
  requireAuth,
  callCreationLimiter,
  async (req: Request, res: Response) => {
    try {
      const requestId = (req as Request & { requestId?: string }).requestId;
      const {
        phone_number,
        purpose,
        agent_prompt,
        name,
        voice_preference,
        additional_instructions,
        opening_line,
        talking_points,
        call_brief,
      }: CreateCallRequest = req.body;

      // Validation
      if (!phone_number || !purpose?.trim()) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: phone_number and purpose",
        });
      }

      const trimmedName = typeof name === "string" ? name.trim() : "";
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          code: "missing_caller_name",
          message: "Who am I calling for?",
          error: "Missing required field: name",
        });
      }

      // Validate phone number
      const phoneValidation = validatePhoneNumber(phone_number);
      if (!phoneValidation.valid) {
        return res.status(400).json({
          success: false,
          error: phoneValidation.message,
        });
      }

      // Validate purpose
      const purposeValidation = validateCallPurpose(purpose.trim());
      if (!purposeValidation.valid) {
        return res.status(400).json({
          success: false,
          error: purposeValidation.message,
        });
      }

      // Get user ID from authenticated request (may be undefined when ALLOW_NO_AUTH=true)
      const userId = req.user?.id;
      if (!userId && !config.auth.allowNoAuth) {
        console.log("HEADERS:", req.headers);
        return res.status(401).json({
          success: false,
          error: "Authentication required to create calls",
        });
      }

      let freeTrialRemaining: number | undefined;
      if (userId) {
        try {
          const quotaResult = await CallService.consumeFreeCallRequest(userId);
          freeTrialRemaining = quotaResult.remaining;

          console.log(
            JSON.stringify({
              event: "free_call_quota_check",
              endpoint: "/api/calls",
              request_id: requestId ?? null,
              user_id: userId,
              quota_allowed: quotaResult.allowed,
              remaining: quotaResult.remaining,
            }),
          );

          if (!quotaResult.allowed) {
            const quotaSnapshot =
              await CallService.getFreeCallQuotaSnapshot(userId);
            console.warn(
              JSON.stringify({
                event: "free_call_quota_denied",
                endpoint: "/api/calls",
                request_id: requestId ?? null,
                user_id: userId,
                free_call_limit: quotaSnapshot?.limit ?? null,
                free_call_used: quotaSnapshot?.used ?? null,
              }),
            );
            return res.status(403).json({
              error: "Free trial exhausted",
              code: "FREE_CALL_LIMIT_REACHED",
              free_trial_remaining: 0,
            });
          }
        } catch (error) {
          console.error(
            JSON.stringify({
              event: "free_call_quota_check_failed",
              endpoint: "/api/calls",
              request_id: requestId ?? null,
              user_id: userId,
              message: error instanceof Error ? error.message : "Unknown error",
            }),
          );
          return res.status(503).json({
            error: "Free trial check unavailable",
            code: "FREE_CALL_QUOTA_UNAVAILABLE",
          });
        }
      }

      // Create call record with sanitized inputs
      // All calls now use GPT-4o Realtime
      console.log(`📝 Creating call with GPT-4o Realtime for user: ${userId}`);

      const call: Call = {
        id: uuidv4(),
        user_id: userId,
        phone_number: sanitizeInput(phone_number, 20),
        purpose: sanitizeInput(purpose.trim(), 2000),
        name: sanitizeInput(trimmedName, 100),
        status: "queued",
        created_at: new Date(),
        voice_preference: voice_preference || "professional_female",
        additional_instructions: sanitizeInput(
          buildStructuredAdditionalInstructions({
            purpose: purpose.trim(),
            agentPrompt: agent_prompt,
            additionalInstructions: additional_instructions,
            openingLine: opening_line,
            talkingPoints: talking_points,
            callBrief: call_brief,
          }),
          4000,
        ),
      };

      console.log(`✅ Call created: ${call.id}, user_id: ${call.user_id}`);

      // Save to database
      await CallService.createCall(call);

      // Initiate the call (async, don't wait)
      initiateCall(call)
        .then(() => {
          console.log(`✅ Call initiated successfully: ${call.id}`);
        })
        .catch(async (error) => {
          console.error(`❌ Failed to initiate call: ${call.id}`, error);
          await CallService.updateCall(call.id, { status: "failed" });
        });

      res.status(201).json({
        success: true,
        call,
        message: "Call queued successfully",
        free_trial_remaining: freeTrialRemaining,
      });
    } catch (error) {
      console.error("Error creating call:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create call",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * POST /api/calls/:id/join
 *
 * End-to-end contract (match Holdless / frontend):
 * - "Join call" dials the **end user** at the number they keep in the app (e.g. Profile → Phone),
 *   not the business / CSR number stored on this call as `phone_number` (`to_number` in DB).
 * - The browser sends `{ "to_phone": "<E.164>" }`. Only that value (after validation + normalization
 *   here) is used for the Twilio **outbound leg to the user**. The server does **not** substitute
 *   the business line from the row for this leg.
 * - Auth: same as other call routes (`Authorization: Bearer <JWT>`, plus `CALL_API_TOKEN` if configured).
 * - The server still checks the caller may access this `call_id` (ownership via `getCall`).
 */
router.post(
  "/:id/join",
  authenticateCallApiToken,
  authenticateUser,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const id = typeof req.params.id === "string" ? req.params.id : undefined;
      if (!id) {
        return res.status(400).json({ success: false, error: "Invalid call id" });
      }
      const userId = req.user?.id;
      if (!userId && !config.auth.allowNoAuth) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const { to_phone } = req.body as { to_phone?: string };
      if (!to_phone || typeof to_phone !== "string" || !to_phone.trim()) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: to_phone (E.164, the number to dial to reach you)",
        });
      }
      const phoneCheck = validatePhoneNumber(to_phone.trim());
      if (!phoneCheck.valid) {
        return res.status(400).json({
          success: false,
          error: phoneCheck.message || "Invalid phone number",
        });
      }
      const cleaned = to_phone.trim().replace(/[\s()-]/g, "");
      const toE164 = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;

      const call = await CallService.getCall(id, userId);
      if (!call) {
        return res.status(404).json({ success: false, error: "Call not found" });
      }
      if (call.user_joined_at) {
        return res.status(409).json({
          success: false,
          error: "You are already in this call (join was already used)",
        });
      }
      if (call.status !== "in_progress") {
        return res.status(400).json({
          success: false,
          error: "Call must be in progress to join. Wait until the line is active.",
        });
      }
      if (!call.call_sid) {
        return res.status(400).json({
          success: false,
          error: "This call is not connected to the phone network yet",
        });
      }

      await connectUserToOngoingConference(call, toE164);

      const joinedAt = new Date();
      const updated = await CallService.updateCall(call.id, {
        user_joined_at: joinedAt,
      });

      const payload = {
        call_id: call.id,
        joined_at: joinedAt.toISOString(),
      };
      io.to(`call:${call.id}`).emit("human_joined", payload);

      res.json({
        success: true,
        call: updated ?? { ...call, user_joined_at: joinedAt },
        message: "You are being called into the same conference. The AI session on the business line is ending.",
        user_leg: "outbound_queued",
      });
    } catch (error) {
      console.error("Error joining call:", error);
      res.status(500).json({
        success: false,
        error: "Failed to join call",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// GET /api/calls - Get all calls (filtered by authenticated user)
router.get("/", authenticateUser, async (req: Request, res: Response) => {
  try {
    // Get user ID from authenticated request (if available)
    const userId = req.user?.id;

    // Only return calls for the authenticated user
    // If no user is authenticated, return empty array
    const callsList = userId ? await CallService.getAllCalls(userId) : [];

    res.json({
      success: true,
      calls: callsList,
      count: callsList.length,
    });
  } catch (error) {
    console.error("Error fetching calls:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch calls",
    });
  }
});

// GET /api/calls/:id - Get a specific call (only if it belongs to the authenticated user)
router.get("/:id", authenticateUser, async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;
    if (!id) {
      return res.status(400).json({ success: false, error: "Invalid call id" });
    }
    const userId = req.user?.id;

    // Get call, filtering by user_id if user is authenticated
    const call = await CallService.getCall(id, userId);

    if (!call) {
      return res.status(404).json({
        success: false,
        error: "Call not found",
      });
    }

    res.json({
      success: true,
      call,
    });
  } catch (error) {
    console.error("Error fetching call:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch call",
    });
  }
});

// GET /api/calls/:id/transcripts - Get transcripts for a call (only if it belongs to the authenticated user)
router.get(
  "/:id/transcripts",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const id = typeof req.params.id === "string" ? req.params.id : undefined;
      if (!id) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid call id" });
      }
      const userId = req.user?.id;

      // Get call, filtering by user_id if user is authenticated
      const call = await CallService.getCall(id, userId);

      if (!call) {
        return res.status(404).json({
          success: false,
          error: "Call not found",
        });
      }

      const transcripts = await TranscriptService.getTranscripts(id);

      res.json({
        success: true,
        transcripts,
        count: transcripts.length,
      });
    } catch (error) {
      console.error("Error fetching transcripts:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch transcripts",
      });
    }
  },
);

// GET /api/calls/stats/summary - Get call statistics (filtered by authenticated user)
router.get(
  "/stats/summary",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const stats = await CallService.getStats(userId);
      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch statistics",
      });
    }
  },
);

// DELETE /api/calls/:id - Delete a call (only if it belongs to the authenticated user)
router.delete(
  "/:id",
  authenticateUser,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const id = typeof req.params.id === "string" ? req.params.id : undefined;
      if (!id) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid call id" });
      }
      const userId = req.user?.id;

      // Verify the call belongs to the user before deleting
      const call = await CallService.getCall(id, userId);
      if (!call) {
        return res.status(404).json({
          success: false,
          error: "Call not found",
        });
      }

      const deleted = await CallService.deleteCall(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "Call not found",
        });
      }

      res.json({
        success: true,
        message: "Call deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting call:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete call",
      });
    }
  },
);

export default router;
