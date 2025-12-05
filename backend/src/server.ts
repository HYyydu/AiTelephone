// Main server file
import express, { Express, Request, Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { WebSocketServer } from "ws";
import { config, validateConfig } from "./config";
import callsRouter from "./api/routes/calls";
import webhooksRouter from "./api/routes/webhooks";
import authRouter from "./api/routes/auth";
import { GPT4oRealtimeHandler } from "./websocket/gpt4o-realtime-handler";
import { CallService } from "./database/services/call-service";

// Validate configuration on startup
validateConfig();

// Test database connection on startup
import { testConnection } from './database/db';
testConnection().then((connected) => {
  if (connected) {
    console.log('✅ Database connection verified');
  } else {
    console.error('❌ Database connection failed - some features may not work');
    console.error('❌ Make sure DATABASE_URL is set in your .env file');
  }
}).catch((error) => {
  console.error('❌ Error testing database connection:', error);
});

const app: Express = express();
const httpServer = createServer(app);

// Trust proxy - Required for Railway, Vercel, and other hosting platforms
// This allows express-rate-limit and other middleware to correctly identify client IPs
app.set('trust proxy', 1);

// Socket.io setup for frontend real-time updates
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin
      if (!origin) return callback(null, true);
      
      // Allow all Vercel deployments for ai-telephone-front
      const allowedOrigins = [
        'https://ai-telephone-front.vercel.app',
        /^https:\/\/ai-telephone-front-.*\.vercel\.app$/,
        /^https:\/\/ai-telephone-front-git-.*\.vercel\.app$/,
        config.cors.origin,
        'http://localhost:3000',
      ];
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        } else if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`⚠️  Socket.io CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// WebSocket server for Twilio Media Streams
const mediaStreamWss = new WebSocketServer({
  noServer: true,
  path: "/media-stream",
});

// Setup media stream handler (GPT-4o Realtime only)
mediaStreamWss.on("connection", async (ws: any, req: any) => {
  console.log(`🔌 WebSocket connection received from Twilio`);
  console.log(`   Request URL: ${req.url || '(not available)'}`);
  
  // Store callSid if available from upgrade handler
  const callSidFromQuery = (req as any).callSidFromQuery || (ws as any).callSidFromQuery;
  if (callSidFromQuery) {
    (ws as any).callSidFromQuery = callSidFromQuery;
    console.log(`📞 CallSid available from upgrade handler: ${callSidFromQuery}`);
  }

  // All calls now use GPT-4o Realtime - no routing needed
  console.log(`🚀 Creating GPT-4o-Realtime handler for connection`);
  new GPT4oRealtimeHandler(ws);
});

console.log("✅ Media Stream WebSocket handler initialized (GPT-4o Realtime only)");

// Handle WebSocket upgrade for media streams
// Note: Socket.io attaches its own upgrade handler, so we need to handle /media-stream first
// Socket.io will handle /socket.io/ paths automatically
httpServer.on("upgrade", (request, socket, head) => {
  const fullUrl = request.url || "";
  const pathname = fullUrl.split('?')[0] || "";
  const queryString = fullUrl.split('?')[1] || "";
  
  console.log(`🔄 WebSocket upgrade request: ${fullUrl}`);
  console.log(`   Pathname: ${pathname}`);
  console.log(`   Query string: ${queryString || '(none)'}`);
  console.log(`   Origin: ${request.headers.origin || 'none'}`);
  console.log(`   Host: ${request.headers.host || 'none'}`);
  
  // Handle media stream WebSocket
  if (pathname === "/media-stream") {
    console.log("✅ Routing to media stream WebSocket");
    
    // Extract callSid from query params and store on request object
    let callSid: string | null = null;
    if (queryString) {
      const params = new URLSearchParams(queryString);
      callSid = params.get("callSid");
      if (callSid) {
        console.log(`📞 Extracted callSid from query params: ${callSid}`);
        (request as any).callSidFromQuery = callSid;
      } else {
        console.log(`⚠️  Query string exists but no callSid found: ${queryString}`);
      }
    } else {
      console.log(`⚠️  No query string in request URL: ${fullUrl}`);
    }
    
    // Validate that this is from Twilio (optional but good practice)
    const userAgent = request.headers['user-agent'] || '';
    if (!userAgent.includes('Twilio')) {
      console.warn(`⚠️  Warning: WebSocket upgrade from non-Twilio user agent: ${userAgent}`);
    }
    
    try {
      mediaStreamWss.handleUpgrade(request, socket, head, (ws) => {
        console.log("✅ Media stream WebSocket upgrade successful");
        console.log(`   WebSocket readyState: ${ws.readyState}`);
        // Store callSid on WebSocket for easy access
        if (callSid) {
          (ws as any).callSidFromQuery = callSid;
        }
        mediaStreamWss.emit("connection", ws, request);
      });
    } catch (error) {
      console.error("❌ Error handling media stream upgrade:", error);
      console.error("❌ Error details:", error instanceof Error ? error.message : String(error));
      console.error("❌ Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
      socket.destroy();
    }
    return; // We handled it, stop propagation
  }
  
  // For all other paths (including /socket.io/), let Socket.io or other handlers process
  // Don't call socket.destroy() - let the event continue to other handlers
});

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Allow all Vercel deployments for ai-telephone-front
      const allowedOrigins = [
        'https://ai-telephone-front.vercel.app',
        /^https:\/\/ai-telephone-front-.*\.vercel\.app$/,  // Preview deployments
        /^https:\/\/ai-telephone-front-git-.*\.vercel\.app$/,  // Git branch deployments
        config.cors.origin,  // Also allow configured origin
        'http://localhost:3000',  // Local development
      ];
      
      // Check if origin matches any allowed pattern
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        } else if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Handle ngrok browser verification for free tier
app.use((req, res, next) => {
  // Bypass ngrok browser verification for webhooks
  if (req.path.startsWith('/api/webhooks')) {
    // Set headers to bypass ngrok verification
    res.setHeader('ngrok-skip-browser-warning', 'true');
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import rate limiters
import { apiLimiter } from "./utils/rate-limiter";
app.use("/api/", apiLimiter);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "AI Customer Call Backend",
  });
});

// API routes
app.use("/api/calls", callsRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/auth", authRouter);

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "AI Customer Call API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      calls: "/api/calls",
      webhooks: "/api/webhooks",
    },
  });
});

// WebSocket connection handler
io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });

  socket.on("join_call", (callId: string) => {
    socket.join(`call:${callId}`);
    console.log(`📞 Client ${socket.id} joined call room: ${callId}`);
  });

  socket.on("leave_call", (callId: string) => {
    socket.leave(`call:${callId}`);
    console.log(`📴 Client ${socket.id} left call room: ${callId}`);
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error("❌ Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
httpServer.listen(config.port, () => {
  console.log("🚀 ============================================");
  console.log(`🚀 AI Customer Call Backend is running!`);
  console.log(`🚀 Server: http://localhost:${config.port}`);
  console.log(`🚀 WebSocket (Frontend): ws://localhost:${config.port}`);
  console.log(`🚀 Media Stream: ws://localhost:${config.port}/media-stream`);
  console.log("🚀 ============================================");
});

export default app;
