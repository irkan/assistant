import { AylaModelRef, MorphTargetData } from "../components/types";

export const ALL_MORPH_TARGETS = [
    "Merged_Open_Mouth", "V_Lip_Open", "V_Tight_O", "V_Dental_Lip", 
    "V_Explosive", "V_Wide", "V_Affricate", "V_Tight"
];

export const initialMorphWeights = Object.fromEntries(ALL_MORPH_TARGETS.map(name => [name, 0]));

export const getPhonemeTargets = (phoneme: string, currentMorphWeightsRef: React.MutableRefObject<Record<string, number>>): MorphTargetData[] => {
    if (!phoneme) return [{ morphTarget: "Merged_Open_Mouth", weight: "0" }];
    switch (phoneme) {
        case 'a': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.4" }];
        case 'ə': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.5" }];
        case 'i': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }, { morphTarget: "V_Wide", weight: "0.5" }];
        case 'l': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }];
        case 'r': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }];
        case 'n': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }];
        case 'm': return [{ morphTarget: "V_Explosive", weight: "1" }];
        case 'e': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.3" }, { morphTarget: "V_Wide", weight: "0.4" }];
        case 's': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }];
        case 't': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }];
        case 'd': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }];
        case 'k': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }]; 
        case 'b': return [{ morphTarget: "V_Explosive", weight: "1" }];
        case 'g': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }]; 
        case 'y': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }];
        case 'u': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.1" }, { morphTarget: "V_Affricate", weight: "1" }, { morphTarget: "V_Tight", weight: "1" }];
        case 'o': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }, { morphTarget: "V_Affricate", weight: "1" }, { morphTarget: "V_Tight", weight: "1" }];
        case 'ç': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }];
        case 'z': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }];
        case 'ş': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }];
        case 'q': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }]; 
        case 'x': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }]; 
        case 'v': return [{ morphTarget: "V_Dental_Lip", weight: "1" }];
        case 'j': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }];
        case 'ü': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.1" }, { morphTarget: "V_Affricate", weight: "1" }, { morphTarget: "V_Tight", weight: "1" }];
        case 'ö': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }, { morphTarget: "V_Affricate", weight: "1" }, { morphTarget: "V_Tight", weight: "1" }];
        case 'h': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }];
        case 'ğ': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }]; 
        case 'c': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }]; 
        case 'ı': return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }, { morphTarget: "V_Wide", weight: "0.6" }];
        case 'p': return [{ morphTarget: "V_Explosive", weight: "1" }];
        case 'f': return [{ morphTarget: "V_Dental_Lip", weight: "1" }];
        case '_': case 'neutral':
            currentMorphWeightsRef.current = { ...initialMorphWeights };
            return ALL_MORPH_TARGETS.map(name => ({ morphTarget: name, weight: "0" }));
        default: return [{ morphTarget: "Merged_Open_Mouth", weight: "0.2" }];
    }
};

export const sanitizeText = (text: string): string[] => {
    // Azərbaycan hərfləri + rəqəmlər + space saxla, qalanını evez et _ bununla 
    const cleanText = text.toLowerCase()
      .replace(/[^abcçdeəfgğhxıijkqlmnoöprsştüuvyz0-9\s]/g, '_');
    
    // Consecutive consonants to optimize
    const consonantsSecondToRemove = ['r', 'n', 's', 't', 'd', 'k', 'g', 'y', 'ç', 'z', 'ş', 'q', 'x', 'j', 'h', 'ğ', 'c', 'l'];
    
    // Split into characters and remove consecutive consonants
    const chars = cleanText.split('').filter(char => char !== ' '); // Remove spaces first
    const optimizedChars: string[] = [];
    
    for (let i = 0; i < chars.length; i++) {
      const currentChar = chars[i];
      const nextChar = chars[i + 1];
      
      // Add current character
      optimizedChars.push(currentChar);
      
      // If current and next are both in consonants list, skip the next one
      if (nextChar && 
          consonantsSecondToRemove.includes(currentChar) && 
          consonantsSecondToRemove.includes(nextChar)) {
        console.log(`🔄 Removing consecutive consonant: ${currentChar}${nextChar} -> ${currentChar}`);
        i++; // Skip next character
      }
    }
    
    console.log(`📝 Original: "${text}" (${chars.length} chars) -> Optimized: "${optimizedChars.join('')}" (${optimizedChars.length} chars)`);
    
    return optimizedChars;
  };

export const smoothUpdateMorphTargets = (
    aylaModelRef: React.RefObject<AylaModelRef> | undefined,
    transitionTimeoutsRef: React.MutableRefObject<NodeJS.Timeout[]>,
    currentMorphWeightsRef: React.MutableRefObject<Record<string, number>>,
    targetMorphs: MorphTargetData[], 
    transitionDuration: number
) => {
    transitionTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    transitionTimeoutsRef.current = [];

    const startWeights = { ...currentMorphWeightsRef.current };
    
    const targetWeightsMap: Record<string, number> = { ...initialMorphWeights };
    targetMorphs.forEach(target => {
        targetWeightsMap[target.morphTarget] = parseFloat(target.weight);
    });

    const steps = 5;
    
    for (let i = 1; i <= steps; i++) {
        const timeoutId = setTimeout(() => {
            const newWeightsData: MorphTargetData[] = [];
            ALL_MORPH_TARGETS.forEach(morphName => {
                const startWeight = startWeights[morphName] ?? 0;
                const targetWeight = targetWeightsMap[morphName] ?? 0;
                const newWeight = startWeight + (targetWeight - startWeight) * (i / steps);
                
                newWeightsData.push({
                    morphTarget: morphName,
                    weight: newWeight.toFixed(4)
                });
            });
            
            aylaModelRef?.current?.updateMorphTargets(newWeightsData);
            
            if (i === steps) {
                currentMorphWeightsRef.current = { ...targetWeightsMap };
            }
        }, (transitionDuration / steps) * i);
        transitionTimeoutsRef.current.push(timeoutId as unknown as NodeJS.Timeout);
    }
}; 