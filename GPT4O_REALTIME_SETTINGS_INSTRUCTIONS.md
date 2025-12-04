# 🔧 GPT-4o-Realtime API & Twilio Settings Instructions

**This document contains ONLY the settings you need to change. All code has been implemented.**

---

## ✅ What's Already Done

All the code implementation is complete:

- ✅ Complete GPT-4o-Realtime handler
- ✅ Realtime API connection helper
- ✅ Audio streaming (Twilio ↔ OpenAI)
- ✅ Transcript handling
- ✅ System prompt integration

---

## 📝 Required Settings Changes

### 1. Environment Variables

Add these to your `backend/.env` file:

```env
# OpenAI Realtime API Settings
# Check OpenAI's latest documentation for the correct model name
OPENAI_REALTIME_API_URL=wss://api.openai.com/v1/realtime
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17
```

**⚠️ Important:**

- The model name may change - check [OpenAI's Realtime API documentation](https://platform.openai.com/docs/guides/realtime) for the latest model name
- Verify the WebSocket URL is correct for your OpenAI account

### 2. Verify OpenAI API Key

Make sure your `OPENAI_API_KEY` is set in `backend/.env`:

```env
OPENAI_API_KEY=sk-your-key-here
```

**Note:** The same API key used for GPT-4 and TTS should work for Realtime API, but verify you have access to the Realtime API feature.

### 3. Check OpenAI Realtime API Access

1. **Verify Access:**

   - Log into your OpenAI account
   - Check that you have access to the Realtime API (it may be in preview/beta)
   - Ensure your API key has the necessary permissions

2. **Check Rate Limits:**

   - Verify your account has sufficient rate limits for Realtime API
   - Realtime API may have different pricing than standard API calls

3. **Get Latest Model Name:**
   - Visit: https://platform.openai.com/docs/guides/realtime
   - Find the current model name for GPT-4o-Realtime
   - Update `OPENAI_REALTIME_MODEL` in `.env` if different

### 4. Verify WebSocket URL Format

The default URL is:

```
wss://api.openai.com/v1/realtime
```

**If this doesn't work:**

1. Check OpenAI's latest documentation
2. Verify the endpoint hasn't changed
3. Check if your account requires a different endpoint (e.g., different region)

---

## 🔍 Testing & Verification

### Step 1: Test Connection

1. Start your backend server:

   ```bash
   cd backend
   npm run dev
   ```

2. Create a new task and select "GPT-4o-Realtime (Experimental)" as the AI provider

3. Check the logs for:
   - `✅ OpenAI Realtime API WebSocket connected` - Connection successful
   - `❌ Failed to connect to OpenAI Realtime API` - Connection failed (check settings)

### Step 2: Common Connection Issues

**If connection fails:**

1. **Check API Key:**

   - Verify `OPENAI_API_KEY` is correct
   - Ensure key has Realtime API access

2. **Check Model Name:**

   - Update `OPENAI_REALTIME_MODEL` to the latest model name
   - Check OpenAI docs: https://platform.openai.com/docs/guides/realtime

3. **Check URL:**

   - Verify `OPENAI_REALTIME_API_URL` is correct
   - Try the exact URL from OpenAI's documentation

4. **Check Access:**
   - Ensure your OpenAI account has Realtime API access enabled
   - Check if it's still in preview/beta for your account

### Step 3: Test Audio Flow

1. Make a test call
2. Check logs for:
   - `🎤 User started speaking` - Audio input detected
   - `🤖 AI said: "..."` - AI transcript received
   - `✅ AI audio response complete` - Audio output sent

---

## 🚨 Important Notes

### OpenAI Realtime API Changes

The Realtime API is in preview and may change:

- **Message formats** might change
- **Model names** might change
- **WebSocket URL** might change
- **Authentication** might change

**Always check the latest documentation before production use.**

### Twilio Settings

**No Twilio changes needed!** The handler uses the same Twilio Media Streams setup as the Deepgram handler.

### Audio Format

The code automatically handles:

- Twilio: μ-law 8kHz → PCM16 16kHz → PCM16 24kHz → OpenAI
- OpenAI: PCM16 24kHz → PCM16 8kHz → μ-law → Twilio

**No manual configuration needed for audio formats.**

---

## 📚 Reference Links

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [OpenAI API Status](https://status.openai.com/)
- [OpenAI Pricing](https://openai.com/pricing)

---

## ✅ Quick Checklist

Before testing, verify:

- [ ] `OPENAI_API_KEY` is set in `.env`
- [ ] `OPENAI_REALTIME_MODEL` is set (check latest from OpenAI docs)
- [ ] `OPENAI_REALTIME_API_URL` is set (default should work)
- [ ] OpenAI account has Realtime API access
- [ ] Backend server is running
- [ ] Test call is created with "GPT-4o-Realtime" provider selected

---

## 🐛 Troubleshooting

### Error: "OpenAI API key not configured"

- **Fix:** Add `OPENAI_API_KEY` to `backend/.env`

### Error: "WebSocket connection error"

- **Fix:** Check `OPENAI_REALTIME_API_URL` is correct
- **Fix:** Verify API key has Realtime API access

### Error: "Model not found"

- **Fix:** Update `OPENAI_REALTIME_MODEL` to latest model name from OpenAI docs

### No audio coming through

- **Check:** Logs show "🎤 User started speaking"
- **Check:** Logs show "🤖 AI said: ..."
- **Fix:** Verify audio format conversions are working (code handles this automatically)

---

**That's it! All code is implemented. Just update the settings above and test.** 🚀
