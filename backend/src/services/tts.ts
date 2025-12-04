// Text-to-Speech service using OpenAI TTS
import OpenAI from 'openai';
import { config } from '../config';
import { VoiceType } from '../types';
import { encodeTwilioAudio } from '../utils/audio';

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

  /**
   * Generate speech from text and return as MP3
   */
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

  /**
   * Generate speech and return as PCM for Twilio (raw linear16)
   * Note: OpenAI returns audio at 24kHz sample rate with PCM format
   */
  async textToSpeechPCM(text: string): Promise<Buffer> {
    try {
      console.log('🎵 Checking OpenAI API key...');
      if (!config.openai.apiKey) {
        console.warn('⚠️  OpenAI API key not configured');
        throw new Error('OpenAI API key not configured');
      }
      console.log('✅ OpenAI API key is configured');

      console.log(`🎵 Calling OpenAI TTS API (voice: ${this.voice})...`);
      const response = await openai.audio.speech.create({
        model: 'tts-1-hd', // Use HD model for better quality
        voice: this.voice as any,
        input: text,
        response_format: 'pcm', // Raw PCM audio, 24kHz, 16-bit signed little-endian
        speed: 0.95, // Slightly slower for clearer pronunciation
      });

      console.log('✅ OpenAI TTS API responded, converting to buffer...');
      const buffer = Buffer.from(await response.arrayBuffer());
      console.log(`✅ Buffer created: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating speech PCM:', error);
      if (error instanceof Error) {
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
      }
      throw error;
    }
  }

  /**
   * Generate speech and encode for Twilio Media Streams (base64 mulaw)
   */
  async textToSpeechForTwilio(text: string): Promise<string> {
    try {
      console.log(`🎤 TTS: Starting conversion for ${text.length} characters`);
      
      // Get PCM audio from OpenAI (24kHz)
      console.log('🎤 TTS: Calling textToSpeechPCM...');
      const pcmBuffer = await this.textToSpeechPCM(text);
      console.log(`🎤 TTS: Got PCM buffer of ${pcmBuffer.length} bytes`);
      
      // Encode to base64 mulaw for Twilio
      console.log('🎤 TTS: Encoding to Twilio format...');
      const base64Audio = encodeTwilioAudio(pcmBuffer, 24000);
      console.log(`🎤 TTS: Encoded to ${base64Audio.length} characters of base64`);
      
      return base64Audio;
    } catch (error) {
      console.error('❌ Error generating speech for Twilio:', error);
      console.error('Error details:', error);
      throw error;
    }
  }

  setVoice(voiceType: VoiceType) {
    this.voice = voiceMap[voiceType] || 'nova';
  }
}

