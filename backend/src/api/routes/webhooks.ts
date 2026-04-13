// Twilio webhook routes
import { Router, Request, Response } from "express";
import { CallService } from "../../database/services/call-service";
import { io } from "../../server";
import { CallStatus, Call } from "../../types";
import { getPublicBaseUrl } from "../../utils/public-url";

const router = Router();

// GET /api/webhooks/test - Test endpoint to verify webhook is reachable
router.get("/test", (req: Request, res: Response) => {
  console.log("✅ Webhook test endpoint hit!");
  res.json({
    success: true,
    message: "Webhook endpoint is reachable",
    timestamp: new Date().toISOString(),
    url: req.url,
  });
});

// GET /api/webhooks/diagnostics - Diagnostic endpoint to check configuration
router.get("/diagnostics", (req: Request, res: Response) => {
  const publicUrlEnv = process.env.PUBLIC_URL?.trim() || "";
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim() || "";
  const publicUrl = getPublicBaseUrl();
  const hasExplicitPublicUrl = !!publicUrlEnv;

  let wsUrl: string | null = null;
  let exampleStreamUrl: string | null = null;
  if (publicUrl) {
    wsUrl =
      publicUrl.replace("https://", "wss://").replace("http://", "ws://") +
      "/media-stream";
    exampleStreamUrl = `${wsUrl}?callSid=CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`;
  }

  const diagnostics = {
    success: true,
    timestamp: new Date().toISOString(),
    configuration: {
      PUBLIC_URL_env: publicUrlEnv || "NOT SET",
      RAILWAY_PUBLIC_DOMAIN: railwayDomain || "NOT SET",
      resolvedPublicUrl: publicUrl,
      websocketUrl: wsUrl || "NOT SET",
      exampleStreamUrl: exampleStreamUrl || "NOT SET",
      hasExplicitPublicUrl,
    },
    warnings: [] as string[],
    errors: [] as string[],
    recommendations: [] as string[],
  };

  if (!hasExplicitPublicUrl && !railwayDomain) {
    diagnostics.errors.push(
      "PUBLIC_URL is not set (and RAILWAY_PUBLIC_DOMAIN not set) — Twilio webhooks default to localhost and will not work remotely",
    );
    diagnostics.errors.push(
      "Twilio cannot connect to localhost - you must use ngrok, Cloudflare Tunnel, or a production server",
    );
    diagnostics.recommendations.push(
      "Set PUBLIC_URL to your deployed API origin (e.g. https://your-service.up.railway.app) with no trailing slash",
    );
  } else {
    if (publicUrl.includes("localhost") || publicUrl.includes("127.0.0.1")) {
      diagnostics.errors.push(
        "PUBLIC_URL contains localhost - Twilio cannot reach this from the internet"
      );
      diagnostics.recommendations.push(
        "Use ngrok, Cloudflare Tunnel, or deploy to a production server"
      );
    }

    if (publicUrl.includes("ngrok-free.app") || /ngrok/i.test(publicUrl)) {
      diagnostics.warnings.push(
        "Using ngrok free tier - WebSocket support is LIMITED and may cause connection failures"
      );
      diagnostics.warnings.push(
        'If you hear "an application error has occur", this is likely why'
      );
      diagnostics.recommendations.push(
        "Option 1: Upgrade to ngrok paid plan ($8/month) for full WebSocket support"
      );
      diagnostics.recommendations.push(
        "Option 2: Use Cloudflare Tunnel (FREE) - run: cloudflared tunnel --url http://localhost:3001"
      );
      diagnostics.recommendations.push(
        "Option 3: Deploy to Railway/Render/Vercel for production-ready setup"
      );
    }

    if (publicUrl.includes("trycloudflare.com")) {
      diagnostics.warnings.push(
        "Using Cloudflare Tunnel - this should work, but URLs change on restart"
      );
    }

    if (
      !publicUrl.startsWith("http://") &&
      !publicUrl.startsWith("https://")
    ) {
      diagnostics.errors.push("PUBLIC_URL must start with http:// or https://");
      diagnostics.recommendations.push(
        `Current value: "${publicUrl}" - add the protocol prefix`,
      );
    }

    if (publicUrl.endsWith("/")) {
      diagnostics.warnings.push(
        "PUBLIC_URL ends with a trailing slash - this may cause URL construction issues"
      );
      diagnostics.recommendations.push(
        "Remove trailing slash from PUBLIC_URL (e.g., use 'https://example.com' not 'https://example.com/')"
      );
    }

    // Test if WebSocket URL format is correct
    if (wsUrl) {
      if (!wsUrl.startsWith("wss://") && !wsUrl.startsWith("ws://")) {
        diagnostics.errors.push(
          `Generated WebSocket URL has invalid format: ${wsUrl}`
        );
      }
      if (!wsUrl.includes("/media-stream")) {
        diagnostics.errors.push("WebSocket URL is missing /media-stream path");
      }
    }
  }

  // Check if backend is accessible
  diagnostics.recommendations.push(
    "Make a test call and watch backend logs for: '🔄 WebSocket upgrade request: /media-stream'"
  );
  diagnostics.recommendations.push(
    "If you don't see the WebSocket upgrade request, Twilio cannot reach your WebSocket URL"
  );

  res.json(diagnostics);
});

