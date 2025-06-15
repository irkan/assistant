import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  GoogleGenAI,
  LiveServerMessage,
  MediaResolution,
  Modality,
  Session,
  FunctionDeclaration,
} from '@google/genai';
import { SimpleAudioRecorder } from '../utils/audioUtils';
import { GeminiAudioStreamer } from '../utils/audioStreamer';
import { AylaModelRef, GeminiLiveAudioProps, MorphTargetData } from './types';
import { MODEL_NAME, geminiSessionConfig } from '../config/geminiConfig';
import { getPhonemeTargets, sanitizeText, smoothUpdateMorphTargets, initialMorphWeights, ALL_MORPH_TARGETS } from '../utils/lipSync';

const LIPSYNC_CHAR_DURATION_OFFSET = 20; // ms

const GeminiLiveAudio: React.FC<GeminiLiveAudioProps> = ({ 
  apiKey, 
  shouldConnect = false,
  shouldDisconnect = false,
  shouldStartRecording = false,
  onConnectionChange,
  onRecordingStart,
  onMuteChange,
  externalMuted = false,
  onVolumeChange,
  onInVolumeChange,
  onLipsyncUpdate,
  aylaModelRef,
}) => {
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
  const audioRecorderRef = useRef<SimpleAudioRecorder | undefined>(undefined);
  const audioStreamerRef = useRef<GeminiAudioStreamer | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | undefined>(undefined);
  const initialMessageSentRef = useRef(false);
  
  // Simple transcription storage for lipsync
  const lastTranscriptionTextRef = useRef<string>('');
  const currentWordRef = useRef<{text: string, duration: number} | null>(null);
  
  // Animation queue system to prevent concurrency issues
  const animationQueueRef = useRef<Array<{char: string, duration: number, isNeutral?: boolean}>>([]);
  const isAnimatingRef = useRef<boolean>(false);
  const currentAnimationTimeouts = useRef<NodeJS.Timeout[]>([]);
  const processAnimationQueueRef = useRef<() => void>();
  const addToAnimationQueueRef = useRef<(text: string, duration: number) => void>();
  const transitionTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const currentMorphWeightsRef = useRef<Record<string, number>>({ ...initialMorphWeights });

  // Handle external connection control
  useEffect(() => {
    if (shouldConnect && !isConnected && !isLoading) {
      connectToGemini();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldConnect]);

  // Handle external disconnection control
  useEffect(() => {
    if (shouldDisconnect && isConnected) {
      disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldDisconnect]);

  // Handle automatic recording start
  useEffect(() => {
    if (shouldStartRecording && isConnected && !isRecording) {
      console.log('🎤 Auto-starting recording after connection...');
      startMicrophoneRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStartRecording, isConnected, isRecording]);

  // Handle external mute control - simplified
  useEffect(() => {
    // Sync internal mute state
    if (onMuteChange) {
      onMuteChange(externalMuted);
    }
    
    if (externalMuted && isRecording) {
      console.log('🔇 External mute: stopping microphone');
      stopMicrophoneRecording();
    } else if (!externalMuted && isConnected && !isRecording) {
      console.log('🎤 External unmute: starting microphone');
      startMicrophoneRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMuted]);

  // Report volume changes to parent
  useEffect(() => {
    if (onVolumeChange) {
      onVolumeChange(0); // For now, we'll use 0. We can enhance this based on audio streamer volume
    }
  }, [onVolumeChange]);

  // Report input volume (microphone level) changes to parent
  useEffect(() => {
    if (onInVolumeChange) {
      onInVolumeChange(microphoneLevel);
    }
  }, [microphoneLevel, onInVolumeChange]);





  // Remove the notification effect that causes loops
  // Keep only connection change notification
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(isConnected);
    }
  }, [isConnected, onConnectionChange]);

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

      // Audio is already processed in onMessage, just log here
      if (part?.inlineData) {
        const inlineData = part?.inlineData;
        console.log('⏭️ Audio already processed in onMessage:', {
          dataLength: inlineData?.data?.length,
          mimeType: inlineData?.mimeType,
          source: 'handleModelTurn'
        });
      }

      if (part?.text) {
        console.log('📝 AI Response Text (legacy):', part.text);
        console.log(part.text);
        setMessages(prev => [...prev, `🤖 Gemini (legacy): ${part?.text}`]);
      }
    }

    // Legacy audio processing (simplified - no duplicate audio)
    if (message.serverContent && !message.serverContent.modelTurn) {
      console.log('🔍 Non-modelTurn message:', message.serverContent);
      
      const serverContent = message.serverContent as { inlineData?: { data?: string; mimeType?: string } };
      if (serverContent.inlineData) {
        console.log('⏭️ Legacy audio already processed in onMessage');
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
      console.error('❌ API key missing!');
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log('🚀 Starting Gemini Live connection...');

    try {
      console.log('🔄 Gemini Live API-yə qoşuluruq...');
      console.log('API Key uzunluğu:', apiKey.length);
      console.log('API Key ilk 10 simvol:', apiKey.substring(0, 10) + '...');

      // Resume audio context first
      if (audioStreamerRef.current) {
        await audioStreamerRef.current.resume();
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
      });
      const model = MODEL_NAME;
      const config = geminiSessionConfig;


      console.log('📋 Model:', model);
      console.log('📋 Konfigurасiya:', JSON.stringify(config, null, 2));

      setMessages(prev => [...prev, `🔄 ${model} modelinə qoşuluruq...`]);

      const session = await ai.live.connect({
        model,
        callbacks: {
          onopen: function () {
            console.log('✅ Live session opened successfully');
            setIsConnected(true);
            setIsLoading(false);
            setMessages(prev => [...prev, '✅ Gemini Live Audio-ya uğurla qoşuldu']);
          },
          onmessage: function (message: LiveServerMessage) {
            // Handle interruption - check first before processing other content
            if (message.serverContent?.interrupted) {
              console.log('⚡ Audio interrupted by user speech');
              if (audioStreamerRef.current) {
                audioStreamerRef.current.stop();
              }
              setIsAudioPlaying(false);
              setMessages(prev => [...prev, '⚡ Interruption - İstifadəçi danışdı']);
              
              // Reset character animation to neutral
              if (aylaModelRef?.current) {
                const neutralTargets = getPhonemeTargets('neutral', currentMorphWeightsRef);
                smoothUpdateMorphTargets(aylaModelRef, transitionTimeoutsRef, currentMorphWeightsRef, neutralTargets, 50);
              }
              
              // Clear animation queue
              animationQueueRef.current = [];
              isAnimatingRef.current = false;
              currentAnimationTimeouts.current.forEach(timeout => clearTimeout(timeout));
              currentAnimationTimeouts.current = [];
              
              return; // Don't process other content when interrupted
            }
            
            // Handle audio transcription messages  
            if (message.serverContent?.outputTranscription) {
              const transcription = message.serverContent.outputTranscription;
              // console.log('🎤 AI Audio Transcription:', transcription);
              setMessages(prev => [...prev, `🎙️ AI Səsi (transcribe): ${transcription}`]);
              
              // Store latest transcription text for lipsync
              if (typeof transcription === 'object' && transcription.text) {
                lastTranscriptionTextRef.current = transcription.text;
                // console.log('📝 Latest transcription stored:', transcription.text);
              } else if (typeof transcription === 'string') {
                lastTranscriptionTextRef.current = transcription;
                // console.log('📝 Latest transcription stored:', transcription);
              }
            }
            
            // Process audio immediately when it arrives
            if (message.serverContent?.modelTurn?.parts) {
              const part = message.serverContent?.modelTurn?.parts?.[0];

              if (part?.inlineData?.data && audioStreamerRef.current) {
                const inlineData = part.inlineData;
                const audioData = inlineData.data!; // We already checked it exists
                
                try {
                  setMessages(prev => [...prev, '🎵 Audio response alındı...']);
                  
                  // Use part text or latest transcription
                  const textForLipsync = part.text || lastTranscriptionTextRef.current;
                  
                  // Calculate duration from base64 audio data
                  const binaryString = atob(audioData);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  const sampleCount = bytes.length / 2; // PCM16 = 2 bytes per sample
                  const duration = sampleCount / 24000; // 24kHz sample rate
                  const durationMs = Math.round(duration * 1000); // Convert to milliseconds
                  
                  // Smart duration accumulation logic
                  if (textForLipsync && textForLipsync.trim().length > 0) {
                    // New word/text arrived
                    if (currentWordRef.current) {
                      if (audioStreamerRef.current) {
                        audioStreamerRef.current.onLipsyncUpdate(currentWordRef.current.text, currentWordRef.current.duration);
                      }
                    }
                    
                    // Start new word (silently)
                    currentWordRef.current = {
                      text: textForLipsync.trim(),
                      duration: durationMs
                    };
                  } else {
                    // Empty text - add duration to current word (silently)
                    if (currentWordRef.current) {
                      currentWordRef.current.duration += durationMs;
                    }
                  }
                  
                  // Play audio (simplified - no text parameter needed)
                  audioStreamerRef.current.addBase64Audio(
                    audioData, 
                    inlineData.mimeType ?? 'audio/pcm;rate=24000'
                  );
                  
                  // Clear used transcription
                  if (textForLipsync === lastTranscriptionTextRef.current) {
                    lastTranscriptionTextRef.current = '';
                  }
                } catch (error) {
                  console.error('❌ Error processing audio:', error);
                  setMessages(prev => [...prev, '❌ Audio prosess xətası: ' + (error instanceof Error ? error.message : 'Naməlum')]);
                }
              }

              if (part?.text) {
                console.log('📝 AI Text:', part.text);
                setMessages(prev => [...prev, `🤖 Gemini: ${part.text}`]);
              }
            }
            
            // Legacy queue for handleTurn (but audio won't be reprocessed)
            responseQueueRef.current.push(message);
          },
          onerror: function (e: ErrorEvent) {
            console.error('❌ Live session error:', e);
            setError(`Live session xətası: ${e.message}`);
            setIsConnected(false);
            setIsLoading(false);
          },
          onclose: function (e: CloseEvent) {
            console.error('🔌 Live session closed:', e);
            setIsConnected(false);
            setIsLoading(false);
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
      setIsLoading(false);
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
    }
  }, [apiKey, aylaModelRef]);

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
        audioRecorderRef.current = new SimpleAudioRecorder(16000);
        
        // Use EventEmitter pattern
        audioRecorderRef.current.on('data', (base64Data: string) => {
          if (sessionRef.current) {
            sessionRef.current.sendRealtimeInput({
              audio: {
                data: base64Data,
                mimeType: 'audio/pcm;rate=16000'
              }
            });
          }
        });
        
        // Throttle volume updates to prevent excessive state changes
        let lastVolumeUpdate = 0;
        audioRecorderRef.current.on('volume', (volume: number) => {
          const now = Date.now();
          if (now - lastVolumeUpdate > 200) { // Update every 200ms max
          setMicrophoneLevel(volume);
            lastVolumeUpdate = now;
          }
        });
      }

      await audioRecorderRef.current.start();
      setIsRecording(true);
      setMessages(prev => [...prev, '🎤 Mikrofon başladı, danışa bilərsiniz...']);
      
      if (onRecordingStart) {
        onRecordingStart();
      }
    } catch (error) {
      console.error('Error starting microphone:', error);
      setError(`Mikrofon xətası: ${error instanceof Error ? error.message : 'Naməlum xəta'}`);
    }
  }, [onRecordingStart]);

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
    
    // Clear animation queue and timeouts
    animationQueueRef.current = [];
    isAnimatingRef.current = false;
    currentAnimationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    currentAnimationTimeouts.current = [];
    transitionTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    transitionTimeoutsRef.current = [];
    
    // Reset character to neutral state
    if (aylaModelRef?.current) {
      const neutralTargets = getPhonemeTargets('neutral', currentMorphWeightsRef);
      smoothUpdateMorphTargets(aylaModelRef, transitionTimeoutsRef, currentMorphWeightsRef, neutralTargets, 100);
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setMicrophoneLevel(0);
    setIsAudioPlaying(false);
    responseQueueRef.current = [];
    
    // Clear accumulated text for lipsync
    lastTranscriptionTextRef.current = '';
    
    // Clear and send final word if exists
    if (currentWordRef.current) {
      // Use addToAnimationQueue for final word
      addToAnimationQueueRef.current?.(currentWordRef.current.text, currentWordRef.current.duration);
      currentWordRef.current = null;
    }
    
    // Reset the initial message flag
    initialMessageSentRef.current = false;
  }, [aylaModelRef]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // When connection is established, send the initial greeting prompt
  useEffect(() => {
    if (isConnected && sessionRef.current && !initialMessageSentRef.current) {
      console.log('🚀 Triggering initial AI greeting...');
      sessionRef.current.sendClientContent({
        turns: [{ text: "Salamlıyaraq sorğuya başlayın." }]
      });
      initialMessageSentRef.current = true;
    }
  }, [isConnected]);

  // Initialize audio streamer with AudioContext
  useEffect(() => {
    const initAudio = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
        audioStreamerRef.current = new GeminiAudioStreamer(audioContext);
        
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
          
          // Send final accumulated word if exists
          if (currentWordRef.current) {
            // Use addToAnimationQueue for final word
            addToAnimationQueueRef.current?.(currentWordRef.current.text, currentWordRef.current.duration);
            currentWordRef.current = null;
          }
        };

        audioStreamerRef.current.onLipsyncUpdate = (text, duration) => {
          //console.log('🎙️ Lipsync Update - Adding to queue:', { text, duration });
          if (onLipsyncUpdate) {
            onLipsyncUpdate(text, duration);
          }
          
          // Use addToAnimationQueue to break word into characters
          addToAnimationQueueRef.current?.(text, duration);
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
  }, [onLipsyncUpdate]);

  // Add word to animation queue by breaking it into characters
  const addToAnimationQueue = useCallback((text: string, totalDuration: number) => {
    console.log('📝 Adding word to queue:', { text, totalDuration });

    // Check for greeting keywords
    const greetingKeywords = ['salam', 'hello', 'hi', 'hey', 'greetings'];
    const lowerCaseText = text.toLowerCase();
    if (greetingKeywords.some(keyword => lowerCaseText.includes(keyword))) {
      console.log('👋 Greeting detected in queue! Playing animation...');
      aylaModelRef?.current?.playGreetingAnimation();
    }
    
    const chars = sanitizeText(text);
    if (chars.length === 0) return;
    
    const baseDurationPerChar = Math.min(150, Math.round(totalDuration / chars.length));
    const durationPerChar = Math.max(20, baseDurationPerChar - LIPSYNC_CHAR_DURATION_OFFSET);
    
    // Add each character to queue with its duration
    chars.forEach((char, index) => {
      animationQueueRef.current.push({
        char: char,
        duration: durationPerChar,
        isNeutral: false
      });
    });
    
    console.log('📝 Queue length after adding word:', animationQueueRef.current.length);
    
    // Queue listener will automatically pick up the new items
  }, [aylaModelRef]);

  // Animation queue processor to handle sequential character animations
  const processAnimationQueue = useCallback(() => {
    if (isAnimatingRef.current || animationQueueRef.current.length === 0) {
      return;
    }
    
    isAnimatingRef.current = true;
    const nextAnimation = animationQueueRef.current.shift()!;
    const { char, duration, isNeutral } = nextAnimation;
    
    console.log('🎬 Processing character:', { char, duration, isNeutral });
    
    // Clear any existing timeouts
    currentAnimationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    currentAnimationTimeouts.current = [];
    
    // Apply morph targets for this character
    const morphTargets = getPhonemeTargets(char, currentMorphWeightsRef);
    smoothUpdateMorphTargets(aylaModelRef, transitionTimeoutsRef, currentMorphWeightsRef, morphTargets, 50);
    
    // Schedule next character processing after this duration
    const timeout = setTimeout(() => {
      isAnimatingRef.current = false;
      
      // The queue listener will automatically process the next character
      console.log('🎬 Character animation completed, ready for next');
    }, duration);
    
    currentAnimationTimeouts.current.push(timeout);
  }, [aylaModelRef]);
  
  // Assign the functions to refs in useEffect
  useEffect(() => {
    processAnimationQueueRef.current = processAnimationQueue;
    addToAnimationQueueRef.current = addToAnimationQueue;
  }, [processAnimationQueue, addToAnimationQueue]);

  // Real-time queue listener - monitors queue constantly
  useEffect(() => {
    const queueListener = setInterval(() => {
      // If there are items in queue and we're not currently animating, start processing
      if (animationQueueRef.current.length > 0 && !isAnimatingRef.current) {
        console.log('🎯 Queue listener detected items, starting processing...');
        processAnimationQueueRef.current?.();
      }
    }, 50); // Check every 50ms for real-time responsiveness

    return () => {
      clearInterval(queueListener);
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