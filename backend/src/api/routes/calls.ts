// Call management routes
import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  CallService,
  TranscriptService,
} from "../../database/services/call-service";
import { CreateCallRequest, Call } from "../../types";
import { initiateCall } from "../../services/telephony";
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

const router = Router();

// POST /api/calls - Create and initiate a new call (normal call: phone_number + purpose)
router.post(
  "/",
  authenticateCallApiToken,
  authenticateUser,
  requireAuth,
  callCreationLimiter,
  async (req: Request, res: Response) => {
    try {
      const {
        phone_number,
        purpose,
        name,
        voice_preference,
        additional_instructions,
      }: CreateCallRequest = req.body;

      // Validation
      if (!phone_number || !purpose?.trim()) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: phone_number and purpose",
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
              user_id: userId,
              quota_allowed: quotaResult.allowed,
              remaining: quotaResult.remaining,
            }),
          );

          if (!quotaResult.allowed) {
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
        name: name?.trim() ? sanitizeInput(name.trim(), 100) : undefined,
        status: "queued",
        created_at: new Date(),
        voice_preference: voice_preference || "professional_female",
        additional_instructions: additional_instructions
          ? sanitizeInput(additional_instructions.trim(), 1000)
          : undefined,
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
