# 🔍 Debugging Routing Issue

You're seeing Deepgram being used even though you selected GPT-4o-Realtime. Here's how to debug it:

## The Problem

The routing logic checks `ai_provider` at WebSocket connection time, but:

1. The call might not have `call_sid` set yet (Twilio assigns it when the call is made)
2. So the routing can't find the call and defaults to Deepgram

## How to Debug

### Step 1: Check if `ai_provider` is being saved

Look for these logs when creating a call:

```
📝 Creating call with ai_provider: gpt4o-realtime (requested: gpt4o-realtime)
✅ Call created: <call-id>, ai_provider: gpt4o-realtime
```

**If you don't see "ai_provider: gpt4o-realtime"**, the issue is in call creation.

### Step 2: Check routing at connection time

Look for these logs when the WebSocket connects:

```
📞 CallSid from query parameter: CAxxxxx
📋 Found call <call-id> at connection time, ai_provider: gpt4o-realtime
🚀 Using GPT-4o-Realtime handler for call: <call-id>
```

**OR:**

```
⚠️  Call not found at connection time for SID: CAxxxxx
⚠️  Will check again on start event - defaulting to Deepgram for now
```

### Step 3: Check routing at start event

Look for these logs in the "start" event:

```
📋 Found call <call-id> - ai_provider: gpt4o-realtime
❌ ERROR: Call <call-id> is configured for GPT-4o-Realtime, but Deepgram handler was created!
```

This means the routing failed at connection time.

## The Fix

The code now:

1. Checks `ai_provider` at connection time if `callSid` is available
2. Checks again in the "start" event and rejects Deepgram handler if `ai_provider === 'gpt4o-realtime'`

## Next Steps

1. **Create a new call** with GPT-4o-Realtime selected
2. **Check the logs** for the routing messages above
3. **Share the logs** so we can see where the routing is failing

The most likely issues:

- Call doesn't have `call_sid` at connection time → routing defaults to Deepgram
- Call's `ai_provider` isn't saved correctly → routing can't detect it
- Routing check isn't finding the call → need to improve the lookup logic
