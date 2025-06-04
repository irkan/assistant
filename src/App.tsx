import React, { useState, useCallback, useRef } from 'react';
import './App.css';
import GeminiLiveAudio from './components/GeminiLiveAudio';
import Scene from './components/scene/Scene';
import ControlTray from './components/control-tray/ControlTray';
import { AylaModelRef } from './components/character/Ayla';

function App() {
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY || '';
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [shouldDisconnect, setShouldDisconnect] = useState(false);
  const [shouldStartRecording, setShouldStartRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [inVolume, setInVolume] = useState(0);
  
  // Ayla model ref for lipsync
  const aylaModelRef = useRef<AylaModelRef>(null);

  const handleConnect = useCallback(() => {
    console.log('🚀 Start button clicked - Starting live session and recording...');
    setShouldConnect(true);
    setShouldDisconnect(false);
    // Automatically start recording after connection
    setShouldStartRecording(true);
  }, []);

  const handleDisconnect = useCallback(() => {
    setShouldDisconnect(true);
    setShouldConnect(false);
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    setShouldConnect(false);
    setShouldDisconnect(false);
    
    // Reset recording flag when connection changes
    if (!connected) {
      setShouldStartRecording(false);
    }
  }, []);

  const handleMuteChange = useCallback((muted: boolean) => {
    setIsMuted(muted);
  }, []);

  const handleVolumeChange = useCallback((volume: number) => {
    setVolume(volume);
  }, []);

  const handleInVolumeChange = useCallback((inVolume: number) => {
    setInVolume(inVolume);
  }, []);

  // Recording started callback to reset flag
  const handleRecordingStart = useCallback(() => {
    console.log('🎤 Recording started, resetting shouldStartRecording flag');
    setShouldStartRecording(false);
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
      <Scene aylaModelRef={aylaModelRef} />
      
      <ControlTray
        onStart={handleConnect}
        onStop={handleDisconnect}
        onMuteToggle={handleMuteChange}
        isConnected={isConnected}
        isMuted={isMuted}
        volume={volume}
        inVolume={inVolume}
      />
      
      <GeminiLiveAudio 
        apiKey={apiKey}
        shouldConnect={shouldConnect}
        shouldDisconnect={shouldDisconnect}
        shouldStartRecording={shouldStartRecording}
        onConnectionChange={handleConnectionChange}
        onRecordingStart={handleRecordingStart}
        onMuteChange={handleMuteChange}
        externalMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onInVolumeChange={handleInVolumeChange}
        aylaModelRef={aylaModelRef}
      />
    </div>
  );
}

export default App;
