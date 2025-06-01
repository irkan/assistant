import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  GoogleGenAI,
  LiveServerMessage,
  MediaResolution,
  Modality,
  Session,
} from '@google/genai';
import { AudioRecorder } from '../utils/audioUtils';

interface GeminiLiveAudioProps {
  apiKey: string;
}

class GeminiAudioStreamer {
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

  constructor(public context: AudioContext) {
    this.gainNode = this.context.createGain();
    this.gainNode.connect(this.context.destination);
  }

  addBase64Audio(base64Data: string, mimeType: string) {
    console.log('🎵 Adding base64 audio:', { 
      dataLength: base64Data.length, 
      mimeType,
      isPlaying: this.isPlaying 
    });

    // Convert base64 to PCM16
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    this.addPCM16(bytes);
  }

  addPCM16(chunk: Uint8Array) {
    console.log('🎵 Processing PCM16 chunk:', chunk.length, 'bytes');
    
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

    console.log('🎵 Audio queue length:', this.audioQueue.length);

    if (!this.isPlaying) {
      console.log('🎵 Starting audio playback...');
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

      console.log('🎵 Scheduling buffer:', {
        bufferDuration: audioBuffer.duration,
        scheduledTime: this.scheduledTime,
        currentTime: this.context.currentTime
      });

      if (this.audioQueue.length === 0) {
        if (this.endOfQueueAudioSource) {
          this.endOfQueueAudioSource.onended = null;
        }
        this.endOfQueueAudioSource = source;
        source.onended = () => {
          console.log('🎵 Audio chunk ended');
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
    console.log('🎵 Stopping audio streamer');
    this.isPlaying = false;
    this.isStreamComplete = true;
    this.audioQueue = [];
    this.processingBuffer = new Float32Array(0);
    this.scheduledTime = this.context.currentTime;

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

const GeminiLiveAudio: React.FC<GeminiLiveAudioProps> = ({ apiKey }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const sessionRef = useRef<Session | undefined>(undefined);
  const responseQueueRef = useRef<LiveServerMessage[]>([]);
  const audioRecorderRef = useRef<AudioRecorder | undefined>(undefined);
  const audioStreamerRef = useRef<GeminiAudioStreamer | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | undefined>(undefined);

  const handleModelTurn = useCallback((message: LiveServerMessage) => {
    console.log('🎯 handleModelTurn called with message:', {
      messageType: message.serverContent?.modelTurn ? 'modelTurn' : 'other',
      hasInlineData: !!message.serverContent?.modelTurn?.parts?.[0]?.inlineData,
      hasText: !!message.serverContent?.modelTurn?.parts?.[0]?.text,
      turnComplete: message.serverContent?.turnComplete,
      fullMessage: message
    });

    if (message.serverContent?.modelTurn?.parts) {
      const part = message.serverContent?.modelTurn?.parts?.[0];

      if (part?.fileData?.fileUri) {
        setMessages(prev => [...prev, `📁 File: ${part?.fileData?.fileUri}`]);
      }

      if (part?.inlineData) {
        const inlineData = part?.inlineData;
        console.log('🎵 Audio data alındı:', {
          dataLength: inlineData?.data?.length,
          mimeType: inlineData?.mimeType,
          source: 'modelTurn'
        });
        
        // Use AudioContext-based streaming
        if (inlineData?.data && audioStreamerRef.current) {
          try {
            setMessages(prev => [...prev, '🎵 Voice response alındı, səsləndirilir...']);
            audioStreamerRef.current.addBase64Audio(
              inlineData.data, 
              inlineData.mimeType ?? 'audio/pcm;rate=24000'
            );
          } catch (error) {
            console.error('❌ Error playing audio:', error);
            const errorMessage = error instanceof Error ? error.message : 'Naməlum xəta';
            setMessages(prev => [...prev, '❌ Audio oynatma xətası: ' + errorMessage]);
          }
        }
      }

      if (part?.text) {
        setMessages(prev => [...prev, `🤖 Gemini: ${part?.text}`]);
      }
    }

    // Check for other message types that might contain audio
    if (message.serverContent && !message.serverContent.modelTurn) {
      console.log('🔍 Non-modelTurn message:', message.serverContent);
      
      // Check if there's audio in a different structure
      const serverContent = message.serverContent as any;
      if (serverContent.inlineData) {
        console.log('🎵 Found audio in serverContent.inlineData');
        const inlineData = serverContent.inlineData;
        if (inlineData?.data && audioStreamerRef.current) {
          try {
            setMessages(prev => [...prev, '🎵 Realtime voice response alındı...']);
            audioStreamerRef.current.addBase64Audio(
              inlineData.data, 
              inlineData.mimeType ?? 'audio/pcm;rate=24000'
            );
          } catch (error) {
            console.error('❌ Error playing realtime audio:', error);
          }
        }
      }
    }
  }, []);

  const waitMessage = useCallback(async (): Promise<LiveServerMessage> => {
    let done = false;
    let message: LiveServerMessage | undefined = undefined;
    while (!done) {
      message = responseQueueRef.current.shift();
      if (message) {
        handleModelTurn(message);
        done = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return message!;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTurn = useCallback(async (): Promise<LiveServerMessage[]> => {
    const turn: LiveServerMessage[] = [];
    let done = false;
    while (!done) {
      const message = await waitMessage();
      turn.push(message);
      if (message.serverContent && message.serverContent.turnComplete) {
        done = true;
      }
    }
    return turn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectToGemini = useCallback(async () => {
    if (!apiKey) {
      setError('API key is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Gemini Live API-yə qoşuluruq...');
      console.log('API Key uzunluğu:', apiKey.length);

      // Resume audio context first
      if (audioStreamerRef.current) {
        await audioStreamerRef.current.resume();
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
      });

      // Your specified model
      const model = 'models/gemini-2.5-flash-preview-native-audio-dialog';
      
      const config = {
        responseModalities: [Modality.AUDIO],
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Zephyr',
            }
          }
        },
        contextWindowCompression: {
          triggerTokens: '25600',
          slidingWindow: { targetTokens: '12800' },
        },
      };

      console.log('📋 Model:', model);
      console.log('📋 Konfigurасiya:', JSON.stringify(config, null, 2));

      setMessages(prev => [...prev, `🔄 ${model} modelinə qoşuluruq...`]);

      const session = await ai.live.connect({
        model,
        callbacks: {
          onopen: function () {
            console.log('✅ Live session opened successfully');
            setIsConnected(true);
            setMessages(prev => [...prev, '✅ Gemini Live Audio-ya uğurla qoşuldu']);
          },
          onmessage: function (message: LiveServerMessage) {
            console.log('📨 Received message:', message);
            
            // Process messages immediately instead of queuing
            if (message.serverContent?.modelTurn?.parts) {
              const part = message.serverContent?.modelTurn?.parts?.[0];

              if (part?.inlineData) {
                const inlineData = part?.inlineData;
                console.log('🎵 Real-time audio data alındı:', {
                  dataLength: inlineData?.data?.length,
                  mimeType: inlineData?.mimeType,
                  source: 'real-time'
                });
                
                // Use AudioContext-based streaming immediately
                if (inlineData?.data && audioStreamerRef.current) {
                  try {
                    setMessages(prev => [...prev, '🎵 Real-time voice response alındı...']);
                    audioStreamerRef.current.addBase64Audio(
                      inlineData.data, 
                      inlineData.mimeType ?? 'audio/pcm;rate=24000'
                    );
                  } catch (error) {
                    console.error('❌ Error playing real-time audio:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Naməlum xəta';
                    setMessages(prev => [...prev, '❌ Real-time audio oynatma xətası: ' + errorMessage]);
                  }
                }
              }

              if (part?.text) {
                setMessages(prev => [...prev, `🤖 Gemini: ${part?.text}`]);
              }
            }
            
            // Also add to queue for legacy handleTurn processing
            responseQueueRef.current.push(message);
          },
          onerror: function (e: ErrorEvent) {
            console.error('❌ Live session error:', e);
            setError(`Live session xətası: ${e.message}`);
            setIsConnected(false);
          },
          onclose: function (e: CloseEvent) {
            console.error('🔌 Live session closed:', e);
            setIsConnected(false);
            const reason = e.reason || `Kod: ${e.code}`;
            setMessages(prev => [...prev, `🔌 Live session bağlandı: ${reason}`]);
          },
        },
        config
      });

      console.log('✅ Live session yaradıldı:', session);
      sessionRef.current = session;
      
    } catch (error) {
      console.error('❌ Live connection failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        if (error.message.includes('API key')) {
          setError('API key problemi - key-i yoxlayın');
        } else if (error.message.includes('permission')) {
          setError('İcazə problemi - Live API girişi yoxdur');
        } else if (error.message.includes('model')) {
          setError('Model problemi - model mövcud deyil və ya Live API dəstəkləmir');
        } else {
          setError(`Live qoşulma xətası: ${error.message}`);
        }
      } else {
        setError('Naməlum Live qoşulma xətası');
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  const sendMessage = useCallback(async () => {
    if (!sessionRef.current || !userInput.trim()) {
      return;
    }

    const messageText = userInput.trim();
    setUserInput('');
    setMessages(prev => [...prev, `👤 Siz: ${messageText}`]);
    
    try {
      console.log('📤 Sending message:', messageText);
      
      sessionRef.current.sendClientContent({
        turns: [messageText]
      });

      console.log('✅ Message sent, waiting for response...');
      await handleTurn();
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setError(`Mesaj göndərmə xətası: ${error instanceof Error ? error.message : 'Naməlum xəta'}`);
    }
  }, [userInput, handleTurn]);

  const startMicrophoneRecording = useCallback(async () => {
    if (!sessionRef.current) {
      setError('Əvvəlcə Gemini Live-a qoşulun');
      return;
    }

    try {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder(16000);
        
        audioRecorderRef.current.onData = (base64Data) => {
          if (sessionRef.current) {
            sessionRef.current.sendRealtimeInput({
              audio: {
                data: base64Data,
                mimeType: 'audio/pcm;rate=16000'
              }
            });
          }
        };
        
        audioRecorderRef.current.onVolumeChange = (volume) => {
          setMicrophoneLevel(volume);
        };
      }

      await audioRecorderRef.current.start();
      setIsRecording(true);
      setMessages(prev => [...prev, '🎤 Mikrofon başladı, danışa bilərsiniz...']);
    } catch (error) {
      console.error('Error starting microphone:', error);
      setError(`Mikrofon xətası: ${error instanceof Error ? error.message : 'Naməlum xəta'}`);
    }
  }, []);

  const stopMicrophoneRecording = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = undefined;
    }
    setIsRecording(false);
    setMicrophoneLevel(0);
    setMessages(prev => [...prev, '🔇 Mikrofon dayandırıldı']);
    
    // No need to trigger handleTurn since we have real-time processing
    console.log('🔇 Microphone stopped - real-time processing active');
  }, []);

  const testAudio = useCallback(() => {
    console.log('🔊 Test audio playing...');
    setMessages(prev => [...prev, '🔊 Test audio başlatılır...']);
    
    // Create a simple test tone using our audio context
    if (audioContextRef.current) {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime); // A note
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 1);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 1);
      
      oscillator.onended = () => {
        setMessages(prev => [...prev, '✅ Test audio tamamlandı']);
      };
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = undefined;
    }
    
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = undefined;
    }
    
    if (audioStreamerRef.current) {
      audioStreamerRef.current.stop();
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setMicrophoneLevel(0);
    setIsAudioPlaying(false);
    responseQueueRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Initialize audio streamer with AudioContext
  useEffect(() => {
    const initAudio = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        audioStreamerRef.current = new GeminiAudioStreamer(audioContextRef.current);
        
        audioStreamerRef.current.onAudioStart = (startTime) => {
          console.log('🎵 Audio playback started at:', startTime);
          setIsAudioPlaying(true);
          setMessages(prev => [...prev, '🔊 AI danışır...']);
        };
        
        audioStreamerRef.current.onAudioProgress = (currentTime, isPlaying) => {
          setIsAudioPlaying(isPlaying);
        };
        
        audioStreamerRef.current.onComplete = () => {
          console.log('🎵 Audio playback completed');
          setIsAudioPlaying(false);
          setMessages(prev => [...prev, '🔇 AI danışığını tamamladı']);
        };

        console.log('🎵 Audio system initialized');
      } catch (error) {
        console.error('Audio initialization failed:', error);
        setError('Audio sistemi başlatıla bilmədi');
      }
    };

    initAudio();

    return () => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="gemini-live-audio">
      <div className="header">
        <h2>🎤 Gemini Live Voice Chat</h2>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Live Qoşuldu' : '🔴 Live Qoşulmayıb'}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className="controls">
        {!isConnected ? (
          <button 
            onClick={connectToGemini} 
            disabled={isLoading}
            className="connect-btn"
          >
            {isLoading ? '🔄 Live Qoşulur...' : '🔗 Live Voice Chat Başlat'}
          </button>
        ) : (
          <button 
            onClick={disconnect}
            className="disconnect-btn"
          >
            🔌 Live Ayır
          </button>
        )}

        {isConnected && (
          <>
            {!isRecording ? (
              <button 
                onClick={startMicrophoneRecording}
                className="mic-btn"
              >
                🎤 Voice Chat Başlat
              </button>
            ) : (
              <button 
                onClick={stopMicrophoneRecording}
                className="mic-stop-btn"
              >
                🔇 Voice Chat Dayandır
              </button>
            )}
          </>
        )}
        
        <button 
          onClick={clearMessages}
          className="clear-btn"
        >
          🗑️ Təmizlə
        </button>
        
        <button 
          onClick={testAudio}
          className="connect-btn"
        >
          🔊 Audio Test
        </button>
      </div>

      {/* Voice activity indicators */}
      {(isRecording || isAudioPlaying) && (
        <div className="audio-status">
          {isRecording && (
            <div className="mic-level">
              <span>🎤 Danışın:</span>
              <div className="level-bar">
                <div 
                  className="level-fill" 
                  style={{ width: `${microphoneLevel * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {isAudioPlaying && (
            <div className="audio-playing">
              🔊 AI danışır...
            </div>
          )}
        </div>
      )}

      {isConnected && (
        <div className="message-input">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Gemini-yə mesajınızı yazın (və ya voice chat istifadə edin)..."
            className="input-field"
          />
          <button 
            onClick={sendMessage}
            disabled={!userInput.trim()}
            className="send-btn"
          >
            📤 Text Göndər
          </button>
        </div>
      )}

      <div className="messages-container">
        <h3>💬 Live Söhbət</h3>
        <div className="messages">
          {messages.length === 0 ? (
            <p className="no-messages">Live voice chat başlatın və danışmağa başlayın!</p>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="message">
                {message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GeminiLiveAudio; 