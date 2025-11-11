# 🚀 Quick Setup Guide

Follow these steps to get your AI Customer Call System up and running in minutes!

## Step 1: Get Your API Keys

### 1.1 Twilio (Required)
1. Sign up at [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Get a phone number from the console
3. Copy your Account SID and Auth Token from the dashboard
4. Note: Free trial includes $15 credit!

### 1.2 OpenAI (Required)
1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Go to API Keys section
3. Create a new API key
4. Copy and save it securely
5. Note: You'll need to add credit to your account

### 1.3 Deepgram (Required)
1. Sign up at [console.deepgram.com](https://console.deepgram.com)
2. Create a new API key
3. Copy and save it
4. Note: Free tier includes $200 credit!

## Step 2: Install Dependencies

```bash
# Clone the repository
cd AiCostumerCall

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Step 3: Configure Environment Variables

### Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your API keys:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=AC...your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567  # Your Twilio number

# OpenAI Configuration
OPENAI_API_KEY=sk-...your_openai_key

# Deepgram Configuration
DEEPGRAM_API_KEY=your_deepgram_key

# Server Configuration (default values work fine)
PORT=3001
PUBLIC_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000
```

### Frontend Configuration

```bash
cd frontend
cp .env.local.example .env.local
```

The default values work for local development:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

## Step 4: Run the Application

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

You should see:
```
🚀 ============================================
🚀 AI Customer Call Backend is running!
🚀 Server: http://localhost:3001
🚀 WebSocket: ws://localhost:3001
🚀 ============================================
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

You should see:
```
✓ Ready on http://localhost:3000
```

## Step 5: Make Your First Call

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Fill out the form:
   - **Phone Number:** Your own phone number (for testing!)
   - **Purpose:** "This is a test call. Say hello and ask how the recipient is doing."
   - **Voice:** Professional Female
   - **Instructions:** "Be friendly and brief"
3. Click "Start Call"
4. Answer your phone! 📞

## 🎯 Testing Tips

### Test with Your Own Number First
- Always test with your own phone number first
- This ensures everything is working correctly
- You can have a real conversation with the AI

### Example Test Purposes

**Simple Greeting Test:**
```
Purpose: Say hello and introduce yourself as an AI assistant testing the system
```

**Information Gathering:**
```
Purpose: Ask if this is a good time to talk, then ask about their experience with AI technology
```

**Appointment Scheduling:**
```
Purpose: Offer to schedule a demo appointment. Ask for their preferred date and time next week.
```

## 🔧 Troubleshooting

### Backend Won't Start
- ✅ Check that all environment variables are set in `.env`
- ✅ Verify your API keys are correct
- ✅ Make sure port 3001 isn't already in use

### Call Not Connecting
- ✅ Verify your Twilio phone number is correct
- ✅ Check that your Twilio account has credits
- ✅ Ensure the phone number format is correct (+1234567890)

### No Transcript Appearing
- ✅ Check that Deepgram API key is valid
- ✅ Verify WebSocket connection in browser console
- ✅ Check backend logs for errors

### API Key Errors
- ✅ Make sure there are no extra spaces in your `.env` file
- ✅ Restart the backend after changing environment variables
- ✅ Verify your OpenAI account has credits

## 📊 Monitoring Your Usage

### Twilio Console
- View call logs: [console.twilio.com/monitor/logs/calls](https://console.twilio.com/monitor/logs/calls)
- Check your balance and usage

### OpenAI Dashboard
- Monitor API usage: [platform.openai.com/usage](https://platform.openai.com/usage)
- View costs by model

### Deepgram Console
- Check usage: [console.deepgram.com/billing/usage](https://console.deepgram.com/billing/usage)

## 🎉 Next Steps

Once everything is working:

1. **Try Different Use Cases:** Customer service, surveys, appointment scheduling
2. **Experiment with Voices:** Try all 4 voice options
3. **Test Purpose Variations:** See how the AI adapts to different goals
4. **Monitor Call Quality:** Check transcription accuracy
5. **Customize AI Behavior:** Adjust the system prompt in `backend/src/services/ai-brain.ts`

## 🚨 Important Notes

### Development vs Production
- This setup is for **development/testing only**
- For production, you'll need:
  - HTTPS/SSL certificates
  - Public URL for Twilio webhooks (use ngrok for testing)
  - Proper database (PostgreSQL)
  - Authentication system
  - Rate limiting

### Webhooks for Development
To test Twilio webhooks locally, use ngrok:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from ngrok.com

# Expose your local backend
ngrok http 3001

# Update PUBLIC_URL in backend/.env with the ngrok URL
PUBLIC_URL=https://your-id.ngrok.io
```

### Costs
- Testing with your own number: ~$0.20-$0.35 per call
- Be mindful of API costs during development
- Set up usage alerts in each platform

## 💡 Pro Tips

1. **Save Example Calls:** Keep a list of working purposes and instructions
2. **Check Logs:** Backend logs show detailed info about the AI's decisions
3. **Adjust Temperature:** Lower temperature (0.5) for more consistent responses
4. **Test Edge Cases:** Try interrupting the AI, asking unexpected questions
5. **Monitor Latency:** Real-time conversation needs fast responses

## 🆘 Need Help?

- Check the main [README.md](./README.md) for architecture details
- Review backend logs for error messages
- Test API endpoints directly with curl or Postman
- Open an issue on GitHub if you're stuck

Happy calling! 🎉📞🤖

