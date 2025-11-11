// Speech-to-Text service using Deepgram
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { config } from '../config';

const deepgramClient = createClient(config.deepgram.apiKey);

export interface TranscriptionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

export class TranscriptionService {
  private connection: any;

  async startTranscription(onTranscript: (result: TranscriptionResult) => void) {
    try {
      if (!config.deepgram.apiKey) {
        console.warn('⚠️  Deepgram API key not configured, using mock transcription');
        return;
      }

      this.connection = deepgramClient.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        punctuate: true,
        interim_results: true,
      });

      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('✅ Deepgram connection opened');
      });

      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel.alternatives[0];
        if (transcript && transcript.transcript) {
          onTranscript({
            text: transcript.transcript,
            confidence: transcript.confidence,
            isFinal: data.is_final,
          });
        }
      });

      this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('❌ Deepgram error:', error);
      });

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('🔴 Deepgram connection closed');
      });
    } catch (error) {
      console.error('❌ Failed to start transcription:', error);
      throw error;
    }
  }

  sendAudio(audioData: Buffer) {
    if (this.connection) {
      this.connection.send(audioData);
    }
  }

  stop() {
    if (this.connection) {
      this.connection.finish();
      this.connection = null;
    }
  }
}

