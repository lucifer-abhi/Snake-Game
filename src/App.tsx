import React, { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { VirtualDPad } from './components/VirtualDPad';
import { GameStatus, GameMode, Difficulty, GameStats, GameSettings, Direction } from './types';
import { Gamepad2, Volume2, VolumeX } from 'lucide-react';
import { sound } from './utils/sound';

export default function App() {
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [mode] = useState<GameMode>('CLASSIC');
  const [difficulty] = useState<Difficulty>('MEDIUM');
  
  const initialHighScore = Number(localStorage.getItem(`snake_high_CLASSIC_MEDIUM`) || '0');

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: initialHighScore,
    level: 1,
    foodEaten: 0,
    speed: 6,
  });

  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    gridVisible: true,
    speedMultiplier: 1,
  });

  // Track virtual button direction inputs from DPad
  const [virtualDirection, setVirtualDirection] = useState<Direction | null>(null);

  const toggleSound = () => {
    const nextVal = !settings.soundEnabled;
    sound.setEnabled(nextVal);
    setSettings((prev) => ({ ...prev, soundEnabled: nextVal }));
    sound.playClick();
  };

  return (
    <div className="min-h-screen bg-cyber-dark text-slate-100 flex flex-col items-center justify-start pt-6 md:pt-16 pb-8 px-4 selection:bg-neon-blue selection:text-black">
      {/* MINIMALIST HEADER */}
      <header className="w-full max-w-[340px] flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-neon-blue text-glow-blue animate-pulse" />
          <h1 className="font-display text-lg font-bold uppercase tracking-widest text-neon-blue">
            SNAKE
          </h1>
        </div>

        {/* Mini Audio Toggle & Quick HUD */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg border border-cyber-light bg-cyber-gray/40 hover:bg-cyber-light/60 hover:text-neon-green transition-all cursor-pointer text-gray-400"
            title="Toggle Sound"
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-neon-green" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* CORE BOARD CONTAINER */}
      <div className="w-full max-w-[340px] flex flex-col items-center gap-3">
        <GameBoard
          status={status}
          setStatus={setStatus}
          mode={mode}
          difficulty={difficulty}
          stats={stats}
          setStats={setStats}
          settings={settings}
          setSettings={setSettings}
          virtualDirection={virtualDirection}
          setVirtualDirection={setVirtualDirection}
        />

        {/* VIRTUAL ARROW BUTTON CONTROLS (DPAD) */}
        <div className="w-full flex justify-center mt-2">
          <VirtualDPad
            status={status}
            setStatus={setStatus}
            onPress={(dir) => setVirtualDirection(dir)}
          />
        </div>
      </div>
    </div>
  );
}
