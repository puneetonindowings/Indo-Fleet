import { Platform, Vibration } from 'react-native';

const SIREN_WAV_BASE64 = (() => {
  try {
    const json = require('./siren_sound.json');
    return json.uri || '';
  } catch {
    return '';
  }
})();

let audioInstance: any = null;
let isSirenPlaying = false;
let audioContextInstance: any = null;

export function playConnectionLostSiren() {
  if (isSirenPlaying) return;
  isSirenPlaying = true;

  // 1. Mobile Vibration Siren Pattern: Vibrate 450ms, Pause 150ms, Vibrate 450ms, Pause 150ms, Vibrate 700ms
  try {
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 450, 150, 450, 150, 700]);
    }
  } catch (err) {
    console.warn('Vibration alert warning:', err);
  }

  // 2. Audible Siren Tone
  try {
    if (typeof window !== 'undefined') {
      // Synthesize clean audio oscillator siren if AudioContext available
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!audioContextInstance || audioContextInstance.state === 'closed') {
          audioContextInstance = new AudioCtx();
        }
        if (audioContextInstance.state === 'suspended') {
          audioContextInstance.resume();
        }

        const osc = audioContextInstance.createOscillator();
        const gain = audioContextInstance.createGain();
        osc.type = 'sawtooth';

        const startTime = audioContextInstance.currentTime;
        // Alternating siren frequencies: 820Hz and 580Hz
        for (let i = 0; i < 6; i++) {
          const t = startTime + i * 0.35;
          osc.frequency.setValueAtTime(i % 2 === 0 ? 820 : 580, t);
        }

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 2.2);

        osc.connect(gain);
        gain.connect(audioContextInstance.destination);

        osc.start(startTime);
        osc.stop(startTime + 2.2);

        setTimeout(() => {
          isSirenPlaying = false;
        }, 2500);
        return;
      }

      // Fallback: HTML5 Audio
      if (typeof Audio !== 'undefined' && SIREN_WAV_BASE64) {
        audioInstance = new Audio(SIREN_WAV_BASE64);
        audioInstance.volume = 0.8;
        audioInstance.play().catch(() => {});
        setTimeout(() => {
          isSirenPlaying = false;
        }, 2500);
        return;
      }
    }
  } catch (audioErr) {
    console.warn('Siren audio notice:', audioErr);
  }

  setTimeout(() => {
    isSirenPlaying = false;
  }, 2500);
}

export function stopConnectionLostSiren() {
  isSirenPlaying = false;
  try {
    if (Platform.OS !== 'web') {
      Vibration.cancel();
    }
  } catch {}

  try {
    if (audioInstance) {
      audioInstance.pause();
      audioInstance = null;
    }
  } catch {}
}
