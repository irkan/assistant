import React from 'react';
import './App.css';
import GeminiLiveAudio from './components/GeminiLiveAudio';

function App() {
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY || '';

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
      <header className="App-header">
        <h1>🚀 Gemini Chat Demo</h1>
        <p>Experience conversation with Google's Gemini AI</p>
      </header>
      <main className="App-main">
        <GeminiLiveAudio apiKey={apiKey} />
      </main>
    </div>
  );
}

export default App;
