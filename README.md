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

# Gemini Live Audio with 3D Character

Bu proyekt Google Gemini Live Audio API-ni Three.js 3D karakteri ilə birləşdirən interaktiv bir tətbiqdir. Ayla adlı 3D karakter səslə ünsiyyət qura bilir və real vaxtda cavab verir.

## Xüsusiyyətlər

- 🎭 **3D Karakter**: Ayla adlı animasiyalı 3D karakter
- 🎤 **Səs Tanıma**: Real vaxtda səs tanıma və emal
- 🔊 **Səs Sintezi**: Gemini-dən gələn cavabların səsləndirilməsi
- 👁️ **Göz Qırpma**: Təbii göz qırpma animasiyası
- 🎮 **İnteraktiv İdarəetmə**: Start/Stop və səs açma/bağlama düymələri
- 🌅 **Gözəl Mühit**: Sunset mühiti və background şəkli

## Quraşdırma

1. **Layihəni klonlayın:**
```bash
git clone <repository-url>
cd assistant
```

2. **Dependencies yükləyin:**
```bash
npm install --legacy-peer-deps
```

3. **Environment dəyişənlərini təyin edin:**
`.env` faylı yaradın və Google Gemini API açarınızı əlavə edin:
```
REACT_APP_GOOGLE_API_KEY=your_gemini_api_key_here
```

4. **Tətbiqi başladın:**
```bash
npm start
```

Tətbiq `http://localhost:3000` ünvanında açılacaq.

## İstifadə

1. **Start düyməsini basın** - Gemini Live Audio-ya qoşulmaq üçün
2. **Mikrofon düyməsi** - Səsi açmaq/bağlamaq üçün
3. **3D Karakter** - Mouse ilə kameranı idarə edə bilərsiniz (OrbitControls)
4. **Danışın** - Karakterlə səsli ünsiyyət qurun

## Texniki Detallar

### İstifadə olunan Texnologiyalar

- **React 18** - UI framework
- **Three.js** - 3D qrafika
- **@react-three/fiber** - React üçün Three.js
- **@react-three/drei** - Three.js helpers
- **Google Gemini API** - AI və səs emalı
- **TypeScript** - Type safety
- **SCSS** - Styling

### 3D Model

- **Karakter**: Ayla (CC_Base_Body sistemi)
- **Animasiyalar**: Idle animasiyalar və göz qırpma
- **Morph Targets**: Üz ifadələri üçün hazır
- **Format**: GLTF/GLB

### Səs Sistemi

- **Input**: Real vaxtda mikrofon girişi
- **Output**: PCM16 formatında səs çıxışı
- **Streaming**: AudioContext əsaslı real vaxtda streaming
- **Codec**: 24kHz sample rate

## Faylların Strukturu

```
src/
├── components/
│   ├── character/
│   │   └── Ayla.tsx          # 3D karakter komponenti
│   ├── scene/
│   │   ├── Scene.tsx         # 3D səhnə
│   │   └── Scene.css         # Səhnə stilləri
│   ├── control-tray/
│   │   ├── ControlTray.tsx   # İdarəetmə paneli
│   │   └── control-tray.scss # Panel stilləri
│   └── GeminiLiveAudio.tsx   # Gemini API inteqrasiyası
├── utils/
│   └── audioUtils.ts         # Səs utility funksiyaları
└── App.tsx                   # Əsas tətbiq komponenti

public/
├── model/
│   ├── ayla.glb             # 3D karakter modeli
│   └── motion.glb           # Animasiya faylı
└── background.jpg           # Arxa plan şəkli
```

## API Açarı Əldə Etmək

1. [Google AI Studio](https://aistudio.google.com/) saytına daxil olun
2. API açarı yaradın
3. Gemini Live Audio API-ni aktivləşdirin
4. Açarı `.env` faylına əlavə edin

## Problemlərin Həlli

### Model yüklənmir
- `public/model/` qovluğunda `ayla.glb` və `motion.glb` fayllarının olduğunu yoxlayın
- Browser console-da xətaları yoxlayın

### Səs işləmir
- Mikrofon icazəsi verildiyini yoxlayın
- HTTPS üzərində işlədiyinizi təmin edin (localhost istisna)
- Audio context-in aktivləşdiyini yoxlayın

### API xətaları
- API açarının düzgün təyin edildiyini yoxlayın
- İnternet bağlantısını yoxlayın
- Gemini API limitlərini yoxlayın

## Töhfə Vermək

1. Fork edin
2. Feature branch yaradın (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## Lisenziya

Bu proyekt MIT lisenziyası altındadır.

## Təşəkkürlər

- Google Gemini API komandası
- Three.js icması
- React Three Fiber komandası
- Ayla 3D model yaradıcıları
