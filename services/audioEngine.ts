
export class AudioDeck {
  private ctx: AudioContext;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private gainNode: GainNode;
  private analyser: AnalyserNode;
  private lowFilter: BiquadFilterNode;
  private midFilter: BiquadFilterNode;
  private highFilter: BiquadFilterNode;
  private playbackRate: number = 1.0;
  private startTime: number = 0;
  private pauseOffset: number = 0;
  private isPlaying: boolean = false;
  private dataArray: Uint8Array;
  public isFallback: boolean = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.gainNode = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    this.lowFilter = ctx.createBiquadFilter();
    this.lowFilter.type = 'lowshelf';
    this.lowFilter.frequency.value = 320;

    this.midFilter = ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 1000;
    this.midFilter.Q.value = 1.0;

    this.highFilter = ctx.createBiquadFilter();
    this.highFilter.type = 'highshelf';
    this.highFilter.frequency.value = 3200;

    this.lowFilter.connect(this.midFilter);
    this.midFilter.connect(this.highFilter);
    this.highFilter.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);
  }

  private createFallbackBuffer(trackId: string, bpm: number) {
    const length = (60 / bpm) * 8; // 8 beats loop
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate * length, sampleRate);
    const data = buffer.getChannelData(0);
    const beatLen = 60 / bpm;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const beatT = t % beatLen;
      const barT = t % (beatLen * 4);
      
      // Basic Techno Kick (common to all)
      let kick = Math.sin(2 * Math.PI * 55 * Math.exp(-beatT * 15)) * Math.exp(-beatT * 8);
      
      let layer = 0;
      
      // Style variations based on trackId
      if (trackId === '1') { // ACID STYLE
        const freq = 100 + 400 * Math.abs(Math.sin(barT * 0.5));
        const res = 15;
        const saw = (t * freq % 1) * 2 - 1;
        layer = saw * Math.exp(-(t % (beatLen / 4)) * 10) * 0.2;
      } else if (trackId === '2') { // INDUSTRIAL
        const noise = (Math.random() * 2 - 1) * Math.exp(-(beatT > beatLen/2 ? beatT-beatLen/2 : beatT*2) * 50);
        layer = noise * 0.3;
        kick *= 1.2; // Harder kick
      } else if (trackId === '3') { // TRANCE / STROBE
        const note = [110, 130, 165, 110][Math.floor(barT / beatLen) % 4];
        const synth = Math.sin(2 * Math.PI * note * t) * 0.15;
        layer = synth * (0.5 + 0.5 * Math.sin(t * 12));
      } else if (trackId === '4') { // DEEP / UNDERGROUND
        const sub = Math.sin(2 * Math.PI * 40 * t) * 0.3;
        const hat = (Math.random() * 0.05) * Math.exp(-( (t + beatLen/2) % beatLen) * 50);
        layer = sub + hat;
      } else {
        layer = Math.sin(2 * Math.PI * 220 * t) * 0.05;
      }
      
      data[i] = (kick * 0.6 + layer) * 0.7;
    }
    return buffer;
  }

  async loadTrack(url: string, trackId: string, bpm: number = 128) {
    try {
      this.isFallback = false;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.warn(`AudioDeck: Fallback for track ${trackId}`, e);
      this.buffer = this.createFallbackBuffer(trackId, bpm);
      this.isFallback = true;
    }
  }

  play() {
    if (this.isPlaying || !this.buffer) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.playbackRate.value = this.playbackRate;
    this.source.loop = true;
    this.source.connect(this.lowFilter);
    
    this.startTime = this.ctx.currentTime - (this.pauseOffset % this.buffer.duration);
    this.source.start(0, this.pauseOffset % this.buffer.duration);
    this.isPlaying = true;
  }

  stop() {
    if (!this.isPlaying || !this.source) return;
    this.pauseOffset = (this.ctx.currentTime - this.startTime) * this.playbackRate;
    this.source.stop();
    this.source.disconnect();
    this.isPlaying = false;
  }

  setVolume(val: number) {
    this.gainNode.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  setPitch(val: number, immediate: boolean = false) {
    this.playbackRate = Math.max(0.01, Math.min(4.0, val));
    if (this.source) {
      if (immediate) {
        this.source.playbackRate.value = this.playbackRate;
      } else {
        this.source.playbackRate.setTargetAtTime(this.playbackRate, this.ctx.currentTime, 0.05);
      }
    }
  }

  setLow(val: number) {
    this.lowFilter.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  setMid(val: number) {
    this.midFilter.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  setHigh(val: number) {
    this.highFilter.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  getVolumeLevel(): number {
    this.analyser.getByteFrequencyData(this.dataArray);
    let max = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      if (this.dataArray[i] > max) max = this.dataArray[i];
    }
    // Boost the visual sensitivity
    return Math.pow(max / 255, 0.7);
  }

  getCurrentTime(): number {
    if (!this.isPlaying) return this.pauseOffset;
    return (this.ctx.currentTime - this.startTime) * this.playbackRate;
  }
}
