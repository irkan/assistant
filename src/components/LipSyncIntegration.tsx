import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { AylaModelRef, MorphTargetData } from './character/Ayla';

export interface LipSyncRef {
  speakText: (text: string, options?: { language?: string; voice?: string; mood?: string }) => void;
  stopSpeaking: () => void;
}

interface PhonemeItem {
  phoneme: string;
  duration: number;
  weight: number;
}

interface LipSyncIntegrationProps {
  characterRef: React.RefObject<AylaModelRef>;
}

const LipSyncIntegration = forwardRef<LipSyncRef, LipSyncIntegrationProps>(
  ({ characterRef }, ref) => {
    const animationFrameId = useRef<number | null>(null);
    const isPlaying = useRef<boolean>(false);
    const phonemeQueue = useRef<PhonemeItem[]>([]);
    const currentPhonemeIndex = useRef<number>(0);
    const startTime = useRef<number>(0);
    const lastPhoneme = useRef<string>('_');

    // Text-i fonemələrə çevirmək
    const textToPhonemes = (text: string): PhonemeItem[] => {
      const phonemes: PhonemeItem[] = [];
      const words = text.toLowerCase().split(' ');
      
      words.forEach((word, wordIndex) => {
        // Hər kəlmədən əvvəl (birinci deyilsə) kiçik fasilə
        if (wordIndex > 0) {
          phonemes.push({ phoneme: '_', duration: 150, weight: 0 });
        }
        
        // Kəlməni hərflərə böl və fonemləri topla
        const chars = word.split('');
        chars.forEach(char => {
          const phonemeData = getPhonemeFromChar(char);
          if (phonemeData) {
            phonemes.push({
              phoneme: char,
              duration: 120, // ~8 hərfə saniyə
              weight: phonemeData.weight
            });
          }
        });
      });
      
      // Sonda ağızı bağlamaq üçün
      phonemes.push({ phoneme: '_', duration: 300, weight: 0 });
      
      return phonemes;
    };

    // Hərfdən fonem məlumatı almaq
    const getPhonemeFromChar = (char: string): { weight: number } | null => {
      const vowels = ['a', 'ə', 'e', 'i', 'ı', 'o', 'ö', 'u', 'ü'];
      const consonants = ['m', 'b', 'p', 'v', 'f'];
      
      if (vowels.includes(char)) {
        return { weight: 0.4 }; // Saitlər üçün ağız açıqlığı
      } else if (consonants.includes(char)) {
        return { weight: 0.6 }; // Samitlər üçün
      } else {
        return { weight: 0.2 }; // Digər hərflər
      }
    };

    // Morph target-ləri almaq (köhnə sistemdən)
    const getPhonemeTargets = (phoneme: string): MorphTargetData[] => {
      switch (phoneme) {
        case 'a': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.4" }];
        case 'ə': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.5" }];
        case 'i': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }, { morphTarget: "V_Wide", weight: "0.5" }];
        case 'm': return [{ morphTarget: "V_Explosive", weight: "1" }];
        case 'e': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.3" }, { morphTarget: "V_Wide", weight: "0.4" }];
        case 'b': return [{ morphTarget: "V_Explosive", weight: "1" }];
        case 'u': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.1" }, { morphTarget: "V_Affricate", weight: "1" }, { morphTarget: "V_Tight", weight: "1" }];
        case 'o': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }, { morphTarget: "V_Affricate", weight: "1" }, { morphTarget: "V_Tight", weight: "1" }];
        case 'v': return [{ morphTarget: "V_Dental_Lip", weight: "1" }];
        case 'ü': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.1" }, { morphTarget: "V_Affricate", weight: "1" }, { morphTarget: "V_Tight", weight: "1" }];
        case 'ö': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }, { morphTarget: "V_Affricate", weight: "1" }, { morphTarget: "V_Tight", weight: "1" }];
        case 'ı': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }, { morphTarget: "V_Wide", weight: "0.6" }];
        case 'p': return [{ morphTarget: "V_Explosive", weight: "1" }];
        case 'f': return [{ morphTarget: "V_Dental_Lip", weight: "1" }];
        case '_': return [
          { morphTarget: "Merged_Open_Mouth", weight: "0" }, 
          { morphTarget: "V_Lip_Open", weight: "0" }, 
          { morphTarget: "V_Tight_O", weight: "0" }, 
          { morphTarget: "V_Dental_Lip", weight: "0" }, 
          { morphTarget: "V_Explosive", weight: "0" }, 
          { morphTarget: "V_Wide", weight: "0" }, 
          { morphTarget: "V_Affricate", weight: "0" }
        ];
        default: return [
          { morphTarget: "Merged_Open_Mouth", weight: "0.2" } // Default kiçik ağız açıqlığı
        ];
      }
    };

    // İki morph target arası keçid
    const interpolateMorphTargets = (
      fromPhoneme: string,
      toPhoneme: string,
      progress: number
    ): MorphTargetData[] => {
      const fromTargets = getPhonemeTargets(fromPhoneme);
      const toTargets = getPhonemeTargets(toPhoneme);
      
      const allMorphTargets = new Set<string>();
      fromTargets.forEach(item => allMorphTargets.add(item.morphTarget));
      toTargets.forEach(item => allMorphTargets.add(item.morphTarget));
      
      const result: MorphTargetData[] = [];
      
      allMorphTargets.forEach(morphTarget => {
        const fromItem = fromTargets.find(item => item.morphTarget === morphTarget);
        const toItem = toTargets.find(item => item.morphTarget === morphTarget);
        
        const fromWeight = fromItem ? parseFloat(fromItem.weight) : 0;
        const toWeight = toItem ? parseFloat(toItem.weight) : 0;
        
        const interpolatedWeight = fromWeight + (toWeight - fromWeight) * progress;
        
        result.push({
          morphTarget,
          weight: interpolatedWeight.toString()
        });
      });
      
      return result;
    };

    // Animasiya döngüsü
    const animate = () => {
      if (!isPlaying.current || phonemeQueue.current.length === 0) {
        return;
      }
      
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime.current;
      
      // Cari fonem
      const currentPhoneme = phonemeQueue.current[currentPhonemeIndex.current];
      if (!currentPhoneme) {
        stopSpeaking();
        return;
      }
      
      // Növbəti fonemə keçmə vaxtı
      if (elapsedTime >= currentPhoneme.duration) {
        currentPhonemeIndex.current++;
        startTime.current = currentTime;
        
        // Növbəti fonem var mı?
        if (currentPhonemeIndex.current >= phonemeQueue.current.length) {
          stopSpeaking();
          return;
        }
      }
      
      // Cari və növbəti fonem arası keçid
      const nextPhoneme = phonemeQueue.current[currentPhonemeIndex.current + 1];
      if (nextPhoneme) {
        const progress = Math.min(elapsedTime / currentPhoneme.duration, 1);
        const smoothProgress = 0.5 * (1 - Math.cos(Math.PI * progress)); // Smooth curve
        
        const targets = interpolateMorphTargets(
          lastPhoneme.current,
          currentPhoneme.phoneme,
          smoothProgress
        );
        
        characterRef.current?.updateMorphTargets(targets);
        lastPhoneme.current = currentPhoneme.phoneme;
      }
      
      animationFrameId.current = requestAnimationFrame(animate);
    };

    const speakText = (text: string, options = {}) => {
      console.log('🎭 Starting lip sync for text:', text);
      console.log('🎭 Character ref available:', !!characterRef.current);
      
      // Əvvəlki animasiyanı dayandır
      stopSpeaking();
      
      // Text-i fonemələrə çevir
      const phonemes = textToPhonemes(text);
      phonemeQueue.current = phonemes;
      currentPhonemeIndex.current = 0;
      startTime.current = Date.now();
      isPlaying.current = true;
      
      console.log('🎭 Generated phonemes:', phonemes.map(p => `${p.phoneme}(${p.duration}ms)`).join(' -> '));
      
      // Animasiyanı başlat
      animate();
    };

    const stopSpeaking = () => {
      console.log('🎭 Stopping lip sync animation');
      
      isPlaying.current = false;
      phonemeQueue.current = [];
      currentPhonemeIndex.current = 0;
      
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      
      // Ağızı bağla
      const resetTargets = getPhonemeTargets('_');
      characterRef.current?.updateMorphTargets(resetTargets);
      lastPhoneme.current = '_';
    };

    useImperativeHandle(ref, () => ({
      speakText,
      stopSpeaking
    }));

    useEffect(() => {
      return () => {
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
      };
    }, []);

    return null; // Bu komponent UI render etmir
  }
);

LipSyncIntegration.displayName = 'LipSyncIntegration';

export default LipSyncIntegration; 