import * as THREE from 'three';
import { FBXLoader } from 'three-stdlib';

// Mixamo bone naming vs Ayla bone naming mapping
const MIXAMO_TO_AYLA_BONE_MAP: Record<string, string> = {
  // Root and hips
  'mixamorigHips': 'CC_Base_Hip',
  
  // Spine bones
  'mixamorigSpine': 'CC_Base_Waist',
  'mixamorigSpine1': 'CC_Base_Spine01',
  'mixamorigSpine2': 'CC_Base_Spine02',
  'mixamorigNeck': 'CC_Base_NeckTwist01',
  'mixamorigHead': 'CC_Base_Head',
  'mixamorigHeadTop_End': 'CC_Base_FacialBone',
  
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
      
      // Load FBX file
      const fbxObject = await new Promise<THREE.Group>((resolve, reject) => {
        this.fbxLoader.load(
          fbxPath,
          (object) => resolve(object),
          (progress) => console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%'),
          (error) => reject(error)
        );
      });
      
      console.log('🎭 FBX object loaded:', fbxObject);
      
      // Extract animation clips from FBX
      const animations = fbxObject.animations;
      if (!animations || animations.length === 0) {
        return {
          animationClip: new THREE.AnimationClip('empty', 0, []),
          originalClip: new THREE.AnimationClip('empty', 0, []),
          success: false,
          message: 'No animations found in FBX file'
        };
      }
      
      console.log('🎭 Found animations:', animations.length);
      
      // Take the first animation (usually the main one)
      const originalClip = animations[0];
      console.log('🎭 Original animation duration:', originalClip.duration);
      console.log('🎭 Original tracks count:', originalClip.tracks.length);
      
      // Convert bone names from Mixamo to Ayla
      const convertedTracks = this.convertBoneNames(originalClip.tracks);
      
      // Create new animation clip with converted tracks
      const convertedClip = new THREE.AnimationClip(
        originalClip.name + '_converted',
        originalClip.duration,
        convertedTracks
      );
      
      console.log('🎭 Converted animation:', {
        name: convertedClip.name,
        duration: convertedClip.duration,
        tracks: convertedTracks.length
      });
      
      return {
        animationClip: convertedClip,
        originalClip: originalClip,
        success: true,
        message: `Successfully converted animation with ${convertedTracks.length} tracks`
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
      console.log('🦴 Processing track:', trackName);
      
      // Parse track name: "boneName.property"
      const parts = trackName.split('.');
      if (parts.length < 2) {
        console.warn('🦴 Invalid track name format:', trackName);
        continue;
      }
      
      const mixamoBoneName = parts[0];
      const property = parts.slice(1).join('.');
      
      // Map Mixamo bone name to Ayla bone name
      const aylaBoneName = MIXAMO_TO_AYLA_BONE_MAP[mixamoBoneName];
      
      if (!aylaBoneName) {
        console.warn('🦴 No mapping found for bone:', mixamoBoneName);
        continue;
      }
      
      // Create new track with Ayla bone name
      const newTrackName = `${aylaBoneName}.${property}`;
      
      let newTrack: THREE.KeyframeTrack;
      
      // Convert Float32Array to number array for compatibility
      const timesArray = Array.from(track.times);
      const valuesArray = Array.from(track.values);
      
      // Create appropriate track type based on original track
      if (track instanceof THREE.VectorKeyframeTrack) {
        newTrack = new THREE.VectorKeyframeTrack(
          newTrackName,
          timesArray,
          valuesArray
        );
      } else if (track instanceof THREE.QuaternionKeyframeTrack) {
        newTrack = new THREE.QuaternionKeyframeTrack(
          newTrackName,
          timesArray,
          valuesArray
        );
      } else if (track instanceof THREE.NumberKeyframeTrack) {
        newTrack = new THREE.NumberKeyframeTrack(
          newTrackName,
          timesArray,
          valuesArray
        );
      } else {
        // Generic KeyframeTrack
        newTrack = new THREE.KeyframeTrack(
          newTrackName,
          timesArray,
          valuesArray
        );
      }
      
      convertedTracks.push(newTrack);
      console.log('🦴 Converted:', mixamoBoneName, '->', aylaBoneName);
    }
    
    console.log('🎭 Total converted tracks:', convertedTracks.length);
    return convertedTracks;
  }
}