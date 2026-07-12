export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  x: number;
  y: number;
}

export type GameStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type GameMode = 'CLASSIC' | 'OBSTACLES' | 'PORTALS';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type FoodType = 'NORMAL' | 'GOLDEN' | 'SPEED' | 'REDUCE';

export interface Food {
  position: Position;
  type: FoodType;
  points: number;
  color: string;
  glowColor: string;
  sizeMultiplier: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface Obstacle {
  position: Position;
}

export interface GameStats {
  score: number;
  highScore: number;
  level: number;
  foodEaten: number;
  speed: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  gridVisible: boolean;
  speedMultiplier: number;
}
