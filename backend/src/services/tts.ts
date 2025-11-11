// Text-to-Speech service using OpenAI TTS
import OpenAI from 'openai';
import { config } from '../config';
import { VoiceType } from '../types';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Map our voice types to OpenAI voices
const voiceMap: Record<VoiceType, string> = {
  professional_female: 'nova',
  professional_male: 'onyx',
  friendly_female: 'shimmer',
  friendly_male: 'echo',
};

export class TTSService {
  private voice: string;

  constructor(voiceType: VoiceType = 'professional_female') {
    this.voice = voiceMap[voiceType] || 'nova';
  }

  async textToSpeech(text: string): Promise<Buffer> {
    try {
      if (!config.openai.apiKey) {
        console.warn('⚠️  OpenAI API key not configured');
        throw new Error('OpenAI API key not configured');
      }

      const mp3 = await openai.audio.speech.create({
        model: config.openai.ttsModel,
        voice: this.voice as any,
        input: text,
        response_format: 'mp3',
        speed: 1.0,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error('❌ Error generating speech:', error);
      throw error;
    }
  }

  setVoice(voiceType: VoiceType) {
    this.voice = voiceMap[voiceType] || 'nova';
  }
}

