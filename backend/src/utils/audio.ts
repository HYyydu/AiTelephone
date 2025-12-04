// Audio conversion utilities for Twilio Media Streams

/**
 * Convert mulaw audio to linear PCM16
 * Twilio sends audio as 8kHz mulaw, Deepgram expects 16kHz linear16
 */
export function mulawToPCM(mulawBuffer: Buffer): Buffer {
  try {
    if (mulawBuffer.length === 0) {
      return Buffer.alloc(0);
    }
    
    // Mulaw is 8-bit, so each byte is one sample
    // PCM16 is 16-bit, so we need 2 bytes per sample
    const samples = new Int16Array(mulawBuffer.length);
    
    for (let i = 0; i < mulawBuffer.length; i++) {
      samples[i] = mulawToLinear(mulawBuffer[i]);
    }
    
    // Convert to Buffer
    return Buffer.from(samples.buffer);
  } catch (error) {
    console.error('❌ Error converting mulaw to PCM:', error);
    throw error;
  }
}

/**
 * Convert linear PCM16 to mulaw
 * OpenAI TTS outputs PCM, Twilio expects 8kHz mulaw
 */
export function pcmToMulaw(pcmBuffer: Buffer): Buffer {
  try {
    // PCM is 16-bit, so we need to read Int16 values
    const samples = new Int16Array(
      pcmBuffer.buffer,
      pcmBuffer.byteOffset,
      pcmBuffer.length / 2
    );
    
    const mulawBytes = new Uint8Array(samples.length);
    
    for (let i = 0; i < samples.length; i++) {
      mulawBytes[i] = linearToMulaw(samples[i]);
    }
    
    return Buffer.from(mulawBytes);
  } catch (error) {
    console.error('❌ Error converting PCM to mulaw:', error);
    throw error;
  }
}

/**
 * Resample audio from one sample rate to another using cubic interpolation
 * Provides much better quality than linear interpolation
 */
export function resampleAudio(
  buffer: Buffer,
  fromRate: number,
  toRate: number
): Buffer {
  if (fromRate === toRate) return buffer;
  
  try {
    const samples = new Int16Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.length / 2
    );
    
    const ratio = toRate / fromRate;
    const newLength = Math.floor(samples.length * ratio);
    const resampled = new Int16Array(newLength);
    
    // Apply low-pass filter when downsampling to prevent aliasing
    const needsLowPass = ratio < 1.0;
    const filtered = needsLowPass ? lowPassFilter(samples, ratio) : samples;
    
    // Cubic interpolation for higher quality resampling
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i / ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const fraction = srcIndex - srcIndexFloor;
      
      // Get 4 surrounding samples for cubic interpolation
      const s0 = filtered[Math.max(0, srcIndexFloor - 1)] || 0;
      const s1 = filtered[srcIndexFloor] || 0;
      const s2 = filtered[Math.min(srcIndexFloor + 1, filtered.length - 1)] || 0;
      const s3 = filtered[Math.min(srcIndexFloor + 2, filtered.length - 1)] || 0;
      
      // Cubic interpolation (Catmull-Rom spline)
      const a0 = -0.5 * s0 + 1.5 * s1 - 1.5 * s2 + 0.5 * s3;
      const a1 = s0 - 2.5 * s1 + 2 * s2 - 0.5 * s3;
      const a2 = -0.5 * s0 + 0.5 * s2;
      const a3 = s1;
      
      const value = a0 * fraction * fraction * fraction +
                   a1 * fraction * fraction +
                   a2 * fraction +
                   a3;
      
      // Clamp to valid range
      resampled[i] = Math.max(-32768, Math.min(32767, Math.round(value)));
    }
    
    return Buffer.from(resampled.buffer);
  } catch (error) {
    console.error('❌ Error resampling audio:', error);
    throw error;
  }
}

/**
 * Apply low-pass filter to prevent aliasing when downsampling
 */
function lowPassFilter(samples: Int16Array, ratio: number): Int16Array {
  // Only filter when downsampling
  if (ratio >= 1.0) return samples;
  
  const filtered = new Int16Array(samples.length);
  const kernelSize = 5; // Small kernel for efficiency
  const cutoff = ratio; // Cutoff frequency based on downsample ratio
  
  for (let i = 0; i < samples.length; i++) {
    let sum = 0;
    let weightSum = 0;
    
    for (let j = -kernelSize; j <= kernelSize; j++) {
      const sampleIdx = i + j;
      if (sampleIdx >= 0 && sampleIdx < samples.length) {
        // Sinc function windowed by Hamming window
        const x = j * cutoff;
        const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
        const hamming = 0.54 + 0.46 * Math.cos((Math.PI * j) / kernelSize);
        const weight = sinc * hamming;
        
        sum += samples[sampleIdx] * weight;
        weightSum += weight;
      }
    }
    
    filtered[i] = Math.round(sum / weightSum);
  }
  
  return filtered;
}

