# Speech Interruption Functionality Guide

## Overview
Bu proyektə istifadəçi səsini real-time izləyən və AI səslənməsini kəsən funksionallıq əlavə edilmişdir. Bu, təbii söhbət təcrübəsi yaradır - istifadəçi danışmağa başladıqda AI susdurulur.

## How It Works

### 1. Speech Detection
- **Real-time monitoring**: Mikrofon səs seviyyəsi hər 50ms-də yoxlanılır
- **Threshold**: 30+ səs seviyyəsi speech kimi qəbul edilir
- **False positive prevention**: Ardıcıl 4 yüksək səs nümunəsi tələb olunur
- **Silence detection**: 800ms səssizlikdən sonra danışıq bitmiş sayılır

### 2. Interruption Mechanism
İstifadəçi danışığı aşkar edildikdə:
- ✅ AI audio playback dayandırılır
- ✅ Animation queue təmizlənir  
- ✅ Bütün timeout-lar ləğv edilir
- ✅ Karakter neytral vəziyyətə qaytarılır

### 3. Technical Implementation
```typescript
// Speech detection setup
const setupSpeechDetection = (stream: MediaStream) => {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.3;
  
  // Real-time volume monitoring
  setInterval(() => {
    analyser.getByteFrequencyData(dataArray);
    const average = calculateAverage(dataArray);
    
    if (average > threshold && isAudioPlaying) {
      handleSpeechInterruption();
    }
  }, 50);
};
```

## Testing Instructions

### 1. Start the Application
```bash
npm start
```

### 2. Connect to Gemini Live
- API key daxil edin
- "Connect to Gemini Live" düyməsinə basın
- Mikrofon icazəsi verin

### 3. Test Speech Interruption
1. **AI-yə sual verin**: "Azərbaycan haqqında uzun bir məlumat ver"
2. **AI cavab verməyə başlayanda**: Siz də danışmağa başlayın
3. **Gözlənilən nəticə**: AI dərhal susacaq və karakter neytral vəziyyətə qayıdacaq

### 4. Debug Information
Console-da bu məlumatları görəcəksiniz:
```
🎚️ Volume: 45.2, Speaking: true, AI Playing: true
🛑 Interrupting AI playback due to user speech
🔇 Stopping audio streamer
🧹 Clearing animation timeouts
😐 Resetting character to neutral
```

## Configuration Options

### Speech Detection Sensitivity
```typescript
const speechThreshold = 30; // Artırın: daha az həssas, Azaldın: daha həssas
const consecutiveRequired = 4; // False positive-ləri azaltmaq üçün
const silenceTimeout = 800; // ms - danışıq bitməsi üçün səssizlik müddəti
```

### Audio Context Settings
```typescript
analyser.fftSize = 256; // Frequency analysis resolution
analyser.smoothingTimeConstant = 0.3; // Volume smoothing
```

## Troubleshooting

### Problem: Speech detection çox həssasdır
**Həll**: `speechThreshold` dəyərini artırın (30 → 40)

### Problem: Speech detection az həssasdır  
**Həll**: `speechThreshold` dəyərini azaldın (30 → 20)

### Problem: Çox false positive-lər
**Həll**: `consecutiveRequired` dəyərini artırın (4 → 6)

### Problem: Gecikmə var
**Həll**: `checkSpeech` interval-ını azaldın (50ms → 30ms)

## Integration with Existing Features

### Lip Sync Integration
- Speech interruption lip sync animation-ları da dayandırır
- Karakter avtomatik neytral vəziyyətə qayıdır
- Animation queue tamamilə təmizlənir

### Audio Streaming Integration  
- `GeminiAudioStreamer.stop()` çağırılır
- Bütün audio buffer-lər təmizlənir
- Playback status `false` olur

### Character Animation Integration
- Morph target-lər neytral vəziyyətə qayıdır
- Bütün animation timeout-ları ləğv edilir
- Queue-based animation sistemi sıfırlanır

## Future Enhancements

1. **Adaptive Threshold**: İstifadəçinin səs seviyyəsinə görə avtomatik threshold ayarı
2. **Voice Activity Detection**: Daha sophisticated VAD alqoritmləri
3. **Speaker Recognition**: Müxtəlif danışanları fərqləndirmək
4. **Noise Cancellation**: Arxa plan səslərini filtrlə

## Code Structure

### Main Components
- `GeminiLiveAudio.tsx`: Əsas komponent, speech detection logic
- `audioUtils.ts`: SimpleAudioRecorder, MediaStream access
- Speech detection refs və callback-lər

### Key Functions
- `setupSpeechDetection()`: Speech monitoring başladır
- `handleSpeechInterruption()`: Interruption prosesini idarə edir  
- `cleanupSpeechDetection()`: Cleanup və memory management

Bu funksionallıq istifadəçi təcrübəsini əhəmiyyətli dərəcədə yaxşılaşdırır və təbii söhbət hissi yaradır. 