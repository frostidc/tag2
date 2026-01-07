import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import { GameConfig } from './types';
import { X } from 'lucide-react';

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [gameOverMsg, setGameOverMsg] = useState<string | null>(null);
  
  // Admin State
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const [processedCommand, setProcessedCommand] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  // Secret Code tracking
  const [keySequence, setKeySequence] = useState<string[]>([]);

  const startGame = (config: GameConfig) => {
    setGameConfig(config);
    setIsPlaying(true);
    setGameOverMsg(null);
  };

  const handleGameOver = (winner: string) => {
    setIsPlaying(false);
    setGameOverMsg(`${winner} WINS!`);
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commandInput.trim()) {
      setProcessedCommand(commandInput);
      setCommandInput("");
      setShowAdminPanel(false); // Hide after submitting
    }
  };

  // Basic Speech Recognition Support
  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser. Use text input.");
      return;
    }

    if (isListening) {
        setIsListening(false);
        return; 
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    // @ts-ignore
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setProcessedCommand(transcript);
      setCommandInput(transcript); 
    };

    recognition.start();
  };

  // Global Key Listeners for Admin Shortcuts & Secret Code
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
        // --- Secret Code Logic (7756) ---
        setKeySequence(prev => {
            const newSeq = [...prev, e.key].slice(-4); // Keep last 4
            if (newSeq.join('') === '7756') {
                setShowCheatsheet(true);
            }
            return newSeq;
        });

        if (!isPlaying) return;

        // Key '1': Toggle Microphone
        if (e.key === '1') {
            toggleListening();
        }
        
        // Key '2': Toggle Admin Panel (Text)
        if (e.key === '2') {
            setShowAdminPanel(prev => !prev);
        }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [isPlaying, isListening]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {/* Game Container */}
      <div className="relative w-full max-w-[1000px]">
        
        {/* Header */}
        <div className="bg-gray-800 p-4 rounded-t-xl border-b border-gray-700 flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-4 text-gray-400 font-mono text-sm hidden sm:inline">BOMB_TAG_SYSTEM_V2.0</span>
            </div>
            
            {/* Command Interface */}
            {isPlaying && (
                <div className="flex items-center gap-2">
                    {isListening && (
                        <div className="transition-all duration-300 px-3 py-1 rounded text-xs font-mono border border-red-500 text-red-400 bg-red-900/20 animate-pulse">
                            LISTENING...
                        </div>
                    )}

                    {/* Admin Input Panel (Toggled via Key 2) */}
                    {showAdminPanel && (
                        <form onSubmit={handleCommandSubmit} className="flex animate-fade-in">
                            <input 
                                type="text" 
                                autoFocus
                                value={commandInput}
                                onChange={(e) => setCommandInput(e.target.value)}
                                placeholder="ADMIN CMD..." 
                                className="bg-black text-green-500 font-mono text-xs p-2 rounded-l border border-gray-600 focus:outline-none focus:border-green-500 w-32 sm:w-48 uppercase"
                            />
                            <button type="submit" className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-r border-t border-r border-b border-gray-600 text-xs">
                                >
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>

        {/* Main Viewport */}
        <div className="bg-gray-950 aspect-[16/9] w-full rounded-b-xl relative overflow-hidden flex flex-col justify-center items-center shadow-2xl border-x-4 border-b-4 border-gray-800">
          
          {isPlaying && gameConfig ? (
            <GameCanvas 
              config={gameConfig} 
              onGameOver={handleGameOver}
              voiceCommand={processedCommand}
              onCommandProcessed={() => setProcessedCommand(null)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
               {gameOverMsg && (
                  <div className="mb-8 animate-bounce z-50 absolute top-10">
                    <h2 className="text-4xl font-bold text-yellow-400 pixel-font drop-shadow-lg stroke-black border-black">{gameOverMsg}</h2>
                  </div>
               )}
               <MainMenu onStart={startGame} />
            </div>
          )}

        </div>
      </div>

      {/* Secret Cheatsheet Overlay */}
      {showCheatsheet && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-md">
              <div className="bg-gray-800 border-2 border-green-500 rounded-xl p-8 max-w-lg w-full relative shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                  <button 
                    onClick={() => setShowCheatsheet(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                  >
                      <X size={24} />
                  </button>
                  <h2 className="text-2xl font-bold text-green-500 mb-6 font-mono border-b border-gray-700 pb-2">ADMIN COMMANDS LIST</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono text-gray-300">
                      <div className="p-2 bg-gray-900 rounded">
                          <div className="text-green-400 font-bold">close [id]</div>
                          <div className="text-xs text-gray-500">Enable Flight Mode</div>
                      </div>
                      <div className="p-2 bg-gray-900 rounded">
                          <div className="text-green-400 font-bold">bomb [id]</div>
                          <div className="text-xs text-gray-500">Rain 10 bombs</div>
                      </div>
                      <div className="p-2 bg-gray-900 rounded">
                          <div className="text-green-400 font-bold">giant [id]</div>
                          <div className="text-xs text-gray-500">2x Size & Mass</div>
                      </div>
                      <div className="p-2 bg-gray-900 rounded">
                          <div className="text-green-400 font-bold">tiny [id]</div>
                          <div className="text-xs text-gray-500">0.5x Size & Speed</div>
                      </div>
                       <div className="p-2 bg-gray-900 rounded">
                          <div className="text-green-400 font-bold">freeze [id]</div>
                          <div className="text-xs text-gray-500">Stop Movement</div>
                      </div>
                       <div className="p-2 bg-gray-900 rounded">
                          <div className="text-green-400 font-bold">swap</div>
                          <div className="text-xs text-gray-500">Shuffle Positions</div>
                      </div>
                       <div className="p-2 bg-gray-900 rounded">
                          <div className="text-green-400 font-bold">target [id]</div>
                          <div className="text-xs text-gray-500">NPC Aggro Focus</div>
                      </div>
                  </div>
                  <div className="mt-6 text-xs text-center text-gray-500">
                      Press '2' in-game to open command bar or '1' to use voice.
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;