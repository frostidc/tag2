import React from 'react';
import { GameConfig } from '../types';

interface MainMenuProps {
  onStart: (config: GameConfig) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden bg-gray-900 text-white p-8">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
         <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-red-500 blur-3xl animate-pulse"></div>
         <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-blue-500 blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 space-y-6 text-center max-w-4xl w-full">
        <div className="space-y-4 mb-12">
          <h1 className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-red-500 to-pink-500 pixel-font tracking-tight drop-shadow-2xl">
              BOMB TAG
          </h1>
          <p className="text-lg md:text-xl text-gray-300 font-light tracking-widest uppercase">
             The Ultimate Hot Potato Platformer
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <button
            onClick={() => onStart({ humanCount: 2 })}
            className="group relative bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 hover:border-blue-500 p-10 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-bold px-4 py-1 text-xs rounded-full shadow-lg">
              RECOMMENDED
            </div>
            <div className="flex flex-col items-center">
                <span className="text-4xl mb-4">🎮</span>
                <h2 className="text-3xl font-bold mb-2 group-hover:text-blue-400 transition-colors">2 Players</h2>
                <p className="text-sm text-gray-400 mb-6 font-mono border-t border-gray-700 pt-4 w-full">
                    VS 3 AI BOTS
                </p>
                <div className="flex gap-3">
                    <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_10px_red]"></div>
                    <div className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_10px_blue]"></div>
                    <div className="w-4 h-4 rounded-full bg-yellow-600 opacity-50"></div>
                </div>
            </div>
          </button>

          <button
            onClick={() => onStart({ humanCount: 3 })}
            className="group relative bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 hover:border-green-500 p-10 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
          >
             <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white font-bold px-4 py-1 text-xs rounded-full shadow-lg">
              TOTAL CHAOS
            </div>
             <div className="flex flex-col items-center">
                <span className="text-4xl mb-4">💥</span>
                <h2 className="text-3xl font-bold mb-2 group-hover:text-green-400 transition-colors">3 Players</h2>
                <p className="text-sm text-gray-400 mb-6 font-mono border-t border-gray-700 pt-4 w-full">
                    VS 2 AI BOTS
                </p>
                <div className="flex gap-3">
                    <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_10px_red]"></div>
                    <div className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_10px_blue]"></div>
                    <div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_10px_green]"></div>
                </div>
            </div>
          </button>
        </div>

        {/* Test Server Button */}
        <button
          onClick={() => onStart({ humanCount: 2, isTestMode: true })}
          className="mt-8 group relative bg-black/50 border border-gray-800 hover:border-purple-500 p-4 px-12 rounded-xl transition-all duration-300 hover:bg-gray-800"
        >
          <div className="flex items-center space-x-3">
              <span className="text-xl">🛠️</span>
              <div>
                  <h3 className="text-sm font-bold text-gray-300 group-hover:text-purple-400 font-mono tracking-wider">ADMIN TEST SERVER</h3>
                  <p className="text-[10px] text-gray-500">NPCs Frozen • Infinite Rounds</p>
              </div>
          </div>
        </button>

        <div className="mt-8 bg-black/30 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
          <p className="text-gray-500 text-xs font-mono mb-4 uppercase tracking-widest">Controls Configuration</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-center justify-center space-x-2">
                  <span className="text-red-400 font-bold">P1</span>
                  <div className="flex gap-1">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">W</span>
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">A</span>
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">S</span>
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">D</span>
                  </div>
              </div>
              <div className="flex items-center justify-center space-x-2">
                  <span className="text-blue-400 font-bold">P2</span>
                  <div className="flex gap-1">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">↑</span>
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">←</span>
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">↓</span>
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">→</span>
                  </div>
              </div>
               <div className="flex items-center justify-center space-x-2">
                  <span className="text-green-400 font-bold">P3</span>
                  <div className="flex gap-1">
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">I</span>
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">J</span>
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">K</span>
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">L</span>
                  </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;