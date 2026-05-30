import twilio from "twilio";
import { config } from "../config";
import { CallService } from "../database/services/call-service";
import type { Call } from "../types";

const twilioClient = twilio(
  config.twilio.accountSid,
  config.twilio.authToken,
);

/** Twilio recording REST URLs need a media extension for browser playback. */
export function recordingMediaUrl(recordingUrl: string): string {
  const base = recordingUrl.replace(/\/$/, "");
  if (/\.(mp3|wav)$/i.test(base)) return base;
  return `${base}.mp3`;
}

/** Latest completed recording for a Twilio CallSid, or null. */
export async function fetchLatestRecordingUrl(
  callSid: string,
): Promise<string | null> {
  const list = await twilioClient.recordings.list({ callSid, limit: 10 });
  const completed =
    list.find((r) => r.status === "completed") ??
    list.find((r) => r.uri) ??
    null;
  if (!completed?.uri) return null;
  return `https://api.twilio.com${completed.uri.replace(/\.json$/i, "")}`;
}

/** Persist recording_url on the call row when Twilio has a recording. */
export async function syncCallRecording(call: Call): Promise<string | undefined> {
  if (call.recording_url?.trim()) return call.recording_url;
  if (!call.call_sid?.trim()) return undefined;

  try {
    const url = await fetchLatestRecordingUrl(call.call_sid);
    if (!url) return undefined;
    await CallService.updateCall(call.id, { recording_url: url });
    return url;
  } catch (err) {
    console.warn(`⚠️ syncCallRecording failed for ${call.id}:`, err);
    return undefined;
  }
}

/** Stream recording audio from Twilio (Basic auth). */
export async function fetchRecordingStream(
  recordingUrl: string,
): Promise<Response> {
  const mediaUrl = recordingMediaUrl(recordingUrl);
  const auth = Buffer.from(
    `${config.twilio.accountSid}:${config.twilio.authToken}`,
  ).toString("base64");
  return fetch(mediaUrl, {
    headers: { Authorization: `Basic ${auth}` },
  });
}
