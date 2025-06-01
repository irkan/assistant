import React, { memo, ReactNode, useEffect, useState } from "react";
import classNames from "classnames";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";

export type ControlTrayProps = {
  children?: ReactNode;
  onStart?: () => void;
  onStop?: () => void;
  onMuteToggle?: (muted: boolean) => void;
  isConnected?: boolean;
  isMuted?: boolean;
  volume?: number;
  inVolume?: number;
};

function ControlTray({
  children,
  onStart = () => {},
  onStop = () => {},
  onMuteToggle = () => {},
  isConnected = false,
  isMuted = false,
  volume = 0,
  inVolume = 0,
}: ControlTrayProps) {
  const [muted, setMuted] = useState(isMuted);

  // Sync with parent's muted state only when actually different
  useEffect(() => {
    if (muted !== isMuted) {
      setMuted(isMuted);
    }
  }, [isMuted, muted]);

  // Update CSS variable for mic volume effect
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`
    );
  }, [inVolume]);

  const handleMuteToggle = () => {
    console.log('🎛️ ControlTray: Mute button clicked, current muted:', muted);
    const newMuted = !muted;
    onMuteToggle(newMuted);
  };

  const handleConnectionToggle = () => {
    console.log('🎛️ ControlTray: Connection button clicked, isConnected:', isConnected);
    if (isConnected) {
      console.log('🛑 Calling onStop...');
      onStop();
    } else {
      console.log('🚀 Calling onStart...');
      onStart();
    }
  };

  return (
    <div className="control-tray">
      <nav className={classNames("actions-nav", { disabled: !isConnected })}>
        <button
          className={classNames("action-button mic-button")}
          onClick={handleMuteToggle}
          disabled={!isConnected}
        >
          {!isMuted ? (
            <span className="material-symbols-outlined filled">mic</span>
          ) : (
            <span className="material-symbols-outlined filled">mic_off</span>
          )}
        </button>

        <div className="action-button no-action outlined">
          <AudioPulse volume={volume} active={isConnected} hover={false} />
        </div>

        {children}
      </nav>

      <div className={classNames("connection-container", { connected: isConnected })}>
        <div className="connection-button-container">
          <button
            className={classNames("action-button connect-toggle", { connected: isConnected })}
            onClick={handleConnectionToggle}
          >
            <span className="material-symbols-outlined filled">
              {isConnected ? "pause" : "play_arrow"}
            </span>
          </button>
        </div>
        <span className="text-indicator">Streaming</span>
      </div>
    </div>
  );
}

export default memo(ControlTray); 