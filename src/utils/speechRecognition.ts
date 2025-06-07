// Web Speech API wrapper for real speech recognition

// TypeScript type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const SpeechRecognition: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any  
declare const webkitSpeechRecognition: any;

export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening = false;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private onTranscript?: (text: string, isFinal: boolean) => void;
  private onError?: (error: string) => void;
  
  constructor() {
    // Check if Web Speech API is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    } else {
      console.warn('Web Speech API not supported in this browser');
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    // Configure recognition settings
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'az-AZ'; // Azerbaijani language
    this.recognition.maxAlternatives = 1;

    // Event handlers
    this.recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          console.log('🎯 Final transcript:', transcript);
          if (this.onTranscript) {
            this.onTranscript(transcript, true);
          }
        } else {
          interimTranscript += transcript;
          console.log('📝 Interim transcript:', transcript);
          if (this.onTranscript) {
            this.onTranscript(transcript, false);
          }
        }
      }

      // Trigger speech start on first interim result
      if (interimTranscript && this.onSpeechStart) {
        this.onSpeechStart();
      }
    };

    this.recognition.onspeechstart = () => {
      console.log('🗣️ Speech detected');
      if (this.onSpeechStart) {
        this.onSpeechStart();
      }
    };

    this.recognition.onspeechend = () => {
      console.log('🤫 Speech ended');
      if (this.onSpeechEnd) {
        this.onSpeechEnd();
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      if (this.onError) {
        this.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      console.log('🔚 Speech recognition ended');
      this.isListening = false;
      
      // Auto-restart if we're supposed to be listening
      if (this.isListening) {
        console.log('🔄 Auto-restarting speech recognition');
        setTimeout(() => {
          this.start();
        }, 100);
      }
    };
  }

  public start() {
    if (!this.recognition) {
      console.warn('⚠️ Speech recognition not supported');
      return;
    }

    if (this.isListening) {
      console.log('🎤 Speech recognition already listening');
      return;
    }

    try {
      this.recognition.start();
      console.log('🎤 Starting speech recognition...');
    } catch (error) {
      console.error('❌ Failed to start speech recognition:', error);
      if (this.onError) {
        this.onError('Failed to start speech recognition');
      }
    }
  }

  public stop() {
    if (!this.recognition || !this.isListening) {
      return;
    }

    this.isListening = false;
    this.recognition.stop();
    console.log('🛑 Stopping speech recognition');
  }

  public setCallbacks({
    onSpeechStart,
    onSpeechEnd,
    onTranscript,
    onError
  }: {
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onTranscript?: (text: string, isFinal: boolean) => void;
    onError?: (error: string) => void;
  }) {
    this.onSpeechStart = onSpeechStart;
    this.onSpeechEnd = onSpeechEnd;
    this.onTranscript = onTranscript;
    this.onError = onError;
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
} 