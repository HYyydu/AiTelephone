// Main server file
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer } from 'ws';
import { config, validateConfig } from './config';
import callsRouter from './api/routes/calls';
import webhooksRouter from './api/routes/webhooks';
import { setupMediaStreamWebSocket } from './websocket/media-stream-handler';

// Validate configuration on startup
validateConfig();

const app: Express = express();
const httpServer = createServer(app);

// Socket.io setup for frontend real-time updates
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
  },
});

// WebSocket server for Twilio Media Streams
const mediaStreamWss = new WebSocketServer({ 
  noServer: true,
  path: '/media-stream'
});

// Setup media stream handler
setupMediaStreamWebSocket(mediaStreamWss);

// Handle WebSocket upgrade for media streams
httpServer.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', 'http://localhost').pathname;
  
  if (pathname === '/media-stream') {
    mediaStreamWss.handleUpgrade(request, socket, head, (ws) => {
      mediaStreamWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import rate limiters
import { apiLimiter } from './utils/rate-limiter';
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'AI Customer Call Backend'
  });
});

// API routes
app.use('/api/calls', callsRouter);
app.use('/api/webhooks', webhooksRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AI Customer Call API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      calls: '/api/calls',
      webhooks: '/api/webhooks',
    },
  });
});

// WebSocket connection handler
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });

  socket.on('join_call', (callId: string) => {
    socket.join(`call:${callId}`);
    console.log(`📞 Client ${socket.id} joined call room: ${callId}`);
  });

  socket.on('leave_call', (callId: string) => {
    socket.leave(`call:${callId}`);
    console.log(`📴 Client ${socket.id} left call room: ${callId}`);
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
httpServer.listen(config.port, () => {
  console.log('🚀 ============================================');
  console.log(`🚀 AI Customer Call Backend is running!`);
  console.log(`🚀 Server: http://localhost:${config.port}`);
  console.log(`🚀 WebSocket (Frontend): ws://localhost:${config.port}`);
  console.log(`🚀 Media Stream: ws://localhost:${config.port}/media-stream`);
  console.log('🚀 ============================================');
});

export default app;

