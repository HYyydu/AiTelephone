# Debugging Call and Transcript Issues

## Current Status

- ✅ Call is being created successfully
- ✅ Twilio call is initiated
- ❌ Media stream WebSocket is NOT connecting
- ❌ No transcripts are being generated

## ⚠️ "An Application Error Has Occur" Message

**This is the MOST COMMON issue!**

If you hear "an application error has occur" when calling, it means **Twilio cannot connect to your WebSocket URL**.

### Most Common Causes:

1. **🚨 ngrok Free Tier Limitation (MOST LIKELY)**

   - ngrok free tier (`*.ngrok-free.app`) has **limited WebSocket support**
   - Twilio Media Streams require full WebSocket support
   - **Solution**: Upgrade to ngrok paid plan OR use Cloudflare Tunnel (free)

2. **PUBLIC_URL Not Set or Incorrect**

   - Check your `.env` file has `PUBLIC_URL=https://your-ngrok-url.ngrok-free.app`
   - Must start with `http://` or `https://`
   - Cannot be `localhost` or `127.0.0.1`

3. **WebSocket URL Format Issue**
   - Should be `wss://` (secure) or `ws://` (non-secure)
   - Path must be `/media-stream`

### How to Diagnose:

1. **Check your backend logs** when making a call:

   ```
   📞 Twilio voice webhook HIT!
   🔗 Stream URL: wss://...
   ⚠️  If you see "an application error has occur", Twilio cannot reach the WebSocket URL
   ```

2. **Test the diagnostics endpoint**:

   ```bash
   curl https://your-ngrok-url.ngrok-free.app/api/webhooks/diagnostics
   ```

   This will show configuration issues.

3. **Check if WebSocket upgrade is happening**:
   Look for: `🔄 WebSocket upgrade request: /media-stream`
   If you DON'T see this, Twilio never tried to connect (webhook issue)
   If you DO see this but no connection, WebSocket upgrade failed

### Solutions:

**Option 1: Upgrade ngrok (Recommended)**

- Sign up for ngrok paid plan ($8/month)
- Full WebSocket support
- More reliable for production

**Option 2: Use Cloudflare Tunnel (Free)**

- Install: `brew install cloudflare/cloudflare/cloudflared`
- Run: `cloudflared tunnel --url http://localhost:3001`
- Use the provided URL as `PUBLIC_URL`

**Option 3: Use a VPS/Cloud Server**

- Deploy your backend to a server with public IP
- No tunneling needed
- Most reliable for production

## Potential Issues

### 1. Media Stream WebSocket Not Connecting

**Symptoms:**

- "An application error has occur" message when calling
- No "🎙️ Media stream WebSocket connected" log
- No "🎬 Media stream started" log
- No transcription logs

**Possible Causes:**

1. **Ngrok WebSocket Support**: Free ngrok tier might not support WebSocket connections properly ⚠️ **MOST COMMON**
2. **WebSocket Upgrade Handler**: The upgrade handler might not be working correctly
3. **Twilio Media Streams Configuration**: Twilio might not be able to reach the WebSocket URL
4. **PUBLIC_URL not set or incorrect**: Environment variable missing or wrong format

### 2. Check These Logs

When you make a call, you should see:

1. `📞 Twilio voice webhook received` - Confirms Twilio is calling the webhook
2. `🔗 Stream URL: wss://...` - Shows the WebSocket URL being sent to Twilio
3. `🔄 WebSocket upgrade request: /media-stream` - Shows Twilio trying to connect
4. `🔌 WebSocket connection received from Twilio` - Confirms connection established
5. `🎬 Media stream started` - Shows the stream is active

### 3. Common Fixes

**If you don't see webhook logs:**

- ⚠️ **CRITICAL**: Check Twilio dashboard → Phone Numbers → Your number → Voice Configuration
- Verify the webhook URL is set to: `https://your-ngrok-url.ngrok-free.app/api/webhooks/twilio/voice`
- **Common mistake**: URL might be set to `/a` instead of `/api/webhooks/twilio/voice`
- Make sure BOTH "A call comes in" and "Primary handler fails" use the correct URL
- HTTP method should be "HTTP POST"

**If you see webhook but no WebSocket connection (or "an application error has occur"):**

- ⚠️ **MOST LIKELY**: ngrok free tier doesn't support WebSockets properly
  - **Solution**: Upgrade to ngrok paid plan ($8/month) OR use Cloudflare Tunnel (free)
- Check `PUBLIC_URL` is set correctly in `.env` file
- Verify the WebSocket URL uses `wss://` (secure WebSocket)
- Test diagnostics endpoint: `GET /api/webhooks/diagnostics`
- Check backend logs for WebSocket upgrade attempts

**If WebSocket connects but no transcripts:**

- Check Deepgram API key is set in `.env`
- Check OpenAI API key is set for TTS
- Look for Deepgram connection logs

## Next Steps

1. Make a test call
2. Check backend logs for the sequence above
3. Share which logs you see and which are missing
4. This will help identify exactly where the issue is
