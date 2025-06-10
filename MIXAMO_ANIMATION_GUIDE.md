# Mixamo Animation Integration Guide

## Ümumi Baxış

Bu guide Mixamo-dan yüklənmiş FBX animasiyalarını bizim Ayla GLB karakterində necə istifadə edəcəyinizi göstərir. Bone mapping, animation loading və karakterə tətbiq etmə proseslərini əhatə edir.

## Yaratdığımız Sistemin Strukturu

### 1. MixamoAnimationLoader Class
**Fayl**: `src/utils/mixamoAnimation.ts`

Mixamo FBX animasiyalarını yükləyib Ayla karakteri üçün uyğun formata çevirən əsas class.

### 2. Bone Mapping System
Mixamo skeleton bone adlarını Ayla character bone adlarına map edir:

```typescript
const MIXAMO_TO_AYLA_BONE_MAP = {
  // Bədən
  'mixamorigHips': 'CC_Base_Hip',
  'mixamorigSpine': 'CC_Base_Waist',
  'mixamorigSpine1': 'CC_Base_Spine01',
  'mixamorigSpine2': 'CC_Base_Spine02',
  'mixamorigNeck': 'CC_Base_NeckTwist01',
  'mixamorigHead': 'CC_Base_Head',
  
  // Sol qol
  'mixamorigLeftShoulder': 'CC_Base_L_Clavicle',
  'mixamorigLeftArm': 'CC_Base_L_Upperarm',
  'mixamorigLeftForeArm': 'CC_Base_L_Forearm',
  'mixamorigLeftHand': 'CC_Base_L_Hand',
  
  // Sağ qol
  'mixamorigRightShoulder': 'CC_Base_R_Clavicle',
  'mixamorigRightArm': 'CC_Base_R_Upperarm',
  'mixamorigRightForeArm': 'CC_Base_R_Forearm',
  'mixamorigRightHand': 'CC_Base_R_Hand',
  
  // Sol ayaq
  'mixamorigLeftUpLeg': 'CC_Base_L_Thigh',
  'mixamorigLeftLeg': 'CC_Base_L_Calf',
  'mixamorigLeftFoot': 'CC_Base_L_Foot',
  
  // Sağ ayaq
  'mixamorigRightUpLeg': 'CC_Base_R_Thigh',
  'mixamorigRightLeg': 'CC_Base_R_Calf',
  'mixamorigRightFoot': 'CC_Base_R_Foot',
  
  // Barmaqlar (hər iki əl üçün)
  // ... və s.
};
```

### 3. Animation Functions

#### loadAndPlayGreeting()
Greeting animasiyasını yükləyib oynadır:
```typescript
await loadAndPlayGreeting(animationMixer, onComplete);
```

#### applyMixamoGreetingAnimation()
Yüklənmiş animasiyanı mixer-ə tətbiq edir:
```typescript
await applyMixamoGreetingAnimation(mixer, greetingClip, onComplete);
```

## Ayla Karakterində Integration

### 1. AylaModelRef Interface Genişləndirildi
```typescript
export interface AylaModelRef {
  updateMorphTargets: (targets: MorphTargetData[]) => void;
  playGreetingAnimation: () => Promise<void>; // YENİ!
}
```

### 2. Avtomatik Greeting Animation
Karakter load olduqdan 5 saniyə sonra avtomatik greeting animasiyası oynadılır:

```typescript
useEffect(() => {
  // Greeting animasiyasını avtomatik oynat (5 saniyə gecikmə ilə)
  const greetingTimeout = setTimeout(async () => {
    if (mixer) {
      await loadAndPlayGreeting(mixer, () => {
        console.log('🎭 Initial greeting animation completed');
      });
    }
  }, 5000);
  
  return () => clearTimeout(greetingTimeout);
}, [actions, mixer]);
```

### 3. Manual Greeting Animation
Komponenti istifadə edərkən manual olaraq da çağıra bilərsiniz:

```typescript
const aylaRef = useRef<AylaModelRef>(null);

// Manual greeting
const playGreeting = async () => {
  if (aylaRef.current) {
    await aylaRef.current.playGreetingAnimation();
  }
};
```

## Necə İşləyir

### 1. FBX Loading Process
```
greeting.fbx → FBXLoader → 
Animation Clips → Bone Mapping → 
Converted Animation → AnimationMixer → 
Ayla Character
```

