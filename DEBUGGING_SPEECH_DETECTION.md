# Speech Detection Debugging Guide

## Problemlərin Həlli

### 1. Console Log-larını İzləyin

#### Əgər şu məlumatları görürsünüzsə, speech detection düzgün işləyir:
```
🎧 Setting up speech detection...
🎧 Speech detection setup complete
🎚️ Volume: 12.5, Speaking: false, AI Playing: false
```

#### Speech detection zamanı gözlənilən log-lar:
```
🎚️ Volume: 45.2, Speaking: false, AI Playing: true
🎤 Speech detected (avg: 45.2, threshold: 25)
🛑 Interrupting AI playback due to user speech
🔇 Stopping audio streamer
🧹 Clearing animation timeouts
😐 Resetting character to neutral
```

### 2. Ümumi Problemlər və Həllər

#### Problem: "AudioContext not available" 
**Həll**: Browser-də mikrofon icazəsi verilməyib
- Chrome Settings → Privacy → Microphone → Allow

#### Problem: Volume həmişə 0 göstərir
**Həll**: 
- Mikrofon işləmir
- Audio context suspend olub
- `navigator.mediaDevices.getUserMedia()` çağırılmayıb

#### Problem: Speech detection çox həssasdır (false positive-lər)
**Həll**: Threshold-u artırın
```typescript
const speechThreshold = 35; // 25-dən artırın
```

#### Problem: Speech detection az həssasdır
**Həll**: Threshold-u azaldın
```typescript
const speechThreshold = 15; // 25-dən azaldın
```

#### Problem: AI audio kəsilmir istifadəçi danışdıqda
**Həllər**:
1. `isAudioPlaying` statusunu yoxlayın console-da
2. `handleSpeechInterruption()` çağırılıb-çağırılmadığını yoxlayın
3. `audioStreamerRef.current.isPlaying` statusunu yoxlayın

### 3. Manual Test Addımları

#### Test 1: Mikrofon Volume Test
1. Proyekti başladın və Gemini Live-a qoşulun
2. Console-da bu log-u axtarın: `🎚️ Volume: X.X, Speaking: false, AI Playing: false`
3. Mikrofona danışın - Volume rəqəmi artmalıdır

#### Test 2: Speech Detection Test  
1. AI-yə sual verin: "Azərbaycan haqqında uzun məlumat ver"
2. AI cavab verməyə başlayanda console-da `AI Playing: true` göründüyünü təsdiqləyin
3. Mikrofona yüksək səslə danışın
4. Bu log-ları gözləyin:
   - `🎤 Speech detected`
   - `🛑 Interrupting AI playback`

#### Test 3: Full Integration Test
1. AI uzun cavab verərkən, siz də danışın
2. AI dərhal susmalıdır
3. Karakter neytral vəziyyətə qayıtmalıdır
4. Animation queue təmizlənməlidir

### 4. Advanced Debugging

#### Audio Context Status Yoxlama
Console-da bu kodu çalışdırın:
```javascript
// Main audio context status  
console.log('Main AudioContext state:', audioContextRef.current?.state);

// Speech detection audio context status
console.log('Speech AudioContext state:', speechDetectionRef.current.audioContext?.state);
```

#### Media Stream Status Yoxlama
```javascript
// Check if stream is active
console.log('Stream active:', audioRecorderRef.current?.stream?.active);
console.log('Audio tracks:', audioRecorderRef.current?.stream?.getAudioTracks());
```

#### Manual Speech Interruption Test
Console-da test etmək üçün:
```javascript
// Force trigger speech interruption
handleSpeechInterruption();
```

### 5. Konfiqurasiya Ayarları

#### Optimal Ayarlar (Normal Mühit):
```typescript
const speechThreshold = 25;
const consecutiveRequired = 3;
const silenceTimeout = 600; // ms
const checkInterval = 50; // ms
```

#### Səs-küylü Mühit üçün:
```typescript
const speechThreshold = 40;
const consecutiveRequired = 5;
const silenceTimeout = 800; // ms
```

#### Həssas Mühit üçün:
```typescript
const speechThreshold = 15;
const consecutiveRequired = 2;
const silenceTimeout = 400; // ms
```

### 6. Browser Compatibility

#### Chrome/Edge: ✅ Tam Dəstək
#### Firefox: ✅ Tam Dəstək  
#### Safari: ⚠️ AudioContext.resume() tələb oluna bilər

Safari üçün əlavə kod:
```typescript
// Safari için audio context resume
if (speechAudioContext.state === 'suspended') {
  await speechAudioContext.resume();
}
```

### 7. Performance Monitoring

#### Memory Leak Yoxlaması:
- Speech detection cleanup-ının düzgün çağırıldığını təsdiqləyin
- Audio context-lərin bağlandığını yoxlayın
- Interval-ların təmizləndiyini təsdiqləyin

#### CPU Usage:
- `checkSpeech` interval-ını çox tez-tez çağırmayın (50ms optimal)
- `analyser.fftSize` çox böyük olmaldır (256 optimal)

Bu debugging guide vasitəsilə speech interruption funksionallığının düzgün işləyib-işləmədiyini müəyyən edə bilərsiniz. 