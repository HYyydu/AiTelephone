// Conversation Manager - Orchestrates STT → LLM → TTS pipeline
import { v4 as uuidv4 } from 'uuid';
import { Call, Transcript } from '../types';
import { store } from '../database/models/store';
import { TranscriptionService } from './transcription';
import { AIBrain } from './ai-brain';
import { TTSService } from './tts';
import { io } from '../server';

export class ConversationManager {
  private call: Call;
  private transcriptionService: TranscriptionService;
  private aiBrain: AIBrain;
  private ttsService: TTSService;
  private isActive: boolean = false;
  private pendingUserInput: string = '';

  constructor(call: Call) {
    this.call = call;
    this.transcriptionService = new TranscriptionService();
    this.aiBrain = new AIBrain(call);
    this.ttsService = new TTSService(call.voice_preference);
  }

  async start() {
    try {
      this.isActive = true;
      console.log(`🎙️  Starting conversation manager for call: ${this.call.id}`);

      // Start transcription service
      await this.transcriptionService.startTranscription(async (result) => {
        if (result.isFinal && result.text.trim()) {
          await this.handleUserMessage(result.text, result.confidence);
        }
      });

      console.log(`✅ Conversation manager started for call: ${this.call.id}`);
    } catch (error) {
      console.error('❌ Error starting conversation manager:', error);
      throw error;
    }
  }

  async getInitialGreeting(): Promise<string> {
    try {
      const greeting = await this.aiBrain.getInitialGreeting();
      
      // Save AI transcript
      const aiTranscript: Transcript = {
        id: uuidv4(),
        call_id: this.call.id,
        speaker: 'ai',
        message: greeting,
        timestamp: new Date(),
      };
      store.addTranscript(aiTranscript);

      // Emit to frontend
      io.to(`call:${this.call.id}`).emit('transcript', aiTranscript);
      
      return greeting;
    } catch (error) {
      console.error('❌ Error generating greeting:', error);
      return "Hello! I'm calling to discuss something with you. Is this a good time to talk?";
    }
  }

  private async handleUserMessage(text: string, confidence: number) {
    try {
      if (!this.isActive) return;

      console.log(`👤 User said: "${text}" (confidence: ${confidence})`);

      // Save user transcript
      const userTranscript: Transcript = {
        id: uuidv4(),
        call_id: this.call.id,
        speaker: 'human',
        message: text,
        timestamp: new Date(),
        confidence,
      };
      store.addTranscript(userTranscript);

      // Emit to frontend
      io.to(`call:${this.call.id}`).emit('transcript', userTranscript);

      // Get AI response
      const aiResponse = await this.aiBrain.getResponse(text);
      await this.sendAIMessage(aiResponse);
    } catch (error) {
      console.error('❌ Error handling user message:', error);
    }
  }

  private async sendAIMessage(text: string) {
    try {
      console.log(`🤖 AI response: "${text}"`);

      // Save AI transcript
      const aiTranscript: Transcript = {
        id: uuidv4(),
        call_id: this.call.id,
        speaker: 'ai',
        message: text,
        timestamp: new Date(),
      };
      store.addTranscript(aiTranscript);

      // Emit to frontend
      io.to(`call:${this.call.id}`).emit('transcript', aiTranscript);

      // Convert to speech (in a real implementation, this would be sent to Twilio)
      // For now, we just log it
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔊 Would convert to speech and send to caller...');
      }
    } catch (error) {
      console.error('❌ Error sending AI message:', error);
    }
  }

  sendAudio(audioData: Buffer) {
    if (this.isActive) {
      this.transcriptionService.sendAudio(audioData);
    }
  }

  async stop() {
    try {
      this.isActive = false;
      this.transcriptionService.stop();

      // Generate call summary
      const summary = await this.aiBrain.generateCallSummary();
      store.updateCall(this.call.id, {
        outcome: summary,
        status: 'completed',
        ended_at: new Date(),
      });

      console.log(`✅ Conversation manager stopped for call: ${this.call.id}`);
      console.log(`📝 Summary: ${summary}`);
    } catch (error) {
      console.error('❌ Error stopping conversation manager:', error);
    }
  }

  isRunning(): boolean {
    return this.isActive;
  }
}

// Global map to track active conversations
const activeConversations = new Map<string, ConversationManager>();

export function getOrCreateConversation(call: Call): ConversationManager {
  let manager = activeConversations.get(call.id);
  if (!manager) {
    manager = new ConversationManager(call);
    activeConversations.set(call.id, manager);
  }
  return manager;
}

export function getConversation(callId: string): ConversationManager | undefined {
  return activeConversations.get(callId);
}

export function removeConversation(callId: string): void {
  const conversation = activeConversations.get(callId);
  if (conversation) {
    conversation.stop();
    activeConversations.delete(callId);
  }
}