// GET /api/webhooks/twilio/voice - Also handle GET requests (for testing)
router.get("/twilio/voice", (req: Request, res: Response) => {
  console.log("📞 GET request to /twilio/voice (testing)");
  res.json({
    message: "Voice webhook endpoint is reachable",
    method: "GET",
    query: req.query,
  });
});

// POST /api/webhooks/twilio/status - Handle call status updates from Twilio
router.post("/twilio/status", async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration, RecordingUrl, To, From } =
      req.body;

    console.log(
      `📞 Twilio status webhook - CallSid: ${CallSid}, Status: ${CallStatus}, To: ${To ?? "?"}, From: ${From ?? "?"}`
    );

    // Find the call by Twilio SID (optimized query)
    // Add retry logic for database connection timeouts
    let call;
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        call = await CallService.getCallByCallSid(CallSid);
        break; // Success, exit retry loop
      } catch (error: any) {
        retryCount++;
        const isTimeoutError =
          error?.message?.includes("timeout") ||
          error?.message?.includes("Connection terminated") ||
          error?.cause?.message?.includes("timeout");

        if (isTimeoutError && retryCount < maxRetries) {
          console.warn(
            `⚠️  Database timeout (attempt ${retryCount}/${maxRetries}), retrying...`
          );
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount)
          );
          continue;
        } else {
          // Not a timeout error, or max retries reached
          throw error;
        }
      }
    }

    if (!call) {
      console.warn(`⚠️  Call not found for SID: ${CallSid}`);
      return res.status(200).send("OK"); // Still return 200 to Twilio
    }

    // Map Twilio status to our status
    let status: CallStatus = call.status;

    switch (CallStatus) {
      case "queued":
      case "ringing":
        status = "calling";
        break;
      case "in-progress":
        status = "in_progress";
        if (!call.started_at) {
          await CallService.updateCall(call.id, { started_at: new Date() });
        }
        break;
      case "completed":
        status = "completed";
        break;
      case "busy":
      case "no-answer":
      case "failed":
      case "canceled":
        status = "failed";
        break;
    }

    // Update call in database
    const updates: Partial<Call> = { status };

    if (CallDuration) {
      updates.duration_seconds = parseInt(CallDuration, 10);
    }

    if (RecordingUrl) {
      updates.recording_url = RecordingUrl;
    }

    if (status === "completed" || status === "failed") {
      updates.ended_at = new Date();
    }

    await CallService.updateCall(call.id, updates);

    // Emit WebSocket event so frontend gets live status
    io.to(`call:${call.id}`).emit("call_status", {
      call_id: call.id,
      status,
      duration: updates.duration_seconds,
    });

    // Strong signal: emit call_ended when call is completed or failed (e.g. user hung up)
    if (status === "completed" || status === "failed") {
      const endedAt = updates.ended_at ?? new Date();
      const fresh = await CallService.getCall(call.id);
      const outcome = fresh?.outcome ?? call.outcome;
      const endReason =
        outcome === "token_budget_exceeded" ? "token_budget" : undefined;
      const payload = {
        call_id: call.id,
        outcome,
        duration: updates.duration_seconds ?? 0,
        ended_at: endedAt instanceof Date ? endedAt.toISOString() : endedAt,
        ...(endReason ? { end_reason: endReason } : {}),
      };
      io.to(`call:${call.id}`).emit("call_ended", payload);
      console.log(
        `📴 Call ended signal sent to frontend | call_id: ${call.id} | status: ${status} | duration: ${payload.duration}s`
      );
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error processing Twilio webhook:", error);
    res.status(200).send("OK"); // Still return 200 to prevent Twilio retries
  }
});

