export class GeminiAudioStreamer {
    public audioQueue: Float32Array[] = [];
    public isPlaying: boolean = false;
    private sampleRate: number = 24000;
    private bufferSize: number = 7680;
    private processingBuffer: Float32Array = new Float32Array(0);
    private scheduledTime: number = 0;
    public gainNode: GainNode;
    private isStreamComplete: boolean = false;
    private checkInterval: number | null = null;
    private initialBufferTime: number = 0.1;
    private endOfQueueAudioSource: AudioBufferSourceNode | null = null;
  
    public onComplete = () => {};
    public onAudioStart = (startTime: number) => {};
    public onAudioProgress = (currentTime: number, isPlaying: boolean) => {};
    public onLipsyncUpdate = (text: string, duration: number) => {};
  
    constructor(public context: AudioContext) {
      this.gainNode = this.context.createGain();
      this.gainNode.gain.value = 1.0; // Ensure volume is at 100%
      this.gainNode.connect(this.context.destination);
      console.log('🎵 GainNode created with volume:', this.gainNode.gain.value);
    }
  
    addBase64Audio(base64Data: string, mimeType: string) {
  
      // Convert base64 to PCM16
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
  
      this.addPCM16(bytes);
    }
  
    private calculateAudioDuration(pcmData: Uint8Array): number {
      // PCM16 = 2 bytes per sample, sample rate = 24000 Hz
      const sampleCount = pcmData.length / 2;
      const duration = sampleCount / this.sampleRate;
      return duration;
    }
  
    addPCM16(chunk: Uint8Array) {
      // Ensure AudioContext is running
      if (this.context.state === 'suspended') {
        console.log('🎵 Resuming suspended AudioContext');
        this.context.resume();
      }
      
      const float32Array = new Float32Array(chunk.length / 2);
      const dataView = new DataView(chunk.buffer);
  
      for (let i = 0; i < chunk.length / 2; i++) {
        try {
          const int16 = dataView.getInt16(i * 2, true);
          float32Array[i] = int16 / 32768;
        } catch (e) {
          console.error('PCM conversion error:', e);
        }
      }
  
      const newBuffer = new Float32Array(
        this.processingBuffer.length + float32Array.length,
      );
      newBuffer.set(this.processingBuffer);
      newBuffer.set(float32Array, this.processingBuffer.length);
      this.processingBuffer = newBuffer;
  
      while (this.processingBuffer.length >= this.bufferSize) {
        const buffer = this.processingBuffer.slice(0, this.bufferSize);
        this.audioQueue.push(buffer);
        this.processingBuffer = this.processingBuffer.slice(this.bufferSize);
      }
  
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.scheduledTime = this.context.currentTime + this.initialBufferTime;
        this.onAudioStart(this.scheduledTime);
        this.scheduleNextBuffer();
      }
    }
  
    private createAudioBuffer(audioData: Float32Array): AudioBuffer {
      const audioBuffer = this.context.createBuffer(
        1,
        audioData.length,
        this.sampleRate,
      );
      audioBuffer.getChannelData(0).set(audioData);
      return audioBuffer;
    }
  
    private scheduleNextBuffer() {
      const SCHEDULE_AHEAD_TIME = 0.2;
  
      while (
        this.audioQueue.length > 0 &&
        this.scheduledTime < this.context.currentTime + SCHEDULE_AHEAD_TIME
      ) {
        const audioData = this.audioQueue.shift()!;
        const audioBuffer = this.createAudioBuffer(audioData);
        const source = this.context.createBufferSource();
  
        if (this.audioQueue.length === 0) {
          if (this.endOfQueueAudioSource) {
            this.endOfQueueAudioSource.onended = null;
          }
          this.endOfQueueAudioSource = source;
          source.onended = () => {
            // console.log('🎵 Audio chunk ended');
            if (
              !this.audioQueue.length &&
              this.endOfQueueAudioSource === source
            ) {
              this.endOfQueueAudioSource = null;
              this.onComplete();
            }
          };
        }
  
        source.buffer = audioBuffer;
        source.connect(this.gainNode);
  
        const startTime = Math.max(this.scheduledTime, this.context.currentTime);
        source.start(startTime);
  
        this.scheduledTime = startTime + audioBuffer.duration;
      }
  
      this.onAudioProgress(this.context.currentTime, this.isPlaying);
  
      if (this.audioQueue.length === 0 && this.processingBuffer.length === 0) {
        if (this.isStreamComplete) {
          this.isPlaying = false;
          if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
          }
        } else {
          if (!this.checkInterval) {
            this.checkInterval = window.setInterval(() => {
              if (
                this.audioQueue.length > 0 ||
                this.processingBuffer.length >= this.bufferSize
              ) {
                this.scheduleNextBuffer();
              }
            }, 100) as unknown as number;
          }
        }
      } else {
        const nextCheckTime =
          (this.scheduledTime - this.context.currentTime) * 1000;
        setTimeout(
          () => this.scheduleNextBuffer(),
          Math.max(0, nextCheckTime - 50),
        );
      }
    }
  
    stop() {
      this.isPlaying = false;
      this.isStreamComplete = true;
      this.audioQueue = [];
      this.processingBuffer = new Float32Array(0);
      this.scheduledTime = this.context.currentTime;
      
      // Stop any currently playing audio source
      if (this.endOfQueueAudioSource) {
        try {
          this.endOfQueueAudioSource.stop();
          this.endOfQueueAudioSource.disconnect();
          console.log('🛑 Stopped active audio source');
        } catch (e) {
          console.log('🛑 Audio source already stopped');
        }
        this.endOfQueueAudioSource = null;
      }
      
      // Clear any scheduled intervals
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
      
      // Reset stream complete flag for next playback
      setTimeout(() => {
        this.isStreamComplete = false;
        // Ensure gainNode is still connected
        if (this.gainNode.numberOfOutputs === 0) {
          this.gainNode.connect(this.context.destination);
        }
        // Ensure volume is correct
        this.gainNode.gain.value = 1.0;
        console.log('🔄 Audio streamer reset for next playback, volume:', this.gainNode.gain.value);
      }, 100);
  
      this.onAudioProgress(this.context.currentTime, false);
  
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
  
      this.gainNode.gain.linearRampToValueAtTime(
        0,
        this.context.currentTime + 0.1,
      );
    }
  
    async resume() {
      console.log('🎵 Resuming audio context');
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
      this.isStreamComplete = false;
      this.scheduledTime = this.context.currentTime + this.initialBufferTime;
      this.gainNode.gain.setValueAtTime(1, this.context.currentTime);
    }
  
    complete() {
      console.log('🎵 Completing audio stream');
      this.isStreamComplete = true;
      if (this.processingBuffer.length > 0) {
        this.audioQueue.push(this.processingBuffer);
        this.processingBuffer = new Float32Array(0);
        if (this.isPlaying) {
          this.scheduleNextBuffer();
        }
      } else {
        this.onComplete();
      }
    }
  } 