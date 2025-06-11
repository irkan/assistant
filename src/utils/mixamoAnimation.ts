import * as THREE from 'three';
import { FBXLoader } from 'three-stdlib';

// Mixamo bone naming vs Ayla bone naming mapping
const MIXAMO_TO_AYLA_BONE_MAP: Record<string, string> = {
  // Root and hips
  'mixamorigHips': 'CC_Base_Hip',
  
  // Spine bones
  //'mixamorigSpine': 'CC_Base_Waist',
  //'mixamorigSpine1': 'CC_Base_Spine01',
  //'mixamorigSpine2': 'CC_Base_Spine02',
  //'mixamorigNeck': 'CC_Base_NeckTwist01',
  //'mixamorigHead': 'CC_Base_Head',
  //'mixamorigHeadTop_End': 'CC_Base_FacialBone',
  
  // Left arm
  'mixamorigLeftShoulder': 'CC_Base_L_Clavicle',
  'mixamorigLeftArm': 'CC_Base_L_Upperarm',
  'mixamorigLeftForeArm': 'CC_Base_L_Forearm',
  'mixamorigLeftHand': 'CC_Base_L_Hand',
  
  // Left fingers
  'mixamorigLeftHandThumb1': 'CC_Base_L_Thumb1',
  'mixamorigLeftHandThumb2': 'CC_Base_L_Thumb2',
  'mixamorigLeftHandThumb3': 'CC_Base_L_Thumb3',
  'mixamorigLeftHandIndex1': 'CC_Base_L_Index1',
  'mixamorigLeftHandIndex2': 'CC_Base_L_Index2',
  'mixamorigLeftHandIndex3': 'CC_Base_L_Index3',
  'mixamorigLeftHandMiddle1': 'CC_Base_L_Mid1',
  'mixamorigLeftHandMiddle2': 'CC_Base_L_Mid2',
  'mixamorigLeftHandMiddle3': 'CC_Base_L_Mid3',
  'mixamorigLeftHandRing1': 'CC_Base_L_Ring1',
  'mixamorigLeftHandRing2': 'CC_Base_L_Ring2',
  'mixamorigLeftHandRing3': 'CC_Base_L_Ring3',
  'mixamorigLeftHandPinky1': 'CC_Base_L_Pinky1',
  'mixamorigLeftHandPinky2': 'CC_Base_L_Pinky2',
  'mixamorigLeftHandPinky3': 'CC_Base_L_Pinky3',
  
  // Right arm
  'mixamorigRightShoulder': 'CC_Base_R_Clavicle',
  'mixamorigRightArm': 'CC_Base_R_Upperarm',
  'mixamorigRightForeArm': 'CC_Base_R_Forearm',
  'mixamorigRightHand': 'CC_Base_R_Hand',
  
  // Right fingers
  'mixamorigRightHandThumb1': 'CC_Base_R_Thumb1',
  'mixamorigRightHandThumb2': 'CC_Base_R_Thumb2',
  'mixamorigRightHandThumb3': 'CC_Base_R_Thumb3',
  'mixamorigRightHandIndex1': 'CC_Base_R_Index1',
  'mixamorigRightHandIndex2': 'CC_Base_R_Index2',
  'mixamorigRightHandIndex3': 'CC_Base_R_Index3',
  'mixamorigRightHandMiddle1': 'CC_Base_R_Mid1',
  'mixamorigRightHandMiddle2': 'CC_Base_R_Mid2',
  'mixamorigRightHandMiddle3': 'CC_Base_R_Mid3',
  'mixamorigRightHandRing1': 'CC_Base_R_Ring1',
  'mixamorigRightHandRing2': 'CC_Base_R_Ring2',
  'mixamorigRightHandRing3': 'CC_Base_R_Ring3',
  'mixamorigRightHandPinky1': 'CC_Base_R_Pinky1',
  'mixamorigRightHandPinky2': 'CC_Base_R_Pinky2',
  'mixamorigRightHandPinky3': 'CC_Base_R_Pinky3',
  
  // Left leg
  'mixamorigLeftUpLeg': 'CC_Base_L_Thigh',
  'mixamorigLeftLeg': 'CC_Base_L_Calf',
  'mixamorigLeftFoot': 'CC_Base_L_Foot',
  'mixamorigLeftToeBase': 'CC_Base_L_ToeBase',
  'mixamorigLeftToe_End': 'CC_Base_L_ToeBase_end',
  
  // Right leg
  'mixamorigRightUpLeg': 'CC_Base_R_Thigh',
  'mixamorigRightLeg': 'CC_Base_R_Calf',
  'mixamorigRightFoot': 'CC_Base_R_Foot',
  'mixamorigRightToeBase': 'CC_Base_R_ToeBase',
  'mixamorigRightToe_End': 'CC_Base_R_ToeBase_end',
};