### 2. Bone Mapping Process
1. **FBX Track Parse**: `mixamorigLeftArm.quaternion`
2. **Bone Name Extract**: `mixamorigLeftArm`
3. **Ayla Mapping**: `CC_Base_L_Upperarm`
4. **New Track Create**: `CC_Base_L_Upperarm.quaternion`

### 3. Animation Application
1. **AnimationClip yaradılır** converted tracks ilə
2. **AnimationAction yaradılır** mixer-də
3. **LoopOnce** konfiqurasiyası
4. **Play edilir** və completion listener qoşulur

## Debug və Troubleshooting

### Console Logları
Düzgün işləyəndə bu logları görməlisiniz:

```
🎭 Loading Mixamo animation from: /model/greeting.fbx
🎭 FBX object loaded: Group {...}
🎭 Found animations: 1
🎭 Original animation duration: 3.2
🎭 Original tracks count: 157
🦴 Processing track: mixamorigHips.position
🦴 Converted: mixamorigHips -> CC_Base_Hip
🎭 Total converted tracks: 89
🎭 Converted animation: {...}
🎭 Greeting animation loaded successfully
🎭 Applying greeting animation...
🎭 Greeting animation started
🎭 Greeting animation completed
```

### Mövcud Problemlər və Həlləri

#### 1. "No animations found in FBX file"
**Səbəb**: FBX faylında animation data yoxdur
**Həll**: Mixamo-dan yenidən yükləyin, "In Place" seçimini yoxlayın

#### 2. "No mapping found for bone: [boneName]"
**Səbəb**: Yeni bone adı mapping-də yoxdur
**Həll**: `MIXAMO_TO_AYLA_BONE_MAP`-ə yeni mapping əlavə edin

#### 3. Animation oynanmır
**Səbəb**: AnimationMixer məsələsi
**Həll**: `useFrame`-də mixer.update() olduğundan əmin olun

## Yeni Mixamo Animasiyalarının Əlavə Edilməsi

### 1. FBX Faylının Hazırlanması
1. Mixamo-dan animation yükləyin
2. Character: **Y-Bot** (həmişə)
3. Format: **FBX Binary (.fbx)**
4. Skin: **Without Skin** (tez-tez daha yaxşı işləyir)
5. `public/model/` folderinə qoyun

### 2. Yeni Animasiya Funksiyası
```typescript
export async function loadAndPlayCustomAnimation(
  animationMixer: THREE.AnimationMixer,
  fbxPath: string,
  onComplete?: () => void
): Promise<THREE.AnimationAction | null> {
  const loader = new MixamoAnimationLoader();
  
  const result = await loader.loadMixamoAnimation(fbxPath);
  if (!result.success) return null;
  
  return await applyMixamoGreetingAnimation(
    animationMixer,
    result.animationClip,
    onComplete
  );
}
```

### 3. Component-də İstifadə
```typescript
// Yeni animation oynamaq
await loadAndPlayCustomAnimation(mixer, '/model/wave.fbx', () => {
  console.log('Wave animation completed');
});
```

## Test Etmək

1. **Proyekti başladın**: `npm start`
2. **5 saniyə gözləyin**: Avtomatik greeting başlamalıdır
3. **Console logları yoxlayın**: Debug məlumatları görün
4. **Manual test**: `aylaRef.current.playGreetingAnimation()` çağırın

## Fayl Strukturu

```
src/
├── utils/
│   └── mixamoAnimation.ts      # Animation utility
├── components/
│   └── character/
│       └── Ayla.tsx           # Character component
public/
└── model/
    ├── greeting.fbx           # Mixamo greeting animation
    ├── ayla.glb              # Character model
    └── motion.glb            # Basic motions
```

## Sonuç

Bu sistem sizə istənilən Mixamo animasiyasını Ayla karakterində istifadə etmək imkanı verir. Bone mapping sistem avtomatik olaraq Mixamo skeleton-ını Ayla skeleton-ına çevirir və animasiyalar düzgün oynadılır.

Yeni animasiyalar əlavə etmək üçün sadəcə FBX faylını `public/model/` folderinə əlavə edin və müvafiq funksiya çağırısı ilə istifadə edin! 🎭 