// POST /api/webhooks/twilio/voice - Handle incoming call instructions (TwiML)
router.post("/twilio/voice", (req: Request, res: Response) => {
  try {
    // Log ALL incoming requests to this endpoint
    console.log(`📞 ============================================`);
    console.log(`📞 Twilio voice webhook HIT!`);
    console.log(`📞 Method: ${req.method}`);
    console.log(`📞 URL: ${req.url}`);
    console.log(`📞 Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`📞 Body:`, JSON.stringify(req.body, null, 2));
    console.log(`📞 Query:`, JSON.stringify(req.query, null, 2));
    console.log(`📞 ============================================`);

    const { CallSid } = req.body;

    if (!CallSid) {
      console.error("❌ No CallSid in Twilio voice webhook");
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I apologize, but there was an error processing your call.</Say>
  <Hangup/>
</Response>`;
      res.type("text/xml");
      return res.send(errorTwiml);
    }

    // Get base URL — must be a public HTTPS origin (e.g. Railway), not a stale ngrok tunnel.
    const baseUrl = getPublicBaseUrl();

    let voiceHostname = "";
    try {
      voiceHostname = new URL(baseUrl).hostname;
    } catch {
      voiceHostname = "";
    }
    if (
      !voiceHostname ||
      voiceHostname === "localhost" ||
      voiceHostname === "127.0.0.1"
    ) {
      console.error(
        "❌ CRITICAL: Resolved PUBLIC_URL is missing or localhost — Twilio cannot reach your server.",
      );
      console.error(
        "❌ Set PUBLIC_URL to your deployed API (e.g. https://your-service.up.railway.app)",
      );

      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I apologize, but there was a configuration error. Please contact support.</Say>
  <Hangup/>
</Response>`;
      res.type("text/xml");
      return res.send(errorTwiml);
    }

    // Validate PUBLIC_URL format
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      console.error(
        `❌ CRITICAL: PUBLIC_URL must start with http:// or https://`
      );
      console.error(`❌ Current value: ${baseUrl}`);

      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I apologize, but there was a configuration error. Please contact support.</Say>
  <Hangup/>
</Response>`;
      res.type("text/xml");
      return res.send(errorTwiml);
    }

    // Ensure we have a full URL with protocol
    const fullUrl = baseUrl;

    // Create WebSocket URL for media streaming
    // Note: Replace https:// with wss:// and http:// with ws://
    const wsUrl = fullUrl
      .replace("https://", "wss://")
      .replace("http://", "ws://");
    const streamUrl = `${wsUrl}/media-stream?callSid=${CallSid}`;

    console.log(`📞 Generating TwiML for call: ${CallSid}`);
    console.log(`🔗 Base URL: ${baseUrl}`);
    console.log(`🔗 Full URL: ${fullUrl}`);
    console.log(`🔗 WebSocket URL: ${wsUrl}`);
    console.log(`🔗 Stream URL: ${streamUrl}`);

    // Validate WebSocket URL format
    if (!streamUrl.startsWith("wss://") && !streamUrl.startsWith("ws://")) {
      console.error(`❌ CRITICAL: Invalid WebSocket URL format: ${streamUrl}`);

      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I apologize, but there was a configuration error. Please contact support.</Say>
  <Hangup/>
</Response>`;
      res.type("text/xml");
      return res.send(errorTwiml);
    }

    // TwiML with Media Streams for bidirectional audio
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
</Response>`;

    console.log(`📄 TwiML Response:`, twiml);
    console.log(
      `✅ TwiML sent successfully. Twilio should now connect to: ${streamUrl}`
    );
    console.log(
      `⚠️  If you see "an application error has occur", Twilio cannot reach the WebSocket URL`
    );
    console.log(`⚠️  This usually means:`);
    console.log(
      `   1. ngrok free tier doesn't support WebSockets (upgrade to paid plan)`
    );
    console.log(`   2. The WebSocket URL is incorrect or unreachable`);
    console.log(`   3. Firewall/network blocking the connection`);

    res.type("text/xml");
    res.send(twiml);
  } catch (error) {
    console.error("❌ Error generating TwiML:", error);
    console.error(
      "❌ Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    // Fallback TwiML
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I apologize, but I'm having technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`;

    res.type("text/xml");
    res.send(fallbackTwiml);
  }
});

// POST /api/webhooks/twilio/dtmf - Handle DTMF tone sending via TwiML
// This endpoint sends DTMF digits and then reconnects to the media stream
router.post("/twilio/dtmf", (req: Request, res: Response) => {
  try {
    const digits =
      typeof req.query.digits === "string" ? req.query.digits : undefined;
    const callSid =
      typeof req.query.callSid === "string" ? req.query.callSid : undefined;

    if (!digits || !callSid) {
      console.error("❌ Missing digits or callSid in DTMF webhook");
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
      res.type("text/xml");
      return res.send(errorTwiml);
    }

    // Validate digits
    if (!/^[0-9*#w]+$/.test(digits)) {
      console.error(`❌ Invalid DTMF digits: ${digits}`);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
      res.type("text/xml");
      return res.send(errorTwiml);
    }

    console.log(
      `🔢 DTMF webhook called - Sending digits: "${digits}" for call: ${callSid}`
    );

    // Get base URL for media stream
    const baseUrl = getPublicBaseUrl();
    const wsUrl = baseUrl
      .replace("https://", "wss://")
      .replace("http://", "ws://");
    const streamUrl = `${wsUrl}/media-stream?callSid=${callSid}`;

    // TwiML to play DTMF digits, then reconnect to media stream
    // Note: This will temporarily disconnect the stream, send digits, then reconnect
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play digits="${digits}"/>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
</Response>`;

    console.log(`✅ DTMF TwiML generated for digits: "${digits}"`);
    res.type("text/xml");
    res.send(twiml);
  } catch (error) {
    console.error("❌ Error in DTMF webhook:", error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
    res.type("text/xml");
    res.send(errorTwiml);
  }
});

export default router;
