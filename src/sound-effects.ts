/**
 * Short synthesized tones for event rules, via the Web Audio API — no
 * audio files to bundle or store.
 */

import { EventSound } from './types';

let sharedContext: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (sharedContext) {
    return sharedContext;
  }
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  sharedContext = new Ctor();
  return sharedContext;
}

/** One note: frequency (Hz), start offset and duration (seconds). */
interface INote {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
}

const TONES: Record<Exclude<EventSound, 'none'>, INote[]> = {
  chime: [
    { freq: 880, start: 0, duration: 0.18 },
    { freq: 1318.5, start: 0.09, duration: 0.22 }
  ],
  pop: [{ freq: 440, start: 0, duration: 0.08, type: 'square' }],
  click: [{ freq: 1200, start: 0, duration: 0.03, type: 'square' }],
  success: [
    { freq: 523.25, start: 0, duration: 0.1 },
    { freq: 659.25, start: 0.08, duration: 0.1 },
    { freq: 783.99, start: 0.16, duration: 0.18 }
  ],
  error: [
    { freq: 311.1, start: 0, duration: 0.14, type: 'sawtooth' },
    { freq: 233.1, start: 0.1, duration: 0.22, type: 'sawtooth' }
  ]
};

/**
 * Plays a short built-in tone.
 * @param sound - which tone; `'none'` is a no-op
 * @param volume - 0–1
 */
export function playSound(sound: EventSound, volume: number): void {
  if (sound === 'none') {
    return;
  }
  const ctx = audioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  for (const note of TONES[sound]) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = note.type ?? 'sine';
    oscillator.frequency.value = note.freq;
    const peak = Math.max(0.0001, volume * 0.3);
    const start = now + note.start;
    const end = start + note.duration;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }
}
