# 🤖 AI Agent - Quick Start Guide

## 🎉 What's Been Implemented

The complete audio pipeline for real-time AI conversations is now **FULLY FUNCTIONAL**!

### ✅ Complete Features:

1. **Audio Decoding** - Twilio's mulaw audio → PCM for processing
2. **Speech-to-Text** - Real-time transcription with Deepgram
3. **AI Conversation** - Context-aware responses with OpenAI GPT-4
4. **Text-to-Speech** - Natural voice with OpenAI TTS
5. **Audio Encoding** - PCM → mulaw for Twilio
6. **Bidirectional Streaming** - Full duplex audio conversation

## 🚀 How to Test It Now

### Step 1: Make Sure You Have All API Keys

Check your `backend/.env` file has:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
```

### Step 2: Start Your Servers

```bash
# Terminal 1 - Backend
cd /Users/yuyan/AiCostumerCall/backend
npm run dev

# Terminal 2 - Frontend
cd /Users/yuyan/AiCostumerCall/frontend
npm run dev

# Terminal 3 - ngrok (for Twilio webhooks)
ngrok http 3001
```

### Step 3: Update Twilio Webhook

1. Copy your ngrok URL (e.g., `https://abc123.ngrok-free.app`)
2. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/active
3. Click your phone number
4. Under "Voice Configuration" → "A CALL COMES IN":
   - Set to: `https://your-ngrok-url.ngrok-free.app/api/webhooks/twilio/voice`
   - Method: `HTTP POST`
5. Click **Save**

### Step 4: Create a Test Call

Go to `http://localhost:3000` and create a call:

**Example 1 - Simple Chat:**

- **Phone:** Your phone number
- **Purpose:** "Have a friendly conversation about the weather and ask what the person's favorite season is."
- **Voice:** Friendly Female
- **Additional Instructions:** "Be warm and conversational. Share your thoughts on weather too."

**Example 2 - Customer Service:**

- **Phone:** Your phone number
- **Purpose:** "Customer ordered a pizza but it arrived cold. Apologize sincerely, understand their frustration, and offer either a full refund or a free replacement pizza for their next order."
- **Voice:** Professional Female
- **Additional Instructions:** "Be very empathetic and prioritize customer satisfaction. Make sure they feel heard."

### Step 5: Answer the Call & Talk!

1. You'll receive a call from your Twilio number
2. Answer it
3. The AI will greet you and explain the purpose
4. **Start talking naturally!**
5. The AI will:
   - Listen to what you say (transcribed by Deepgram)
   - Think of a response (GPT-4)
   - Speak back to you (OpenAI TTS)
   - Continue the conversation naturally

## 🎯 What You'll Experience

### On the Phone:

- 📞 Call connects
- 🤖 AI greets you: "Hello! I'm calling to [your purpose]..."
- 👤 You talk naturally
- 🤖 AI responds intelligently
- 💬 Natural back-and-forth conversation

### In the Frontend:

- ✅ Real-time transcripts of both sides
- ✅ Call status updates
- ✅ Confidence scores for transcription
- ✅ Full conversation history

### In the Backend Terminal:

```
🎙️  Media stream connected for call: abc-123
✅ Deepgram connection opened
🔊 Converting to speech: "Hello! I'm calling to..."
📤 Sending 48000 bytes of audio in 300 chunks
✅ Audio sent successfully
👤 User (final): "Hi, yes this is a good time" (confidence: 0.95)
🤖 AI response: "Great! I wanted to discuss..."
```

## 🎭 Try Different Scenarios

### Scenario 1: Technical Support

```
Purpose: "Customer's internet is down. Troubleshoot the issue by asking about router lights, trying basic resets, and schedule a technician visit if needed."
```

### Scenario 2: Appointment Confirmation

```
Purpose: "Confirm the customer's dentist appointment tomorrow at 2 PM. If they can't make it, offer to reschedule to next week."
```

### Scenario 3: Survey/Feedback

```
Purpose: "Ask about their recent restaurant experience. Get feedback on food quality, service, and overall satisfaction. Thank them for their input."
```

### Scenario 4: Sales Call

```
Purpose: "Introduce our new premium subscription plan. Explain benefits, answer questions, and if interested, help them sign up."
Additional Instructions: "Don't be pushy. If they're not interested, gracefully end the call."
```

## 🔧 Technical Details

### Audio Flow:

**Incoming (User → AI):**

```
Phone → Twilio (8kHz mulaw) → WebSocket →
Decode to PCM → Resample to 16kHz → Deepgram →
Text → GPT-4 → AI Response
```

**Outgoing (AI → User):**

```
AI Text → OpenAI TTS (24kHz PCM) →
Resample to 8kHz → Encode to mulaw →
WebSocket → Twilio → Phone
```

### Key Files Updated:

- `backend/src/utils/audio.ts` - Audio conversion utilities
- `backend/src/services/tts.ts` - Enhanced TTS with format support
- `backend/src/services/transcription.ts` - Updated for 16kHz PCM
- `backend/src/websocket/media-stream-handler.ts` - Complete pipeline
- `backend/src/services/conversation-manager.ts` - AI response handling

## 🐛 Troubleshooting

### "No audio" or "AI doesn't respond"

- ✅ Check OPENAI_API_KEY is valid
- ✅ Check DEEPGRAM_API_KEY is valid
- ✅ Restart backend server
- ✅ Check backend terminal for errors

### "Can't hear AI speaking"

- ✅ Check ngrok is running
- ✅ Verify Twilio webhook URL is correct
- ✅ Check for TTS errors in backend logs

### "AI doesn't hear me"

- ✅ Speak clearly and wait for pauses
- ✅ Check Deepgram connection in logs
- ✅ Verify microphone/phone audio is working

### "Connection errors"

- ✅ Restart all services
- ✅ Check firewall settings
- ✅ Verify all environment variables

## 📊 Monitoring

Watch the backend terminal for detailed logs:

- `🎙️` - Media stream events
- `👤` - User speech detected
- `🤖` - AI responses
- `🔊` - Audio generation
- `📤` - Audio streaming
- `✅` - Success indicators
- `❌` - Errors

## 💡 Tips for Best Results

1. **Clear Purpose** - Be specific about what the AI should accomplish
2. **Additional Instructions** - Guide the tone and behavior
3. **Wait for Responses** - Let the AI finish speaking before responding
4. **Speak Naturally** - No need to be robotic, talk normally
5. **Test Incrementally** - Start simple, then try complex scenarios

## 🎓 What the AI Can Do

- ✅ Understand natural speech
- ✅ Remember conversation context
- ✅ Follow specific instructions
- ✅ Handle interruptions gracefully
- ✅ Maintain professional or friendly tone
- ✅ Stay focused on purpose
- ✅ Provide relevant responses
- ✅ End calls naturally when done

## 🚀 Next Level Enhancements (Future)

Want to take it further? Consider:

- 📝 Add call recording
- 📊 Sentiment analysis
- 🔄 Transfer to human agent
- 📅 Calendar integration
- 💾 Database for call history
- 🌍 Multi-language support
- 🎵 Background music/hold
- 📈 Analytics dashboard

---

**You're all set! Your AI agent is ready to have intelligent phone conversations.** 🎉

Just fill out the form, make a call, and watch the magic happen!
