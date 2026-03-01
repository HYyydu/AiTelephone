# 🤖 AI Customer Call System

An intelligent phone calling system powered by AI that can make automated calls to customers with specific purposes and goals. The system uses GPT-4o Realtime for conversation intelligence and speech recognition, OpenAI TTS for natural voice synthesis, and Twilio for telephony.

## ✨ Features

- 📞 **Automated Phone Calls** - Make AI-powered calls to any phone number
- 🎯 **Purpose-Driven Conversations** - Define specific goals for each call
- 🎤 **Real-time Speech Recognition** - Powered by GPT-4o Realtime
- 🤖 **Intelligent Responses** - GPT-4 generates contextual, natural conversations
- 🔊 **Natural Voice Synthesis** - OpenAI TTS with multiple voice options
- 📝 **Live Transcription** - Real-time transcript of AI and customer conversation
- 📊 **Call History & Analytics** - Track all calls with detailed insights
- 🎨 **Beautiful Modern UI** - Built with Next.js, Tailwind CSS, and shadcn/ui
- ⚡ **Real-time Updates** - WebSocket integration for live call monitoring

## 🏗️ Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │ ◄─────► │   Backend   │ ◄─────► │   Twilio    │
│  (Next.js)  │         │  (Node.js)  │         │  (Calls)    │
└─────────────┘         └─────────────┘         └─────────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
            ┌───────▼────┐ ┌──▼──────┐
            │  OpenAI    │ │ Socket  │
            │GPT-4o/TTS  │ │  .io    │
            └────────────┘ └─────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Twilio account with phone number ([Sign up](https://www.twilio.com/try-twilio))
- OpenAI API key ([Get key](https://platform.openai.com/api-keys))

### Installation

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd AiCostumerCall
```

2. **Set up Backend**

```bash
cd backend
npm install

# Copy environment file and add your API keys
cp .env.example .env
# Edit .env with your actual API keys
```

Required environment variables for backend (`.env`):

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI Configuration
OPENAI_API_KEY=your_openai_key

# Server Configuration
PORT=3001
PUBLIC_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000
```

3. **Set up Frontend**

```bash
cd ../frontend
npm install

# Copy environment file
cp .env.local.example .env.local
```

Frontend environment variables (`.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### Running the Application

1. **Start the Backend**

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3001`

2. **Start the Frontend** (in a new terminal)

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

3. **Open your browser**

Navigate to `http://localhost:3000` and start making AI calls! 🎉

## 📖 Usage Guide

### Making Your First Call

1. **Fill out the call form:**

   - Enter phone number in international format (e.g., +15551234567)
   - Describe the purpose (what the AI should accomplish)
   - Select voice preference
   - Add optional additional instructions

2. **Start the call:**

   - Click "Start Call"
   - The system will initiate the call via Twilio
   - You can monitor the call in real-time

3. **View live transcript:**
   - Click "View Live" on any in-progress call
   - See the conversation unfold in real-time
   - Download transcripts after the call completes

### Example Use Cases

**Customer Service - Product Return**

```
Phone: +15551234567
Purpose: Customer wants to return strawberries purchased yesterday
         due to quality issues. Process return and schedule pickup.
Instructions: Be empathetic, offer full refund, apologize for inconvenience
```

**Appointment Scheduling**

```
Phone: +15559876543
Purpose: Schedule a dental appointment for the customer. Find available
         slots next week and confirm their preferred date/time.
Instructions: Be friendly and accommodating
```

**Customer Feedback Survey**

```
Phone: +15551112222
Purpose: Conduct a brief satisfaction survey about their recent purchase.
         Ask 3-4 questions about product quality and service.
Instructions: Keep it short (under 3 minutes), thank them for their time
```

## 🛠️ Technology Stack

### Frontend

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Forms:** React Hook Form + Zod
- **Real-time:** Socket.io Client
- **Date Formatting:** date-fns

### Backend

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Telephony:** Twilio SDK
- **AI/LLM:** OpenAI GPT-4o Realtime
- **Speech-to-Text:** GPT-4o Realtime (built-in)
- **Text-to-Speech:** OpenAI TTS
- **Real-time:** Socket.io
- **Storage:** In-memory (PostgreSQL ready)

## 📁 Project Structure

```
AiCostumerCall/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # Main dashboard
│   │   └── call/[id]/page.tsx      # Call detail page
│   ├── components/
│   │   ├── CallForm.tsx            # Call creation form
│   │   ├── CallList.tsx            # Recent calls list
│   │   ├── CallStatusBadge.tsx     # Status indicator
│   │   └── TranscriptView.tsx      # Transcript display
│   └── lib/
│       ├── api.ts                   # API client
│       ├── websocket.ts            # WebSocket client
│       └── types.ts                # TypeScript types
│
└── backend/
    ├── src/
    │   ├── api/routes/
    │   │   ├── calls.ts            # Call endpoints
    │   │   └── webhooks.ts         # Twilio webhooks
    │   ├── services/
    │   │   ├── telephony.ts        # Twilio integration
    │   │   ├── realtime-api.ts      # GPT-4o Realtime
    │   │   ├── ai-brain.ts         # GPT-4 logic
    │   │   ├── tts.ts              # Text-to-speech
    │   │   └── conversation-manager.ts  # Orchestration
    │   ├── database/models/
    │   │   └── store.ts            # Data storage
    │   ├── config/
    │   │   └── index.ts            # Configuration
    │   └── server.ts               # Express server
    └── .env.example                # Environment template
```

## 🚀 Deploying to Production

### Deploy to Vercel (Recommended)

This project is optimized for deployment on Vercel. We've created comprehensive guides to help you:

📚 **Choose your guide:**

- **⚡ Quick Start (15 min)**: [QUICK_DEPLOY_VERCEL.md](./QUICK_DEPLOY_VERCEL.md)

  - Fast track deployment guide
  - Essential steps only
  - Perfect for getting started quickly

- **📖 Complete Guide (40 min)**: [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

  - Detailed step-by-step walkthrough
  - Architecture explanations
  - Best practices and optimization tips
  - Cost estimates and scaling advice

- **🔐 Environment Setup**: [VERCEL_ENV_TEMPLATE.md](./VERCEL_ENV_TEMPLATE.md)

  - Copy-paste templates for all environment variables
  - Where to find credentials
  - Security best practices

- **🐛 Troubleshooting**: [VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md)

  - Common issues and solutions
  - Debugging tools
  - Pro tips

- **📋 Index**: [DEPLOYMENT_INDEX.md](./DEPLOYMENT_INDEX.md)
  - Overview of all deployment guides
  - Quick reference checklists
  - Learning paths

**Quick Deploy Command:**

```bash
# 1. Push to Git
git add .
git commit -m "Ready for deployment"
git push

# 2. Go to vercel.com/new
# 3. Import your repository twice:
#    - Once with root: backend
#    - Once with root: frontend
# 4. Add environment variables (see guides above)
# 5. Deploy! 🎉
```

### Alternative Deployment Options

- **Railway.app**: Better for long-running WebSocket connections
- **Render.com**: Free tier available, good for full-stack apps
- **Traditional VPS**: DigitalOcean, AWS EC2, etc.
- **Kubernetes**: For enterprise-scale deployments

See deployment guides for more details.

---

## 🔧 Configuration

### Voice Options

The system supports 4 voice types:

- `professional_female` - Nova (default)
- `professional_male` - Onyx
- `friendly_female` - Shimmer
- `friendly_male` - Echo

### Call Settings

Default settings in `backend/src/config/index.ts`:

- Max call duration: 15 minutes
- Recording: Enabled
- Model: GPT-4
- TTS: OpenAI TTS-1

## 📊 API Endpoints

### Calls

- `POST /api/calls` - Create and initiate a new call
- `GET /api/calls` - Get all calls
- `GET /api/calls/:id` - Get specific call
- `GET /api/calls/:id/transcripts` - Get call transcripts
- `GET /api/calls/stats/summary` - Get call statistics
- `DELETE /api/calls/:id` - Delete a call

### Webhooks

- `POST /api/webhooks/twilio/status` - Twilio status updates
- `POST /api/webhooks/twilio/voice` - Twilio voice instructions

### WebSocket Events

- `transcript` - New transcript message
- `call_status` - Call status update
- `call_ended` - Call completed

## 🚧 Development Status

### ✅ Completed Features

- ✅ Frontend with Next.js and beautiful UI
- ✅ Backend API with Express
- ✅ Twilio integration for calls
- ✅ OpenAI GPT-4o Realtime for conversations and speech recognition
- ✅ OpenAI TTS for voice synthesis
- ✅ Real-time WebSocket updates
- ✅ Live transcript viewing
- ✅ Call history and management
- ✅ Environment configuration

### 🚧 In Progress / TODO

- ⏳ PostgreSQL database integration (currently in-memory)
- ⏳ Twilio Media Streams for bidirectional audio
- ⏳ User authentication
- ⏳ Rate limiting and security
- ⏳ Comprehensive error handling
- ⏳ Unit and E2E tests
- ⏳ Production deployment guides

## 💰 Cost Estimates

**Per Call (5-minute average):**

- Twilio: ~$0.10 - $0.15
- OpenAI GPT-4o Realtime: ~$0.05 - $0.10
- OpenAI TTS: ~$0.03 - $0.05
- **Total: ~$0.18 - $0.30 per call**

**Monthly (1000 calls):**

- ~$200 - $350 + infrastructure costs

## 🔒 Security Notes

⚠️ **Important:** This is a development version. Before production:

- Add authentication/authorization
- Implement rate limiting
- Add input validation and sanitization
- Set up proper CORS policies
- Use HTTPS for all connections
- Secure API keys and environment variables
- Comply with TCPA and GDPR regulations
- Get proper consent before calling

## 📝 License

MIT License - feel free to use for personal or commercial projects

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using OpenAI GPT-4o Realtime, Twilio, and Next.js
