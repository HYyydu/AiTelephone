// WebSocket client for real-time updates
import { io, Socket } from 'socket.io-client';
import { Transcript, CallStatus } from './types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

class WebSocketClient {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinCall(callId: string) {
    if (this.socket) {
      this.socket.emit('join_call', callId);
    }
  }

  leaveCall(callId: string) {
    if (this.socket) {
      this.socket.emit('leave_call', callId);
    }
  }

  onTranscript(callback: (transcript: Transcript) => void) {
    if (this.socket) {
      this.socket.on('transcript', callback);
    }
  }

  onCallStatus(callback: (data: { call_id: string; status: CallStatus; duration?: number }) => void) {
    if (this.socket) {
      this.socket.on('call_status', callback);
    }
  }

  onCallEnded(callback: (data: { call_id: string; outcome?: string; duration: number }) => void) {
    if (this.socket) {
      this.socket.on('call_ended', callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const wsClient = new WebSocketClient();

