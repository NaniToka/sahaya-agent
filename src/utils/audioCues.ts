class AudioCueManager {
  private ctx: AudioContext | null = null;
  private thinkingInterval: any = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1, delay = 0) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + delay + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(this.ctx.currentTime + delay);
    osc.stop(this.ctx.currentTime + delay + duration);
  }

  playStartListening() {
    this.initCtx();
    this.playTone(600, 'sine', 0.1, 0.1, 0);
    this.playTone(800, 'sine', 0.15, 0.1, 0.1);
  }

  playStopListening() {
    this.initCtx();
    this.playTone(800, 'sine', 0.1, 0.1, 0);
    this.playTone(600, 'sine', 0.15, 0.1, 0.1);
  }

  playSuccess() {
    this.initCtx();
    this.playTone(523.25, 'sine', 0.1, 0.1, 0); // C5
    this.playTone(659.25, 'sine', 0.1, 0.1, 0.1); // E5
    this.playTone(783.99, 'sine', 0.2, 0.1, 0.2); // G5
  }

  playError() {
    this.initCtx();
    this.playTone(300, 'sawtooth', 0.2, 0.1, 0);
    this.playTone(250, 'sawtooth', 0.3, 0.1, 0.2);
  }

  startThinking() {
    this.initCtx();
    this.stopThinking();
    // A soft pulsing tone every 1 second
    this.playTone(400, 'sine', 0.5, 0.05);
    this.thinkingInterval = setInterval(() => {
      this.playTone(400, 'sine', 0.5, 0.05);
    }, 1000);
  }

  stopThinking() {
    if (this.thinkingInterval) {
      clearInterval(this.thinkingInterval);
      this.thinkingInterval = null;
    }
  }
}

export const audioCues = typeof window !== 'undefined' ? new AudioCueManager() : null;
