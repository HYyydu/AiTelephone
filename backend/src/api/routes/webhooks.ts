// Twilio webhook routes
import { Router, Request, Response } from 'express';
import { store } from '../../database/models/store';
import { io } from '../../server';
import { CallStatus } from '../../types';

const router = Router();

// POST /api/webhooks/twilio/status - Handle call status updates from Twilio
router.post('/twilio/status', (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;
    
    console.log(`📞 Twilio webhook - CallSid: ${CallSid}, Status: ${CallStatus}`);

    // Find the call by Twilio SID
    const allCalls = store.getAllCalls();
    const call = allCalls.find(c => c.call_sid === CallSid);

    if (!call) {
      console.warn(`⚠️  Call not found for SID: ${CallSid}`);
      return res.status(200).send('OK'); // Still return 200 to Twilio
    }

    // Map Twilio status to our status
    let status: CallStatus = call.status;
    
    switch (CallStatus) {
      case 'queued':
      case 'ringing':
        status = 'calling';
        break;
      case 'in-progress':
        status = 'in_progress';
        if (!call.started_at) {
          store.updateCall(call.id, { started_at: new Date() });
        }
        break;
      case 'completed':
        status = 'completed';
        break;
      case 'busy':
      case 'no-answer':
      case 'failed':
      case 'canceled':
        status = 'failed';
        break;
    }

    // Update call in database
    const updates: Partial<typeof call> = { status };
    
    if (CallDuration) {
      updates.duration_seconds = parseInt(CallDuration, 10);
    }
    
    if (RecordingUrl) {
      updates.recording_url = RecordingUrl;
    }
    
    if (status === 'completed' || status === 'failed') {
      updates.ended_at = new Date();
    }

    store.updateCall(call.id, updates);

    // Emit WebSocket event
    io.to(`call:${call.id}`).emit('call_status', {
      call_id: call.id,
      status,
      duration: updates.duration_seconds,
    });

    if (status === 'completed' || status === 'failed') {
      io.to(`call:${call.id}`).emit('call_ended', {
        call_id: call.id,
        outcome: call.outcome,
        duration: updates.duration_seconds || 0,
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error processing Twilio webhook:', error);
    res.status(200).send('OK'); // Still return 200 to prevent Twilio retries
  }
});

// POST /api/webhooks/twilio/voice - Handle incoming call instructions (TwiML)
router.post('/twilio/voice', (req: Request, res: Response) => {
  try {
    const { CallSid } = req.body;
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
    
    // Create WebSocket URL for media streaming
    // Note: Replace https:// with wss:// and http:// with ws://
    const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const streamUrl = `${wsUrl}/media-stream?callSid=${CallSid}`;
    
    console.log(`📞 Generating TwiML for call: ${CallSid}`);
    console.log(`🔗 Stream URL: ${streamUrl}`);
    
    // TwiML with Media Streams for bidirectional audio
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Hello, this is an AI assistant. Please hold while I connect you.</Say>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
</Response>`;

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('❌ Error generating TwiML:', error);
    
    // Fallback TwiML
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I apologize, but I'm having technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`;
    
    res.type('text/xml');
    res.send(fallbackTwiml);
  }
});

export default router;

