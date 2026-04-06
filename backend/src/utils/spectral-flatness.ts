/**
 * Spectral flatness (Wiener entropy): geometric / arithmetic mean of power spectrum bins.
 * Broadband / noise-like audio trends higher; pure tones lower — complements energy-only VAD for hold music.
 */

const FFT_SIZE = 256;
const RING_CAPACITY = 4096;

function spectralFlatnessDft(x: Float64Array): number {
  const n = x.length;
  const half = n / 2;
  const powers: number[] = [];
  const eps = 1e-20;

  for (let k = 1; k < half; k++) {
    let re = 0;
    let im = 0;
    for (let t = 0; t < n; t++) {
      const angle = (-2 * Math.PI * k * t) / n;
      re += x[t] * Math.cos(angle);
      im += x[t] * Math.sin(angle);
    }
    const p = re * re + im * im;
    if (p > eps) powers.push(p);
  }

  if (powers.length === 0) return 0;

  let logSum = 0;
  let sum = 0;
  for (const p of powers) {
    logSum += Math.log(p);
    sum += p;
  }
  const geo = Math.exp(logSum / powers.length);
  const arith = sum / powers.length;
  return arith > eps ? geo / arith : 0;
}

export class SpectralFlatnessTracker {
  private readonly ring = new Float64Array(RING_CAPACITY);
  private write = 0;
  private count = 0;

  pushPcm16(pcm16: Buffer): number | null {
    const samples = new Int16Array(
      pcm16.buffer,
      pcm16.byteOffset,
      pcm16.length / 2
    );
    const n = this.ring.length;
    for (let i = 0; i < samples.length; i++) {
      this.ring[this.write] = samples[i] / 32768;
      this.write = (this.write + 1) % n;
      this.count = Math.min(n, this.count + 1);
    }

    if (this.count < FFT_SIZE) return null;

    const frame = new Float64Array(FFT_SIZE);
    const nRing = this.ring.length;
    const start = (this.write - FFT_SIZE + nRing) % nRing;
    for (let i = 0; i < FFT_SIZE; i++) {
      frame[i] = this.ring[(start + i) % nRing];
    }

    let mean = 0;
    for (let i = 0; i < FFT_SIZE; i++) mean += frame[i];
    mean /= FFT_SIZE;
    for (let i = 0; i < FFT_SIZE; i++) frame[i] -= mean;

    for (let i = 0; i < FFT_SIZE; i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)));
      frame[i] *= w;
    }

    return spectralFlatnessDft(frame);
  }

  reset(): void {
    this.write = 0;
    this.count = 0;
    this.ring.fill(0);
  }
}

export const SPECTRAL_FLATNESS_FFT_SIZE = FFT_SIZE;
