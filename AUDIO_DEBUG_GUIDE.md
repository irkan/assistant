# Audio Playback Problem After Interruption - Debug Guide

## Problemin Təsviri

İlk sualın cavabı səslə eşidilir, amma ikinci sualdan sonra audio gəlir (lipsync işləyir) amma actual audio eşidilmir.

## Potensial Səbəblər və Həllər

### 1. AudioContext Suspend Problemi

**Səbəb**: Browser autoplay policy səbəbindən AudioContext suspend olur.

**Debug**:
```javascript
console.log('🎵 AudioContext state:', this.context.state);
```

**Həll**:
```javascript
// addPCM16 metodunda əlavə etdik
if (this.context.state === 'suspended') {
  console.log('🎵 Resuming suspended AudioContext');
  this.context.resume();
}
```

### 2. GainNode Connection Problemi

**Səbəb**: Interruption zamanı GainNode disconnect olur.

**Debug**:
```javascript
console.log('🎵 GainNode outputs:', this.gainNode.numberOfOutputs);
console.log('🎵 GainNode volume:', this.gainNode.gain.value);
```

**Həll**:
```javascript
// stop() metodunda əlavə etdik
if (this.gainNode.numberOfOutputs === 0) {
  console.log('🔄 Reconnecting GainNode');
  this.gainNode.connect(this.context.destination);
}
this.gainNode.gain.value = 1.0;
```

### 3. Audio Source Cleanup Problemi

**Səbəb**: Köhnə audio sources düzgün stop edilmir.

**Debug**:
```javascript
console.log('🛑 Stopping active audio source');
```

**Həll**:
```javascript
// stop() metodunda əlavə etdik
if (this.endOfQueueAudioSource) {
  try {
    this.endOfQueueAudioSource.stop();
    this.endOfQueueAudioSource.disconnect();
  } catch (e) {
    console.log('🛑 Audio source already stopped');
  }
  this.endOfQueueAudioSource = null;
}
```

### 4. Stream Complete Flag Problemi

**Səbəb**: `isStreamComplete` flag reset olmur.

**Həll**:
```javascript
// stop() metodunda əlavə etdik
setTimeout(() => {
  this.isStreamComplete = false;
  console.log('🔄 Audio streamer reset for next playback');
}, 100);
```

## Debug Konsol Logları

Doğru işləyəndə görməli olduğunuz loglar:

### İlk Audio Playback:
```
🎵 Starting audio playback...
🎵 AudioContext state: running
🎵 GainNode volume: 1
🎵 GainNode outputs: 1
🎵 Audio queue length: 1
🎵 Starting audio source at time: X duration: Y
```

### Interruption Zamanı:
```
⚡ Audio interrupted by user speech
🛑 Stopped active audio source
🔄 Audio streamer reset for next playback, volume: 1
```

### İkinci Audio Playback (problemi olsa):
```
🎵 Starting audio playback...
🎵 AudioContext state: suspended  ← PROBLEM!
🎵 Resuming suspended AudioContext
🎵 GainNode volume: 1
🎵 GainNode outputs: 0  ← PROBLEM!
🔄 Reconnecting GainNode
```

## Manual Test Addımları

### 1. Browser Developer Tools Açın
- F12 basın
- Console tab-ına gedin
- Network tab-ında audio requestləri yoxlayın

### 2. Audio Test Edin
```javascript
// Browser console-da test edin
const ctx = new AudioContext();
console.log('AudioContext state:', ctx.state);
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);
osc.frequency.setValueAtTime(440, ctx.currentTime);
osc.start();
osc.stop(ctx.currentTime + 1);
```

### 3. Test Addımları
1. İlk sual verin və cavabı dinləyin ✅
2. AI cavab verərkən kəsin (interruption) 🛑
3. İkinci sual verin
4. Cavab gəlir amma səs eşidilmir? ❌

## Mövcud Debug Console Logları

Proyektdə artıq bu loglar əlavə edilib:

```javascript
// Audio başlayarkən
console.log('🎵 Starting audio playback...');
console.log('🎵 AudioContext state:', this.context.state);
console.log('🎵 GainNode volume:', this.gainNode.gain.value);

// Interruption zamanı
console.log('⚡ Audio interrupted by user speech');

// Audio source yaradarkən
console.log('🎵 Starting audio source at time:', startTime, 'duration:', audioBuffer.duration);

// Reset zamanı
console.log('🔄 Audio streamer reset for next playback, volume:', this.gainNode.gain.value);
```

## Əlavə Təhlil

Əgər problem davam edərsə, bu mümkün səbəblər ola bilər:

### 1. Base64 Decode Problemi
```javascript
// Bu hissəni yoxla
const binaryString = atob(base64Data);
const bytes = new Uint8Array(binaryString.length);
```

### 2. PCM16 Conversion Problemi
```javascript
// Bu hissəni yoxla
const int16 = dataView.getInt16(i * 2, true);
float32Array[i] = int16 / 32768;
```

### 3. Buffer Size Problemi
```javascript
// Buffer size-ları yoxla
console.log('Buffer size:', this.bufferSize);
console.log('Processing buffer length:', this.processingBuffer.length);
```

## Browser Compatibility

- **Chrome/Edge**: Tam dəstək
- **Firefox**: Autoplay policy fərqli ola bilər
- **Safari**: AudioContext-lə məlum problemlər

## Nəticə

Bu debug dəyişiklikləri ilə audio playback problem-i həll olmalıdır. Əgər problem davam edərsə, browser console-da logları yoxlayın və hansı debug məlumatlarının gözlənildiyindən fərqli olduğunu müəyyən edin. 