/**
 * Convert a single mulaw byte to linear PCM16
 * Standard ITU-T G.711 μ-law algorithm
 */
function mulawToLinear(mulaw: number): number {
  // Invert all bits (μ-law uses inverted representation)
  mulaw = ~mulaw;
  
  // Extract sign bit (bit 7)
  const sign = (mulaw & 0x80) ? -1 : 1;
  
  // Extract exponent (bits 4-6)
  const exponent = (mulaw >> 4) & 0x07;
  
  // Extract mantissa (bits 0-3)
  const mantissa = mulaw & 0x0f;
  
  // Reconstruct linear value using standard μ-law formula
  // Standard formula: ((mantissa << 1) + 33) << exponent - 33
  let sample = ((mantissa << 1) + 33) << exponent;
  sample = sample - 33;
  sample = sample * sign;
  
  // Scale to 16-bit range (-32768 to 32767)
  // μ-law original range is approximately -8159 to 8159
  // Scale factor of 4 gives us good 16-bit range
  return Math.max(-32768, Math.min(32767, sample * 4));
}

/**
 * Convert a linear PCM16 sample to mulaw
 */
function linearToMulaw(sample: number): number {
  const BIAS = 132;
  const MAX = 32635;
  
  const sign = (sample < 0) ? 0x80 : 0x00;
  sample = Math.abs(sample);
  
  if (sample > MAX) sample = MAX;
  sample += BIAS;
  
  let exponent = 7;
  let expMask = 0x4000;
  
  for (; exponent > 0; exponent--) {
    if (sample & expMask) break;
    expMask >>= 1;
  }
  
  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  const mulaw = ~(sign | (exponent << 4) | mantissa);
  
  return mulaw & 0xff;
}

/**
 * Normalize audio to prevent clipping and ensure consistent volume
 */
function normalizeAudio(buffer: Buffer): Buffer {
  // Ensure buffer length is even (PCM16 = 2 bytes per sample)
  const evenLength = buffer.length - (buffer.length % 2);
  if (evenLength !== buffer.length) {
    console.warn(`⚠️  Truncating audio buffer from ${buffer.length} to ${evenLength} bytes`);
  }
  
  const samples = new Int16Array(
    buffer.buffer,
    buffer.byteOffset,
    evenLength / 2
  );
  
  if (samples.length === 0) {
    return buffer;
  }
  
  // Find peak amplitude
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    sum += abs;
    if (abs > peak) peak = abs;
  }
  
  // Calculate RMS (Root Mean Square) for better volume estimation
  const rms = Math.sqrt(sum / samples.length);
  
  // Only normalize if needed
  // Skip normalization if audio is already at good level (peak between 20k-32k)
  // or if RMS is very low (likely silence or very quiet)
  if (peak === 0 || rms < 100) {
    return buffer.slice(0, evenLength); // Return truncated buffer if needed
  }
  
  if (peak > 20000 && peak < 32767) {
    return buffer.slice(0, evenLength); // Already at good level
  }
  
  // Target 85% of max to prevent clipping while maintaining good volume
  // This leaves headroom for any processing artifacts
  const targetPeak = 27852; // ~85% of 32767
  const gain = Math.min(2.0, targetPeak / peak); // Cap gain at 2x to avoid over-amplification
  
  const normalized = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const amplified = samples[i] * gain;
    normalized[i] = Math.max(-32768, Math.min(32767, Math.round(amplified)));
  }
  
  return Buffer.from(normalized.buffer);
}

/**
 * Encode PCM audio to base64 mulaw for Twilio
 */
export function encodeTwilioAudio(pcmBuffer: Buffer, sampleRate: number = 24000): string {
  try {
    // Normalize audio first for consistent volume
    const normalized = normalizeAudio(pcmBuffer);
    
    // Resample to 8kHz if needed (Twilio's format)
    const resampled = sampleRate !== 8000 
      ? resampleAudio(normalized, sampleRate, 8000)
      : normalized;
    
    // Convert to mulaw
    const mulawBuffer = pcmToMulaw(resampled);
    
    // Encode to base64
    return mulawBuffer.toString('base64');
  } catch (error) {
    console.error('❌ Error encoding Twilio audio:', error);
    throw error;
  }
}

/**
 * Decode base64 mulaw from Twilio to PCM for Deepgram
 */
export function decodeTwilioAudio(base64Audio: string): Buffer {
  try {
    // Decode from base64
    const mulawBuffer = Buffer.from(base64Audio, 'base64');
    
    // Convert to PCM
    const pcmBuffer = mulawToPCM(mulawBuffer);
    
    // Optionally resample to 16kHz for better Deepgram quality
    // Twilio sends 8kHz, Deepgram works better with 16kHz+
    const resampled = resampleAudio(pcmBuffer, 8000, 16000);
    
    return resampled;
  } catch (error) {
    console.error('❌ Error decoding Twilio audio:', error);
    throw error;
  }
}

