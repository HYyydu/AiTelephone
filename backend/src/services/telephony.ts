// Twilio telephony service
import twilio from 'twilio';
import { config } from '../config';
import { Call } from '../types';
import { CallService } from '../database/services/call-service';
import { getPublicBaseUrl } from '../utils/public-url';

const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

/** Twilio returns 21205 for localhost; fail early with a clear message. */
function assertPublicWebhookBase(baseUrl: string): void {
  let hostname: string;
  try {
    hostname = new URL(baseUrl).hostname;
  } catch {
    throw new Error(
      `Invalid PUBLIC_URL "${baseUrl}". Use a full URL like https://your-tunnel.example.com`,
    );
  }
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local")
  ) {
    throw new Error(
      `Twilio cannot use webhook URL ${baseUrl} (localhost is not reachable from the internet). ` +
        `Expose your backend with ngrok, Cloudflare Tunnel, etc., then set PUBLIC_URL to that HTTPS origin (no trailing slash).`,
    );
  }
}

export async function initiateCall(call: Call): Promise<void> {
  try {
    console.log(`📞 Initiating call to ${call.phone_number} for purpose: ${call.purpose}`);

    // Update call status
    await CallService.updateCall(call.id, { status: 'calling' });

    // Webhooks must be public HTTPS (or at least non-localhost); use ngrok / tunnel in dev.
    const baseUrl = getPublicBaseUrl();
    assertPublicWebhookBase(baseUrl);
    const statusCallbackUrl = `${baseUrl}/api/webhooks/twilio/status`;
    const voiceUrl = `${baseUrl}/api/webhooks/twilio/voice`;

    console.log(`📞 Using voice webhook URL: ${voiceUrl}`);

    // Make the call using Twilio
    const twilioCall = await twilioClient.calls.create({
      to: call.phone_number,
      from: config.twilio.phoneNumber,
      url: voiceUrl,
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: config.call.recordCalls,
      recordingStatusCallback: statusCallbackUrl,
    });

    console.log(`✅ Twilio call created: ${twilioCall.sid}`);

    // Update call with Twilio SID
    await CallService.updateCall(call.id, {
      call_sid: twilioCall.sid,
      status: 'calling',
    });
  } catch (error) {
    console.error(`❌ Failed to initiate call:`, error);
    await CallService.updateCall(call.id, {
      status: 'failed',
      ended_at: new Date(),
    });
    throw error;
  }
}

export async function endCall(callSid: string): Promise<void> {
  try {
    await twilioClient.calls(callSid).update({ status: 'completed' });
    console.log(`✅ Call ended: ${callSid}`);
  } catch (error) {
    console.error(`❌ Failed to end call:`, error);
    throw error;
  }
}

export async function sendDTMF(callSid: string, digits: string): Promise<void> {
  try {
    if (!callSid) {
      throw new Error('CallSid is required to send DTMF tones');
    }
    
    // Validate digits - only allow 0-9, *, #, and w (wait)
    const validDigits = /^[0-9*#w]+$/.test(digits);
    if (!validDigits) {
      throw new Error(`Invalid DTMF digits: ${digits}. Only 0-9, *, #, and w (wait) are allowed.`);
    }
    
    console.log(`🔢 Sending DTMF tones: "${digits}" for call: ${callSid}`);
    
    // Get base URL for TwiML endpoint
    const baseUrl = getPublicBaseUrl();
    const dtmfUrl = `${baseUrl}/api/webhooks/twilio/dtmf?digits=${encodeURIComponent(digits)}&callSid=${callSid}`;
    
    // Redirect the call to a TwiML endpoint that plays the DTMF digits
    // This is the recommended way to send DTMF during an active call
    await twilioClient.calls(callSid).update({
      url: dtmfUrl,
      method: 'POST',
    });
    
    console.log(`✅ DTMF redirect sent successfully: "${digits}"`);
  } catch (error) {
    console.error(`❌ Failed to send DTMF tones:`, error);
    throw error;
  }
}

export function isConfigured(): boolean {
  return !!(
    config.twilio.accountSid &&
    config.twilio.authToken &&
    config.twilio.phoneNumber
  );
}

/** Conference room name for a call; must match aicc-<uuid> so webhooks can validate. */
const CONFERENCE_ROOM_RE = /^aicc-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function conferenceRoomNameForCallId(callId: string): string {
  return `aicc-${callId.toLowerCase()}`;
}

export function isValidConferenceRoomName(room: string | undefined | null): boolean {
  if (!room || typeof room !== "string") return false;
  return CONFERENCE_ROOM_RE.test(room.trim());
}

/**
 * Redirects the (business) leg away from the Media Stream into a named Twilio conference,
 * then dials the **end user** into the same room. The stream disconnect stops the OpenAI Realtime
 * path for that leg; cleanup runs in the media WebSocket handler.
 *
 * `userE164` is the only destination for the second leg — the client's join payload (e.g. profile
 * phone). It must **not** be the CSR/business `phone_number` on the call record.
 */
export async function connectUserToOngoingConference(
  call: { id: string; call_sid?: string | null },
  userE164: string,
): Promise<{ user_leg_call_sid: string }> {
  if (!call.call_sid?.trim()) {
    throw new Error("Call has no Twilio CallSid yet");
  }

  const baseUrl = getPublicBaseUrl();
  assertPublicWebhookBase(baseUrl);

  const room = conferenceRoomNameForCallId(call.id);
  const confUrl = `${baseUrl}/api/webhooks/twilio/conference-join?room=${encodeURIComponent(room)}`;

  await twilioClient.calls(call.call_sid).update({
    url: confUrl,
    method: "POST",
  });

  console.log(
    `🤝 User join: business leg ${call.call_sid} redirected to conference room ${room} (AI stream will stop)`,
  );

  const out = await twilioClient.calls.create({
    to: userE164,
    from: config.twilio.phoneNumber,
    url: confUrl,
    method: "POST",
  });

  if (!out.sid) {
    throw new Error("Twilio did not return a new call SID for the user leg");
  }

  console.log(
    `🤝 User join: outbound to user leg ${out.sid} (same room ${room})`,
  );

  return { user_leg_call_sid: out.sid };
}

