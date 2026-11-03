/**
 * Web Audio API synthesizer for offline emergency audio tools:
 * - 110 BPM CPR Metronome click
 * - Multi-frequency acoustic rescue siren (700-1500Hz sweep)
 * - Morse Code SOS sequence
 * - Web Speech API vocal guidance
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenLfo: OscillatorNode | null = null;
  private isSirenActive = false;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // 1. CPR Metronome Click (Sharp click at 110 BPM)
  public playCprClick(isFirstBeat = false) {
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      // Higher tone on beat 1 or 30 for pacing
      osc.frequency.setValueAtTime(isFirstBeat ? 920 : 660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (e) {
      console.warn('Audio playback not permitted or unavailable:', e);
    }
  }

  // 2. Continuous Emergency Rescue Siren
  public startSiren() {
    if (this.isSirenActive) return;
    try {
      const ctx = this.initContext();

      this.sirenOsc = ctx.createOscillator();
      this.sirenGain = ctx.createGain();
      this.sirenLfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      this.sirenOsc.type = 'sawtooth';
      this.sirenOsc.frequency.setValueAtTime(850, ctx.currentTime);

      // LFO for pitch modulation (warble between 600Hz and 1400Hz at 2Hz speed)
      this.sirenLfo.type = 'sine';
      this.sirenLfo.frequency.setValueAtTime(2.2, ctx.currentTime);
      lfoGain.gain.setValueAtTime(450, ctx.currentTime);

      this.sirenLfo.connect(this.sirenOsc.frequency);
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(ctx.destination);

      // Volume envelope
      this.sirenGain.gain.setValueAtTime(0.01, ctx.currentTime);
      this.sirenGain.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.3);

      this.sirenLfo.start();
      this.sirenOsc.start();
      this.isSirenActive = true;
    } catch (e) {
      console.error('Failed to start rescue siren:', e);
    }
  }

  public stopSiren() {
    if (!this.isSirenActive) return;
    try {
      if (this.sirenGain && this.ctx) {
        this.sirenGain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        setTimeout(() => {
          this.sirenOsc?.stop();
          this.sirenOsc?.disconnect();
          this.sirenLfo?.stop();
          this.sirenLfo?.disconnect();
          this.sirenOsc = null;
          this.sirenLfo = null;
          this.sirenGain = null;
          this.isSirenActive = false;
        }, 220);
      } else {
        this.isSirenActive = false;
      }
    } catch (e) {
      this.isSirenActive = false;
    }
  }

  public getIsSirenActive(): boolean {
    return this.isSirenActive;
  }

  // 3. Morse Code SOS Audio (... --- ...)
  public async playMorseSos(): Promise<void> {
    try {
      const ctx = this.initContext();
      const dot = 0.12; // 120ms
      const dash = 0.36; // 360ms
      const pause = 0.12;

      // Pattern: S (...), O (---), S (...)
      const sequence = [
        dot, dot, dot, // S
        dash, dash, dash, // O
        dot, dot, dot, // S
      ];

      let delay = 0;
      for (let i = 0; i < sequence.length; i++) {
        const dur = sequence[i];
        setTimeout(() => {
          this.playSingleTone(800, dur);
        }, delay * 1000);
        delay += dur + pause;
        if (i === 2 || i === 5) {
          delay += 0.3; // extra pause between letters
        }
      }
    } catch (e) {
      console.warn('Morse audio error:', e);
    }
  }

  private playSingleTone(freq: number, duration: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // 4. Voice reader (Text to Speech)
  public speak(text: string, lang: 'ru' | 'kz' | 'en' = 'ru') {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop prior audio
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'kz' ? 'kk-KZ' : lang === 'en' ? 'en-US' : 'ru-RU';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  public stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const audioSynthesizer = new AudioSynthesizer();
