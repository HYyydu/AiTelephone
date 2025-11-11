// Twilio Media Stream WebSocket Handler
import { Server as SocketIOServer } from 'socket.io';
import { WebSocket } from 'ws';
import { Call } from '../types';
import { store } from '../database/models/store';
import { getOrCreateConversation } from '../services/conversation-manager';

export class MediaStreamHandler {
  private ws: WebSocket;
  private call: Call;
  private streamSid: string | null = null;
  private callSid: string;

  constructor(ws: WebSocket, callSid: string) {
    this.ws = ws;
    this.callSid = callSid;
    
    // Find the call by Twilio SID
    const allCalls = store.getAllCalls();
    const foundCall = allCalls.find(c => c.call_sid === callSid);
    
    if (!foundCall) {
      console.error(`❌ Call not found for SID: ${callSid}`);
      ws.close();
      return;
    }
    
    this.call = foundCall;
    this.setupWebSocket();
  }

  private setupWebSocket() {
    console.log(`🎙️  Media stream connected for call: ${this.call.id}`);

    this.ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        await this.handleMessage(data);
      } catch (error) {
        console.error('❌ Error handling media stream message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log(`🔴 Media stream closed for call: ${this.call.id}`);
    });

    this.ws.on('error', (error) => {
      console.error('❌ Media stream error:', error);
    });
  }

  private async handleMessage(data: any) {
    switch (data.event) {
      case 'connected':
        console.log('✅ Media stream connected');
        break;

      case 'start':
        this.streamSid = data.streamSid;
        console.log(`🎬 Media stream started: ${this.streamSid}`);
        
        // Start the conversation manager
        const conversation = getOrCreateConversation(this.call);
        await conversation.start();
        
        // Send initial greeting
        await this.sendInitialGreeting();
        break;

      case 'media':
        // Audio data from caller (base64 encoded mulaw)
        await this.handleAudioData(data.media.payload);
        break;

      case 'stop':
        console.log('🛑 Media stream stopped');
        break;

      default:
        console.log(`📨 Unknown event: ${data.event}`);
    }
  }

  private async handleAudioData(payload: string) {
    // This would process incoming audio
    // For now, we'll implement a simpler version that doesn't process real-time audio
    // Full implementation would decode mulaw audio and send to Deepgram
    
    // TODO: Decode mulaw audio from base64
    // TODO: Send to Deepgram for transcription
    // TODO: When speech detected, send to conversation manager
  }

  private async sendInitialGreeting() {
    try {
      const conversation = getOrCreateConversation(this.call);
      const greeting = await conversation.getInitialGreeting();
      
      // Send the greeting through TTS
      await this.sendAudioToCall(greeting);
    } catch (error) {
      console.error('❌ Error sending initial greeting:', error);
    }
  }

  private async sendAudioToCall(text: string) {
    // TODO: Convert text to speech using OpenAI TTS
    // TODO: Encode to mulaw format
    // TODO: Send to Twilio via WebSocket
    
    console.log(`🔊 Would send audio: "${text}"`);
    
    // For now, we'll just log it
    // Full implementation would use the TTS service and send audio chunks
  }

  private getInitialGreeting(): string {
    return `Hello! This is an AI assistant calling about: ${this.call.purpose}. How can I help you today?`;
  }
}

export function setupMediaStreamWebSocket(wss: any) {
  wss.on('connection', (ws: WebSocket, req: any) => {
    const url = new URL(req.url, 'http://localhost');
    const callSid = url.searchParams.get('callSid');
    
    if (!callSid) {
      console.error('❌ No callSid provided in WebSocket connection');
      ws.close();
      return;
    }
    
    new MediaStreamHandler(ws, callSid);
  });
  
  console.log('✅ Media Stream WebSocket handler initialized');
}

