# Gemini Live API Built-in Interruption Mexanizmi

## Məsələnin Analizi

Referans proyektdə (`/Users/irkanahmadov/Desktop/Cursor/branch-assistant-3d-gemini-vosk-2`) speech interruption mexanizmi **Gemini Live API-nin built-in interruption** funksiyasına əsaslanır, bizim əvvəlki cəhdlərimizdə olduğu kimi manual volume monitoring və ya Web Speech API-yə deyil.

## Referans Proyektdən Öyrəndiklərimiz

### 1. MultimodalLiveClient Strukturu
```typescript
client.on("interrupted", stopAudioStreamer)
```

### 2. İnterruption Detection
```typescript
if (isInterrupted(serverContent)) {
  this.log("receive.serverContent", "interrupted");
  this.emit("interrupted");
  return;
}
```

### 3. İnterruption Type Definition
```typescript
export type Interrupted = { interrupted: true };

export const isInterrupted = (a: any): a is Interrupted =>
  (a as Interrupted).interrupted;
```

## Bizim İmplementasiyamız

### 1. Gemini Session Configuration
```typescript
const config = {
  responseModalities: [Modality.AUDIO],
  mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
  speechConfig: {
    language_code: 'az-AZ', // Azerbaijani language - VACIB!
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: 'Aoede',
      }
    }
  },
  outputAudioTranscription: {
    enable: true
  },
  // ... digər konfiqurasiyalar
};
```

### 2. Mikrofon Audio-sunun Session-a Göndərilməsi
```typescript
// SimpleAudioRecorder vasitəsilə mikrofon audio-su real-time olaraq Gemini-yə göndərilir
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
```

### 3. Built-in Interruption Handling
```typescript
onmessage: function (message: LiveServerMessage) {
  // İlk növbədə interruption yoxla
  if (message.serverContent?.interrupted) {
    console.log('⚡ Audio interrupted by user speech');
    
    // Audio playback-i dərhal dayandır
    if (audioStreamerRef.current) {
      audioStreamerRef.current.stop();
    }
    setIsAudioPlaying(false);
    
    // Karakter animasiyasını neutral vəziyyətə qaytar
    if (aylaModelRef?.current) {
      const neutralTargets = getPhonemeTargets('neutral');
      aylaModelRef.current.updateMorphTargets(neutralTargets);
    }
    
    // Animasiya queue-nu təmizlə
    animationQueueRef.current = [];
    isAnimatingRef.current = false;
    currentAnimationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    currentAnimationTimeouts.current = [];
    
    return; // Digər content-i process etmə
  }
  
  // Digər content handling...
}
```

## Necə İşləyir?

### 1. Real-time Audio Streaming
- İstifadəçi mikrofondan danışır
- `SimpleAudioRecorder` audio-nu PCM16 formatında capture edir
- Audio data real-time olaraq `session.sendRealtimeInput()` ilə Gemini-yə göndərilir

### 2. Gemini-nin Built-in Speech Detection
- Gemini Live API mikrofondan gələn audio-nu analiz edir
- İstifadəçi danışdığını aşkar etdikdə, avtomatik olaraq `interrupted: true` mesajı göndərir
- Bu, Gemini-nin öz speech recognition və voice activity detection mexanizmləridir

### 3. Automatic Interruption Response
- `message.serverContent?.interrupted` true olduqda:
  - AI audio playback dərhal dayandırılır
  - Karakter animasiyası neutral vəziyyətə qayıdır
  - Bütün animation queue təmizlənir
  - İstifadəçi danışmağa davam edə bilər

### 4. Conversation Flow
- İstifadəçi danışmağı bitirdikdə, Gemini avtomatik olaraq cavab verir
- Yeni audio response başlayır
- Lipsync və karakter animasiyası yenidən aktivləşir

## Əvvəlki Yanlış Yanaşmalarımız

### ❌ Volume-based Detection
```typescript
// Bu yanaşma səhv idi
const analyser = audioContext.createAnalyser();
const dataArray = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(dataArray);
const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
```

### ❌ Manual Web Speech API
```typescript
// Bu da lazım deyildi
const recognition = new webkitSpeechRecognition();
recognition.onresult = (event) => {
  // Manual interruption logic
};
```

## Düzgün Yanaşma

### ✅ Gemini Built-in Interruption
- Gemini Live API-nin öz speech detection mexanizmini istifadə et
- Mikrofon audio-sunu real-time olaraq session-a göndər
- `serverContent.interrupted` mesajını handle et
- Manual speech recognition və ya volume monitoring lazım deyil

## Faydaları

1. **Daha Dəqiq**: Gemini-nin professional speech detection
2. **Daha Sürətli**: Built-in mexanizm daha az latency
3. **Daha Etibarlı**: Google-un optimize edilmiş algoritmi
4. **Daha Sadə**: Manual implementation lazım deyil
5. **Daha Yaxşı Integration**: Gemini conversation flow ilə tam uyğun

## Test Etmək Üçün

1. Proyekti işə sal: `npm start`
2. Gemini Live API-yə qoşul
3. Mikrofonunu aç
4. AI danışarkən öz səsini eşit - audio dərhal kəsilməlidir
5. Danışmağı bitir - AI yeni cavab verməlidir

## Nəticə

Bu implementasiya referans proyektdəki kimi **real conversational AI experience** yaradır, burada istifadəçi AI-ı istənilən vaxt kəsə bilər və təbii söhbət axını davam edir. 