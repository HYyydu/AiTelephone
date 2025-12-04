// Twilio webhook routes
import { Router, Request, Response } from 'express';
import { CallService } from '../../database/services/call-service';
import { io } from '../../server';
import { CallStatus, Call } from '../../types';

const router = Router();

// GET /api/webhooks/test - Test endpoint to verify webhook is reachable
router.get('/test', (req: Request, res: Response) => {
  console.log('✅ Webhook test endpoint hit!');
  res.json({
    success: true,
    message: 'Webhook endpoint is reachable',
    timestamp: new Date().toISOString(),
    url: req.url,
  });
});

// GET /api/webhooks/diagnostics - Diagnostic endpoint to check configuration
router.get('/diagnostics', (req: Request, res: Response) => {
  const publicUrl = process.env.PUBLIC_URL;
  const hasPublicUrl = !!publicUrl;
  
  let wsUrl = null;
  if (publicUrl) {
    wsUrl = publicUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/media-stream';
  }
  
  const diagnostics = {
    success: true,
    timestamp: new Date().toISOString(),
    configuration: {
      publicUrl: publicUrl || 'NOT SET',
      websocketUrl: wsUrl || 'NOT SET (PUBLIC_URL required)',
      hasPublicUrl,
    },
    warnings: [] as string[],
    errors: [] as string[],
  };
  
  if (!hasPublicUrl) {
    diagnostics.errors.push('PUBLIC_URL environment variable is not set');
    diagnostics.errors.push('Twilio cannot connect to localhost - you must use ngrok or similar');
  } else {
    if (publicUrl?.includes('localhost') || publicUrl?.includes('127.0.0.1')) {
      diagnostics.errors.push('PUBLIC_URL contains localhost - Twilio cannot reach this');
    }
    
    if (publicUrl?.includes('ngrok-free.app')) {
      diagnostics.warnings.push('Using ngrok free tier - WebSocket support may be limited');
      diagnostics.warnings.push('If you see "an application error has occur", upgrade to ngrok paid plan');
    }
    
    if (!publicUrl?.startsWith('http://') && !publicUrl?.startsWith('https://')) {
      diagnostics.errors.push('PUBLIC_URL must start with http:// or https://');
    }
  }
  
  res.json(diagnostics);
});

// GET /api/webhooks/twilio/voice - Also handle GET requests (for testing)
router.get('/twilio/voice', (req: Request, res: Response) => {
  console.log('📞 GET request to /twilio/voice (testing)');
  res.json({
    message: 'Voice webhook endpoint is reachable',
    method: 'GET',
    query: req.query,
  });
});

// POST /api/webhooks/twilio/status - Handle call status updates from Twilio
router.post('/twilio/status', async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;
    
    console.log(`📞 Twilio status webhook - CallSid: ${CallSid}, Status: ${CallStatus}`);

    // Find the call by Twilio SID (optimized query)
    const call = await CallService.getCallByCallSid(CallSid);

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
          await CallService.updateCall(call.id, { started_at: new Date() });
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
    const updates: Partial<Call> = { status };
    
    if (CallDuration) {
      updates.duration_seconds = parseInt(CallDuration, 10);
    }
    
    if (RecordingUrl) {
      updates.recording_url = RecordingUrl;
    }
    
    if (status === 'completed' || status === 'failed') {
      updates.ended_at = new Date();
    }

    await CallService.updateCall(call.id, updates);

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
      console.error('❌ No CallSid in Twilio voice webhook');
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I apologize, but there was an error processing your call.</Say>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      return res.send(errorTwiml);
    }
    
    // Get base URL - must be the public ngrok URL for WebSocket connections
    const baseUrl = process.env.PUBLIC_URL;
    
    if (!baseUrl) {
      console.error('❌ CRITICAL: PUBLIC_URL environment variable is not set!');
      console.error('❌ Twilio cannot connect to localhost. WebSocket will fail.');
      console.error('❌ Please set PUBLIC_URL in your .env file to your ngrok URL');
      
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I apologize, but there was a configuration error. Please contact support.</Say>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      return res.send(errorTwiml);
    }
    
    // Validate PUBLIC_URL format
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      console.error(`❌ CRITICAL: PUBLIC_URL must start with http:// or https://`);
      console.error(`❌ Current value: ${baseUrl}`);
      
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I apologize, but there was a configuration error. Please contact support.</Say>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      return res.send(errorTwiml);
    }
    
    // Ensure we have a full URL with protocol
    const fullUrl = baseUrl;
    
    // Create WebSocket URL for media streaming
    // Note: Replace https:// with wss:// and http:// with ws://
    const wsUrl = fullUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const streamUrl = `${wsUrl}/media-stream?callSid=${CallSid}`;
    
    console.log(`📞 Generating TwiML for call: ${CallSid}`);
    console.log(`🔗 Base URL: ${baseUrl}`);
    console.log(`🔗 Full URL: ${fullUrl}`);
    console.log(`🔗 WebSocket URL: ${wsUrl}`);
    console.log(`🔗 Stream URL: ${streamUrl}`);
    
    // Validate WebSocket URL format
    if (!streamUrl.startsWith('wss://') && !streamUrl.startsWith('ws://')) {
      console.error(`❌ CRITICAL: Invalid WebSocket URL format: ${streamUrl}`);
      
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I apologize, but there was a configuration error. Please contact support.</Say>
  <Hangup/>
</Response>`;
      res.type('text/xml');
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
    console.log(`✅ TwiML sent successfully. Twilio should now connect to: ${streamUrl}`);
    console.log(`⚠️  If you see "an application error has occur", Twilio cannot reach the WebSocket URL`);
    console.log(`⚠️  This usually means:`);
    console.log(`   1. ngrok free tier doesn't support WebSockets (upgrade to paid plan)`);
    console.log(`   2. The WebSocket URL is incorrect or unreachable`);
    console.log(`   3. Firewall/network blocking the connection`);
    
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('❌ Error generating TwiML:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
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

// POST /api/webhooks/twilio/dtmf - Handle DTMF tone sending via TwiML
// This endpoint sends DTMF digits and then reconnects to the media stream
router.post('/twilio/dtmf', (req: Request, res: Response) => {
  try {
    const { digits, callSid } = req.query;
    
    if (!digits || !callSid) {
      console.error('❌ Missing digits or callSid in DTMF webhook');
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      return res.send(errorTwiml);
    }
    
    // Validate digits
    if (!/^[0-9*#w]+$/.test(digits as string)) {
      console.error(`❌ Invalid DTMF digits: ${digits}`);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      return res.send(errorTwiml);
    }
    
    console.log(`🔢 DTMF webhook called - Sending digits: "${digits}" for call: ${callSid}`);
    
    // Get base URL for media stream
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
    const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
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
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('❌ Error in DTMF webhook:', error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

export default router;
