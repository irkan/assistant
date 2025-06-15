import React from 'react';

export interface MorphTargetData {
    morphTarget: string;
    weight: string;
}

export interface AylaModelRef {
  updateMorphTargets: (targets: MorphTargetData[]) => void;
  playGreetingAnimation: () => Promise<void>;
}

export interface GeminiLiveAudioProps {
  apiKey: string;
  shouldConnect?: boolean;
  shouldDisconnect?: boolean;
  shouldStartRecording?: boolean;
  onConnectionChange?: (connected: boolean) => void;
  onRecordingStart?: () => void;
  onMuteChange?: (muted: boolean) => void;
  externalMuted?: boolean;
  onVolumeChange?: (volume: number) => void;
  onInVolumeChange?: (inVolume: number) => void;
  onLipsyncUpdate?: (text: string, duration: number) => void;
  aylaModelRef?: React.RefObject<AylaModelRef>;
} 