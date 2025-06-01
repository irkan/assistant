# assistant
3D Character live voice chat assistant


# 🎤 Gemini Live Audio Chat

Bu proyekt Google Gemini AI ilə real-time audio söhbət aplikasiyanıdır. Gemini 2.5 Flash modelinin Live Audio funksionallığını istifadə edərək, istifadəçilər həm mətn, həm də **canlı mikrofon səsi** göndərib **birbaşa audio cavab** ala bilərlər.

## 🚀 Yeni Xüsusiyyətlər

- **🎤 Canlı Mikrofon Dəstəyi**: Mikrofondan real-time səs qəbul etmə
- **🔊 Birbaşa Audio Səsləndirmə**: Gələn audio buffer-ləri browser-də avtomatik səsləndirmə
- **📊 Real-time Mikrofon Səviyyəsi**: Volume meter ilə səs səviyyəsini izləmə
- **🎯 Modern Audio Processing**: Yüksək keyfiyyətli audio işləmə
- **⚡ Sürətli Audio Streaming**: Minimum gecikmə ilə real-time audio

## 🎯 Əsas Funksionallıqlar

- **Real-time Audio Chat**: Gemini AI ilə canlı audio söhbət
- **Mikrofon Girişi**: Mətnin əvəzinə birbaşa danışa bilərsiniz
- **Avtomatik Audio Playback**: AI cavabları avtomatik səslənir
- **Responsive Design**: Mobil və desktop cihazlar üçün optimizasiya edilmiş
- **Modern UI/UX**: Gözəl və istifadəçi dostu interfeys
- **Real-time Status**: Bağlantı və audio statusunu real-time izləyin

## 📋 Tələblər

- Node.js (v18 və ya daha yeni)
- NPM və ya Yarn
- **Mikrofon icazəsi** (audio girişi üçün)
- Google Gemini API açarı ([Google AI Studio](https://aistudio.google.com/)-dan əldə edə bilərsiniz)

## 🛠️ Quraşdırma

1. **Repositoriya klonlayın və direktoriyaya daxil olun:**
   ```bash
   cd gemini-live-audio
   ```

2. **Dependencies quraşdırın:**
   ```bash
   npm install
   ```

3. **API açarınızı .env faylında təyin edin:**
   `.env` faylı artıq mövcuddur və API açarı əlavə edilib.

4. **Applikasiyanı işə salın:**
   ```bash
   npm start
   ```

5. **Browser-də açın:**
   Applikasiya avtomatik olaraq [http://localhost:3000](http://localhost:3000) ünvanında açılacaq.

## 💻 İstifadə

### 🎤 Audio Söhbət:
1. **Bağlantı yaradın**: "Gemini-yə Qoşul" düyməsinə klik edin
2. **Mikrofonu başladın**: "Mikrofonu Başlat" düyməsinə basın
3. **Danışın**: Mikrofonla birbaşa AI-yə danışın
4. **Dinləyin**: AI-nin cavabları avtomatik səslənəcək

### 📝 Mətn Söhbət:
1. **Bağlantı yaradın**: "Gemini-yə Qoşul" düyməsinə klik edin
2. **Mesaj yazın**: Input sahəsinə mesajınızı yazın
3. **Göndərin**: Enter düyməsinə basın və ya "Göndər" düyməsinə klik edin
4. **Dinləyin**: AI-nin cavabları həm mətn, həm audio formatında göstəriləcək

## 🔧 Texniki Təfərrüatlar

### İstifadə olunan texnologiyalar:
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Google GenAI SDK** - Gemini AI inteqrasiyası
- **Web Audio API** - Modern browser audio processing
- **MediaDevices API** - Mikrofon girişi
- **CSS3** - Modern styling və animasiyalar

### Audio Sistemləri:
- **AudioRecorder**: Real-time mikrofon qeydiyyatı
- **AudioStreamer**: Yüksək keyfiyyətli audio streaming
- **PCM16 Format**: Optimal audio keyfiyyəti
- **Real-time Processing**: Minimum gecikməli audio işləmə

### Proyekt strukturu:
```
src/
├── components/
│   └── GeminiLiveAudio.tsx    # Əsas komponent
├── utils/
│   └── audioUtils.ts          # Modern audio utility funksiyaları
│       ├── AudioRecorder      # Mikrofon qeydiyyatı
│       └── AudioStreamer      # Audio səsləndirmə
├── App.tsx                    # Əsas App komponenti
├── App.css                    # Modern stillər
└── index.tsx                  # Entry point
```

## 🎯 Gemini Live API Xüsusiyyətləri

Bu proyekt aşağıdaki Gemini Live API xüsusiyyətlərini istifadə edir:

- **Model**: `gemini-2.5-flash-preview-native-audio-dialog`
- **Input Modality**: Audio + Text
- **Response Modality**: Audio
- **Voice**: Zephyr
- **Audio Format**: PCM16, 16kHz (input), 24kHz (output)
- **Media Resolution**: Medium
- **Context Window Compression**: Optimized for long conversations

## 🔐 Browser İcazələri

⚠️ **Mikrofon İcazəsi**: Applikasiya mikrofonunuza giriş üçün icazə istəyəcək. Bu, canlı səs söhbəti üçün lazımdır.

✅ **Avtomatik Audio**: Gələn audio avtomatik səslənəcək - heç bir əlavə icazə lazım deyil.

## 🛠️ Mövcud Skriptlər

Proyekt direktoriyasında aşağıdaki əmrləri işlədə bilərsiniz:

- `npm start` - Development server işə salır
- `npm run build` - Production üçün build yaradır
- `npm test` - Test runner işə salır
- `npm run eject` - CRA konfigurasyonunu expose edir (geri dönməz!)

## 🎨 Fərdiləşdirmə

### Audio keyfiyyəti:
```typescript
// AudioRecorder sample rate (mikrofondan)
new AudioRecorder(16000); // 16kHz

// AudioStreamer sample rate (AI səsləndirmə)
new AudioStreamer(24000); // 24kHz
```

### Voice seçmək:
```typescript
speechConfig: {
  voiceConfig: {
    prebuiltVoiceConfig: {
      voiceName: 'Zephyr', // Başqa voice seçə bilərsiniz
    }
  }
}
```

### Volume səviyyəsi:
```typescript
audioStreamer.setVolume(0.8); // 0.0 - 1.0 arası
```

## 🐛 Problem Həlli

### Mikrofon xətaları:
- Browser icazələrini yoxlayın
- HTTPS bağlantı istifadə edin (HTTP-də mikrofon işləmir)
- Mikrofon fiziki olaraq qoşulu olduğunu yoxlayın

### Audio səsləndirmə problemləri:
- Audio context-in aktiv olduğunu yoxlayın
- Browser-də audio autoplay setting-lərini yoxlayın
- Speaker/headphone qoşulu olduğunu yoxlayın

### Gemini API xətaları:
- API açarınızın düzgün olduğunu yoxlayın
- Internet bağlantınızı yoxlayın
- Gemini API limitlərinizi yoxlayın

## 📚 Əlavə Mənbələr

- [Google GenAI SDK Documentation](https://googleapis.github.io/js-genai/)
- [Gemini Live API Guide](https://github.com/googleapis/js-genai)
- [Google AI Studio](https://aistudio.google.com/)
- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaDevices API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices)

## 📄 Lisenziya

Bu proyekt MIT lisenziyası altında paylaşılır.

## 🤝 Töhfə

Pull request və issue-lar məmnuniyyətlə qarşılanır!

---

**🎉 Gemini AI ilə real-time audio söhbətə başlayın! 🎤🔊**
