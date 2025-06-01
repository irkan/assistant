import React, { useState, useCallback, useRef } from 'react';
import './App.css';
import GeminiLiveAudio from './components/GeminiLiveAudio';
import Scene from './components/scene/Scene';
import ControlTray from './components/control-tray/ControlTray';
import { LipSyncRef } from './components/LipSyncIntegration';

function App() {
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY || '';
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [shouldDisconnect, setShouldDisconnect] = useState(false);
  const [volume, setVolume] = useState(0);
  const [inVolume, setInVolume] = useState(0);
  
  // LipSync reference
  const lipSyncRef = useRef<LipSyncRef>(null);

  const handleStart = useCallback(() => {
    console.log('🚀 Start button clicked - triggering connection');
    setShouldConnect(true);
    setShouldDisconnect(false);
  }, []);

  const handleStop = useCallback(() => {
    console.log('🛑 Stop button clicked - triggering disconnection');
    setShouldDisconnect(true);
    setShouldConnect(false);
    
    // Stop any ongoing lip sync animation
    if (lipSyncRef.current) {
      lipSyncRef.current.stopSpeaking();
    }
  }, []);

  const handleMuteToggle = useCallback((muted: boolean) => {
    console.log('🔊 Mute toggle:', muted);
    setIsMuted(muted);
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log('🔗 Connection status changed:', connected);
    setIsConnected(connected);
    // Reset trigger states after connection change
    if (connected) {
      setShouldConnect(false);
    } else {
      setShouldDisconnect(false);
    }
  }, []);

  const handleMuteChange = useCallback((muted: boolean) => {
    console.log('🔇 Mute status changed:', muted);
    // Prevent infinite loops by only updating if different
    if (muted !== isMuted) {
      setIsMuted(muted);
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
  }, []);

  const handleInVolumeChange = useCallback((newInVolume: number) => {
    setInVolume(newInVolume);
  }, []);

  // Lip sync callback for handling incoming text from Gemini
  const handleTextReceived = useCallback((text: string) => {
    console.log('📝 Text received from Gemini:', text);
    if (lipSyncRef.current && text.trim()) {
      lipSyncRef.current.speakText(text);
    }
  }, []);

  if (!apiKey) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>⚠️ API Key Missing</h1>
          <p>Please add your Gemini API key to the .env file:</p>
          <code>REACT_APP_GOOGLE_API_KEY=your_api_key_here</code>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      {/* 3D Scene with Character */}
      <Scene lipSyncRef={lipSyncRef} />
      
      {/* Control Tray */}
      <ControlTray
        onStart={handleStart}
        onStop={handleStop}
        onMuteToggle={handleMuteToggle}
        isConnected={isConnected}
        isMuted={isMuted}
        volume={volume}
        inVolume={inVolume}
      />

      {/* Gemini Component - positioned off-screen but functional */}
      <div style={{ 
        position: 'absolute', 
        top: '-9999px', 
        left: '-9999px',
        width: '1px',
        height: '1px',
        overflow: 'hidden'
      }}>
        <GeminiLiveAudio 
          apiKey={apiKey}
          shouldConnect={shouldConnect}
          shouldDisconnect={shouldDisconnect}
          onConnectionChange={handleConnectionChange}
          onMuteChange={handleMuteChange}
          externalMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onInVolumeChange={handleInVolumeChange}
        />
      </div>
    </div>
  );
}

export default App;