export interface MixamoAnimationResult {
  animationClip: THREE.AnimationClip;
  originalClip: THREE.AnimationClip;
  success: boolean;
  message: string;
}

export class MixamoAnimationLoader {
  private fbxLoader: FBXLoader;
  
  constructor() {
    this.fbxLoader = new FBXLoader();
  }
  
  /**
   * Load and convert Mixamo FBX animation to work with Ayla character
   */
  async loadMixamoAnimation(fbxPath: string): Promise<MixamoAnimationResult> {
    try {
      console.log('🎭 Loading Mixamo animation from:', fbxPath);
      
      const fbxObject = await new Promise<THREE.Group>((resolve, reject) => {
        this.fbxLoader.load(fbxPath, resolve, undefined, reject);
      });
      
      console.log('🎭 FBX object loaded successfully.');
      
      const sourceClip = fbxObject.animations[0];
      if (!sourceClip) {
        throw new Error('No animation clip found in the FBX file.');
      }
      
      // --- STEP 1: Filter out all tracks for the left arm to keep it static ---
      const leftSideBonesToFilter = [
        'mixamorigLeftShoulder',
        'mixamorigLeftArm',
        'mixamorigLeftForeArm',
        'mixamorigLeftHand',
        'mixamorigLeftHandMiddle1',
        'mixamorigLeftHandMiddle2',
        'mixamorigLeftHandMiddle3',
        'mixamorigLeftHandThumb1',
        'mixamorigLeftHandThumb2',
        'mixamorigLeftHandThumb3',
        'mixamorigLeftHandIndex1',
        'mixamorigLeftHandIndex2',
        'mixamorigLeftHandIndex3',
        'mixamorigLeftHandRing1',
        'mixamorigLeftHandRing2',
        'mixamorigLeftHandRing3',
        'mixamorigLeftHandPinky1',
        'mixamorigLeftHandPinky2',
        'mixamorigLeftHandPinky3',
        'mixamorigLeftUpLeg', // Also filter left leg as a precaution
      ];

      const filteredTracks = sourceClip.tracks.filter(track => {
        const boneName = track.name.split('.')[0];
        return !leftSideBonesToFilter.includes(boneName);
      });
      console.log(`🎭 Filtered out left arm. Tracks reduced from ${sourceClip.tracks.length} to ${filteredTracks.length}.`);

      // --- STEP 2: Convert bone names and remove root motion from the *filtered* tracks ---
      const convertedTracks = this.convertBoneNames(filteredTracks);
      
      // --- STEP 3: Create the final animation clip ---
      const finalClip = new THREE.AnimationClip(
        'Greeting', // Use a clean name
        sourceClip.duration,
        convertedTracks
      );
      
      console.log('🎭 Final animation processed:', {
        name: finalClip.name,
        duration: finalClip.duration,
        tracks: convertedTracks.length
      });
      
      return {
        animationClip: finalClip,
        originalClip: sourceClip,
        success: true,
        message: `Successfully processed animation with ${convertedTracks.length} tracks.`
      };
      
    } catch (error) {
      console.error('🎭 Error loading Mixamo animation:', error);
      return {
        animationClip: new THREE.AnimationClip('error', 0, []),
        originalClip: new THREE.AnimationClip('error', 0, []),
        success: false,
        message: `Error loading animation: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Convert Mixamo bone names to Ayla bone names in animation tracks
   */
  private convertBoneNames(tracks: THREE.KeyframeTrack[]): THREE.KeyframeTrack[] {
    const convertedTracks: THREE.KeyframeTrack[] = [];
    
    for (const track of tracks) {
      const trackName = track.name;
      const parts = trackName.split('.');
      const mixamoBoneName = parts[0];
      const property = parts.slice(1).join('.');

      // If the track is for the hips, SKIP IT ENTIRELY.
      // This is the most aggressive and definitive "root motion" fix,
      // as it prevents any position, rotation, or scale changes on the root bone.
      if (mixamoBoneName === 'mixamorigHips') {
        console.log(`🦴 COMPLETELY SKIPPING root bone track: ${trackName}`);
        continue;
      }
      
      // For all other bones, copy the track as is, but with the new name
      const aylaBoneName = MIXAMO_TO_AYLA_BONE_MAP[mixamoBoneName];
      if (aylaBoneName) {
        const newTrackName = `${aylaBoneName}.${property}`;
        // Clone the track by creating a new instance with the new name
        const originalTrack = track as any; // Cast to any to access properties
        convertedTracks.push(new originalTrack.constructor(newTrackName, Array.from(originalTrack.times), Array.from(originalTrack.values)));
      } else {
        console.warn('🦴 No mapping found for bone:', mixamoBoneName);
      }
    }
    
    console.log('🎭 Total converted tracks after COMPLETE root motion fix:', convertedTracks.length);
    return convertedTracks;
  }
}