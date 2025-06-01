import EventEmitter from 'events';

interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

export function parseMimeType(mimeType: string): WavConversionOptions {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const [, format] = fileType.split('/');

  const options: Partial<WavConversionOptions> = {
    numChannels: 1,
    bitsPerSample: 16,
  };

  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'rate') {
      options.sampleRate = parseInt(value, 10);
    }
  }

  return options as WavConversionOptions;
}

function writeString(buffer: Uint8Array, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    buffer[offset + i] = str.charCodeAt(i);
  }
}

function writeUInt32LE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >> 8) & 0xff;
  buffer[offset + 2] = (value >> 16) & 0xff;
  buffer[offset + 3] = (value >> 24) & 0xff;
}

function writeUInt16LE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >> 8) & 0xff;
}

export function createWavHeader(dataLength: number, options: WavConversionOptions): Uint8Array {
  const {
    numChannels,
    sampleRate,
    bitsPerSample,
  } = options;

  // http://soundfile.sapp.org/doc/WaveFormat
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = new Uint8Array(44);

  writeString(buffer, 0, 'RIFF');              // ChunkID
  writeUInt32LE(buffer, 4, 36 + dataLength);   // ChunkSize
  writeString(buffer, 8, 'WAVE');              // Format
  writeString(buffer, 12, 'fmt ');             // Subchunk1ID
  writeUInt32LE(buffer, 16, 16);               // Subchunk1Size (PCM)
  writeUInt16LE(buffer, 20, 1);                // AudioFormat (1 = PCM)
  writeUInt16LE(buffer, 22, numChannels);      // NumChannels
  writeUInt32LE(buffer, 24, sampleRate);       // SampleRate
  writeUInt32LE(buffer, 28, byteRate);         // ByteRate
  writeUInt16LE(buffer, 32, blockAlign);       // BlockAlign
  writeUInt16LE(buffer, 34, bitsPerSample);    // BitsPerSample
  writeString(buffer, 36, 'data');             // Subchunk2ID
  writeUInt32LE(buffer, 40, dataLength);       // Subchunk2Size

  return buffer;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function convertToWav(rawData: string[], mimeType: string): Uint8Array {
  const options = parseMimeType(mimeType);
  
  // Convert base64 strings to Uint8Arrays
  const audioBuffers = rawData.map(data => base64ToUint8Array(data));
  
  // Calculate total data length
  const dataLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
  
  const wavHeader = createWavHeader(dataLength, options);
  
  // Combine header and audio data
  const result = new Uint8Array(wavHeader.length + dataLength);
  result.set(wavHeader);
  
  let offset = wavHeader.length;
  for (const buffer of audioBuffers) {
    result.set(buffer, offset);
    offset += buffer.length;
  }
  
  return result;
}

export function downloadBlob(data: Uint8Array, filename: string, mimeType: string): void {
  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Simplified audio recording class based on working implementation
export class SimpleAudioRecorder extends EventEmitter {
  private stream: MediaStream | undefined;
  private audioContext: AudioContext | undefined;
  private source: MediaStreamAudioSourceNode | undefined;
  private processor: ScriptProcessorNode | undefined;
  public recording: boolean = false;
  private sampleRate: number;

  constructor(sampleRate: number = 16000) {
    super();
    this.sampleRate = sampleRate;
  }

  async start(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Could not request user media');
    }

    console.log('🎤 SimpleAudioRecorder starting...');

    try {
      // Get microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      // Create script processor (older but stable)
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (event) => {
        if (!this.recording) return;

        const inputData = event.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16
        const int16Array = new Int16Array(inputData.length);
        let maxVolume = 0;
        
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          int16Array[i] = sample * 0x7FFF;
          maxVolume = Math.max(maxVolume, Math.abs(sample));
        }

        // Emit volume (throttled)
        this.emit('volume', maxVolume);

        // Convert to base64
        const arrayBuffer = int16Array.buffer;
        const base64 = this.arrayBufferToBase64(arrayBuffer);
        this.emit('data', base64);
      };

      // Connect nodes
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      this.recording = true;
      console.log('✅ SimpleAudioRecorder started successfully');
      
    } catch (error) {
      console.error('❌ Error starting SimpleAudioRecorder:', error);
      throw error;
    }
  }

  stop(): void {
    console.log('🛑 SimpleAudioRecorder stopping...');
    
    this.recording = false;
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = undefined;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = undefined;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = undefined;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = undefined;
    }

    console.log('✅ SimpleAudioRecorder stopped');
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// Modern Audio Streaming Class for Gemini Live Audio
export class AudioStreamer {
  private audioContext: AudioContext;
  private gainNode: GainNode;
  private audioQueue: Float32Array[] = [];
  private isPlaying: boolean = false;
  private sampleRate: number = 24000;
  private bufferSize: number = 7680;
  private processingBuffer: Float32Array = new Float32Array(0);
  private scheduledTime: number = 0;
  private isStreamComplete: boolean = false;
  private checkInterval: number | null = null;
  private initialBufferTime: number = 0.1;
  private endOfQueueAudioSource: AudioBufferSourceNode | null = null;

  public onComplete: () => void = () => {};
  public onAudioStart: (startTime: number) => void = () => {};
  public onAudioProgress: (currentTime: number, isPlaying: boolean) => void = () => {};

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }

  // Add PCM16 audio data and play it
  addPCM16(chunk: Uint8Array): void {
    const float32Array = new Float32Array(chunk.length / 2);
    const dataView = new DataView(chunk.buffer);

    for (let i = 0; i < chunk.length / 2; i++) {
      try {
        const int16 = dataView.getInt16(i * 2, true);
        float32Array[i] = int16 / 32768;
      } catch (e) {
        console.error('Error processing audio chunk:', e);
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
      this.scheduledTime = this.audioContext.currentTime + this.initialBufferTime;
      this.onAudioStart(this.scheduledTime);
      this.scheduleNextBuffer();
    }
  }

  // Add base64 encoded audio data
  addBase64Audio(base64Data: string, mimeType: string): void {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    this.addPCM16(bytes);
  }

  private createAudioBuffer(audioData: Float32Array): AudioBuffer {
    const audioBuffer = this.audioContext.createBuffer(
      1,
      audioData.length,
      this.sampleRate,
    );
    audioBuffer.getChannelData(0).set(audioData);
    return audioBuffer;
  }

  private scheduleNextBuffer(): void {
    const SCHEDULE_AHEAD_TIME = 0.2;

    while (
      this.audioQueue.length > 0 &&
      this.scheduledTime < this.audioContext.currentTime + SCHEDULE_AHEAD_TIME
    ) {
      const audioData = this.audioQueue.shift()!;
      const audioBuffer = this.createAudioBuffer(audioData);
      const source = this.audioContext.createBufferSource();

      if (this.audioQueue.length === 0) {
        if (this.endOfQueueAudioSource) {
          this.endOfQueueAudioSource.onended = null;
        }
        this.endOfQueueAudioSource = source;
        source.onended = () => {
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

      const startTime = Math.max(this.scheduledTime, this.audioContext.currentTime);
      source.start(startTime);

      this.scheduledTime = startTime + audioBuffer.duration;
    }

    this.onAudioProgress(this.audioContext.currentTime, this.isPlaying);

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
          }, 100);
        }
      }
    } else {
      const nextCheckTime =
        (this.scheduledTime - this.audioContext.currentTime) * 1000;
      setTimeout(
        () => this.scheduleNextBuffer(),
        Math.max(0, nextCheckTime - 50),
      );
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.isStreamComplete = false;
    this.scheduledTime = this.audioContext.currentTime + this.initialBufferTime;
    this.gainNode.gain.setValueAtTime(1, this.audioContext.currentTime);
  }

  stop(): void {
    this.isPlaying = false;
    this.isStreamComplete = true;
    this.audioQueue = [];
    this.processingBuffer = new Float32Array(0);
    this.scheduledTime = this.audioContext.currentTime;

    this.onAudioProgress(this.audioContext.currentTime, false);

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.gainNode.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + 0.1,
    );

    setTimeout(() => {
      this.gainNode.disconnect();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    }, 200);
  }

  complete(): void {
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

  setVolume(volume: number): void {
    this.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
  }
} 