import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Direction, GameStatus } from '../types';
import { sound } from '../utils/sound';

interface VirtualDPadProps {
  status: GameStatus;
  setStatus: (status: GameStatus) => void;
  onPress: (dir: Direction) => void;
}

export const VirtualDPad: React.FC<VirtualDPadProps> = ({ status, setStatus, onPress }) => {
  const handlePress = (dir: Direction) => {
    if (status !== 'PLAYING') return;
    sound.playClick();
    onPress(dir);
  };

  const handleCenterPress = () => {
    sound.playClick();
    if (status === 'PLAYING') {
      setStatus('PAUSED');
    } else if (status === 'PAUSED') {
      setStatus('PLAYING');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-2">
      {/* Visual Diamond Layout D-pad */}
      <div className="relative w-32 h-32 md:w-36 md:h-36 bg-cyber-gray/40 border border-cyber-light rounded-full p-2 shadow-inner">
        {/* UP Button */}
        <button
          onClick={() => handlePress('UP')}
          disabled={status !== 'PLAYING'}
          className="absolute top-1 left-1/2 -translate-x-1/2 w-9 h-9 md:w-10 md:h-10 bg-cyber-light border border-gray-700/50 hover:border-neon-green/50 active:bg-neon-green/20 disabled:opacity-30 disabled:active:bg-transparent rounded-lg flex items-center justify-center text-gray-400 hover:text-neon-green transition-all duration-150 cursor-pointer shadow active:scale-90"
          id="btn-up"
          aria-label="Move Up"
        >
          <ChevronUp className="w-5 h-5" />
        </button>

        {/* LEFT Button */}
        <button
          onClick={() => handlePress('LEFT')}
          disabled={status !== 'PLAYING'}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 bg-cyber-light border border-gray-700/50 hover:border-neon-green/50 active:bg-neon-green/20 disabled:opacity-30 disabled:active:bg-transparent rounded-lg flex items-center justify-center text-gray-400 hover:text-neon-green transition-all duration-150 cursor-pointer shadow active:scale-90"
          id="btn-left"
          aria-label="Move Left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* CENTER Pause/Resume Toggle */}
        <button
          onClick={handleCenterPress}
          disabled={status !== 'PLAYING' && status !== 'PAUSED'}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 bg-cyber-dark border border-gray-800/80 hover:border-neon-blue/50 active:bg-neon-blue/20 rounded-full flex items-center justify-center text-gray-400 hover:text-neon-blue transition-all duration-200 cursor-pointer shadow-lg z-10 active:scale-95 disabled:opacity-20"
          id="btn-center"
          aria-label="Pause or Resume"
        >
          {status === 'PLAYING' ? (
            <Pause className="w-3.5 h-3.5 md:w-4 md:h-4 text-neon-blue" />
          ) : (
            <Play className="w-3.5 h-3.5 md:w-4 md:h-4 text-neon-green" />
          )}
        </button>

        {/* RIGHT Button */}
        <button
          onClick={() => handlePress('RIGHT')}
          disabled={status !== 'PLAYING'}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 bg-cyber-light border border-gray-700/50 hover:border-neon-green/50 active:bg-neon-green/20 disabled:opacity-30 disabled:active:bg-transparent rounded-lg flex items-center justify-center text-gray-400 hover:text-neon-green transition-all duration-150 cursor-pointer shadow active:scale-90"
          id="btn-right"
          aria-label="Move Right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* DOWN Button */}
        <button
          onClick={() => handlePress('DOWN')}
          disabled={status !== 'PLAYING'}
          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-9 h-9 md:w-10 md:h-10 bg-cyber-light border border-gray-700/50 hover:border-neon-green/50 active:bg-neon-green/20 disabled:opacity-30 disabled:active:bg-transparent rounded-lg flex items-center justify-center text-gray-400 hover:text-neon-green transition-all duration-150 cursor-pointer shadow active:scale-90"
          id="btn-down"
          aria-label="Move Down"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      <p className="text-[10px] font-mono text-gray-500 mt-2 text-center uppercase tracking-widest">
        {status === 'PLAYING' ? 'D-Pad Active' : 'Controls Standby'}
      </p>
    </div>
  );
};
