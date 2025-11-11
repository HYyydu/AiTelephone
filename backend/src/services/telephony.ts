// Twilio telephony service
import twilio from 'twilio';
import { config } from '../config';
import { Call } from '../types';
import { store } from '../database/models/store';

const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

export async function initiateCall(call: Call): Promise<void> {
  try {
    console.log(`📞 Initiating call to ${call.phone_number} for purpose: ${call.purpose}`);

    // Update call status
    store.updateCall(call.id, { status: 'calling' });

    // Determine the webhook URL (you'll need to expose this publicly with ngrok for development)
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
    const statusCallbackUrl = `${baseUrl}/api/webhooks/twilio/status`;
    const voiceUrl = `${baseUrl}/api/webhooks/twilio/voice`;

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
    store.updateCall(call.id, {
      call_sid: twilioCall.sid,
      status: 'calling',
    });
  } catch (error) {
    console.error(`❌ Failed to initiate call:`, error);
    store.updateCall(call.id, {
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

export function isConfigured(): boolean {
  return !!(
    config.twilio.accountSid &&
    config.twilio.authToken &&
    config.twilio.phoneNumber
  );
}

