import React, { useEffect, useRef, useState } from 'react';
import {
  Direction,
  GameStatus,
  GameMode,
  Difficulty,
  Position,
  Food,
  FoodType,
  Particle,
  Obstacle,
  GameStats,
  GameSettings,
} from '../types';
import { sound } from '../utils/sound';

interface GameBoardProps {
  status: GameStatus;
  setStatus: (status: GameStatus) => void;
  mode: GameMode;
  difficulty: Difficulty;
  stats: GameStats;
  setStats: React.Dispatch<React.SetStateAction<GameStats>>;
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  virtualDirection: Direction | null;
  setVirtualDirection: (dir: Direction | null) => void;
}

// Grid size configuration
const GRID_COLS = 20;
const GRID_ROWS = 20;

export const GameBoard: React.FC<GameBoardProps> = ({
  status,
  setStatus,
  mode,
  difficulty,
  stats,
  setStats,
  settings,
  setSettings,
  virtualDirection,
  setVirtualDirection,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Use refs for gameplay critical states to ensure 60fps requestAnimationFrame can read them instantly
  const stateRef = useRef({
    status,
    mode,
    difficulty,
    snake: [] as Position[],
    direction: 'RIGHT' as Direction,
    nextDirection: 'RIGHT' as Direction,
    food: null as Food | null,
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    lastTickTime: 0,
    tickInterval: 150, // ms between ticks, decreases with difficulty and score
    screenShake: 0,
    foodEatenCount: 0,
    score: 0,
    level: 1,
  });

  // Track canvas size in state for rendering container bounds
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 400, height: 400 });

  // Update refs when props change (syncing control inputs)
  useEffect(() => {
    stateRef.current.status = status;
  }, [status]);

  useEffect(() => {
    stateRef.current.mode = mode;
    resetGame();
  }, [mode]);

  useEffect(() => {
    stateRef.current.difficulty = difficulty;
    stateRef.current.tickInterval = getTickInterval(difficulty, stateRef.current.level);
    resetGame();
  }, [difficulty]);

  // Sync virtual controller input
  useEffect(() => {
    if (virtualDirection && status === 'PLAYING') {
      const currentDir = stateRef.current.direction;
      const isValidMove =
        (virtualDirection === 'UP' && currentDir !== 'DOWN') ||
        (virtualDirection === 'DOWN' && currentDir !== 'UP') ||
        (virtualDirection === 'LEFT' && currentDir !== 'RIGHT') ||
        (virtualDirection === 'RIGHT' && currentDir !== 'LEFT');

      if (isValidMove) {
        stateRef.current.nextDirection = virtualDirection;
      }
      setVirtualDirection(null); // consume the input
    }
  }, [virtualDirection, setVirtualDirection, status]);

  // Handle Resize of Container
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      // Keep it a perfect square based on the smaller bounding dimension
      const size = Math.max(260, Math.min(width, height, 340));
      setCanvasDimensions({ width: size, height: size });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentDir = stateRef.current.direction;
      let newDir: Direction | null = null;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDir !== 'DOWN') newDir = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDir !== 'UP') newDir = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDir !== 'RIGHT') newDir = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDir !== 'LEFT') newDir = 'RIGHT';
          break;
        case ' ':
          e.preventDefault();
          if (stateRef.current.status === 'PLAYING') {
            sound.playPause();
            setStatus('PAUSED');
          } else if (stateRef.current.status === 'PAUSED') {
            sound.playUnpause();
            setStatus('PLAYING');
          } else if (stateRef.current.status === 'IDLE' || stateRef.current.status === 'GAME_OVER') {
            sound.playClick();
            startGame();
          }
          break;
      }

      if (newDir && stateRef.current.status === 'PLAYING') {
        stateRef.current.nextDirection = newDir;
        // Optionally play a soft click sound for satisfying feedback
        // sound.playClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, setStatus]);

  // Touch swiping controls on Canvas
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return;

    const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const diffY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const threshold = 30; // Min sweep distance in pixels

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > threshold) {
        const currentDir = stateRef.current.direction;
        if (diffX > 0 && currentDir !== 'LEFT') {
          stateRef.current.nextDirection = 'RIGHT';
        } else if (diffX < 0 && currentDir !== 'RIGHT') {
          stateRef.current.nextDirection = 'LEFT';
        }
      }
    } else {
      if (Math.abs(diffY) > threshold) {
        const currentDir = stateRef.current.direction;
        if (diffY > 0 && currentDir !== 'UP') {
          stateRef.current.nextDirection = 'DOWN';
        } else if (diffY < 0 && currentDir !== 'DOWN') {
          stateRef.current.nextDirection = 'UP';
        }
      }
    }
    touchStartRef.current = null;
  };

  // Get game speed based on difficulty and level
  function getTickInterval(diff: Difficulty, lvl: number): number {
    let baseSpeed = 160;
    if (diff === 'EASY') baseSpeed = 200;
    if (diff === 'HARD') baseSpeed = 110;

    // Fast speed increases as level goes up, capping at 45ms for safety
    return Math.max(50, baseSpeed - (lvl - 1) * 12);
  }

  // Reset core game variables
  const resetGame = () => {
    const startX = 8;
    const startY = 10;
    stateRef.current.snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
    stateRef.current.direction = 'RIGHT';
    stateRef.current.nextDirection = 'RIGHT';
    stateRef.current.particles = [];
    stateRef.current.foodEatenCount = 0;
    stateRef.current.score = 0;
    stateRef.current.level = 1;
    stateRef.current.tickInterval = getTickInterval(difficulty, 1);

    // Generate elements
    generateObstacles();
    generateFood(stateRef.current.snake, stateRef.current.obstacles);

    // Sync up state
    setStats({
      score: 0,
      highScore: Number(localStorage.getItem(`snake_high_${mode}_${difficulty}`) || '0'),
      level: 1,
      foodEaten: 0,
      speed: Math.round(1000 / stateRef.current.tickInterval),
    });
  };

  // Generate solid obstacle blocks for OBSTACLES mode
  const generateObstacles = () => {
    const obstacles: Obstacle[] = [];
    if (stateRef.current.mode !== 'OBSTACLES') {
      stateRef.current.obstacles = [];
      return;
    }

    // Add 4-6 symmetry-glowing futuristic pillars depending on level
    const count = 4 + Math.min(4, stateRef.current.level - 1);
    
    // Create pre-defined symmetric obstacles that are cool and avoid spawn lines
    const configurations = [
      { x: 5, y: 5 }, { x: 14, y: 5 },
      { x: 5, y: 14 }, { x: 14, y: 14 },
      { x: 10, y: 4 }, { x: 10, y: 15 }
    ];

    for (let i = 0; i < Math.min(count, configurations.length); i++) {
      obstacles.push({ position: configurations[i] });
    }

    stateRef.current.obstacles = obstacles;
  };

  // Generate food avoiding snake & obstacles
  const generateFood = (snake: Position[], obstacles: Obstacle[]) => {
    let position: Position = { x: 0, y: 0 };
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 200) {
      attempts++;
      const rx = Math.floor(Math.random() * GRID_COLS);
      const ry = Math.floor(Math.random() * GRID_ROWS);

      // Avoid edge cells on Obstacles/Classic mode just to make it clean
      if (rx >= 0 && rx < GRID_COLS && ry >= 0 && ry < GRID_ROWS) {
        position = { x: rx, y: ry };
        
        // Ensure not spawning on snake
        const onSnake = snake.some(s => s.x === position.x && s.y === position.y);
        // Ensure not spawning on obstacle
        const onObstacle = obstacles.some(o => o.position.x === position.x && o.position.y === position.y);

        if (!onSnake && !onObstacle) {
          valid = true;
        }
      }
    }

    // Determine type of Food randomly
    const rand = Math.random();
    let type: FoodType = 'NORMAL';
    let points = 10;
    let color = 'rgb(57, 255, 20)'; // neon green
    let glowColor = 'rgba(57, 255, 20, 0.8)';
    let sizeMultiplier = 1;

    if (rand < 0.12) {
      type = 'GOLDEN';
      points = 50;
      color = 'rgb(255, 215, 0)'; // golden yellow
      glowColor = 'rgba(255, 215, 0, 0.9)';
      sizeMultiplier = 1.25;
    } else if (rand < 0.22) {
      type = 'SPEED';
      points = 20;
      color = 'rgb(0, 240, 255)'; // neon cyan lightning
      glowColor = 'rgba(0, 240, 255, 0.9)';
      sizeMultiplier = 1.1;
    } else if (rand < 0.30 && snake.length > 5) {
      type = 'REDUCE';
      points = 15;
      color = 'rgb(255, 0, 127)'; // pink pill
      glowColor = 'rgba(255, 0, 127, 0.9)';
      sizeMultiplier = 0.9;
    }

    stateRef.current.food = {
      position,
      type,
      points,
      color,
      glowColor,
      sizeMultiplier,
    };
  };

  // Start active gameplay
  const startGame = () => {
    if (stateRef.current.status === 'GAME_OVER') {
      resetGame();
    }
    setStatus('PLAYING');
  };

  // Create customized eat particles
  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    const arr: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      const life = Math.random() * 20 + 15;
      arr.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1,
        life,
        maxLife: life,
        size: Math.random() * 3 + 2,
      });
    }
    stateRef.current.particles.push(...arr);
  };

  // Main game logic ticker
  const gameTick = () => {
    const { snake, direction, nextDirection, food, mode, obstacles, level, foodEatenCount, score } = stateRef.current;

    // Commit direction change
    stateRef.current.direction = nextDirection;

    // Calculate new head position
    const head = snake[0];
    let newHead: Position = { x: head.x, y: head.y };

    switch (nextDirection) {
      case 'UP':
        newHead.y -= 1;
        break;
      case 'DOWN':
        newHead.y += 1;
        break;
      case 'LEFT':
        newHead.x -= 1;
        break;
      case 'RIGHT':
        newHead.x += 1;
        break;
    }

    // Portal Wrap or Wall collision check
    if (mode === 'PORTALS') {
      if (newHead.x < 0) newHead.x = GRID_COLS - 1;
      if (newHead.x >= GRID_COLS) newHead.x = 0;
      if (newHead.y < 0) newHead.y = GRID_ROWS - 1;
      if (newHead.y >= GRID_ROWS) newHead.y = 0;
    } else {
      if (newHead.x < 0 || newHead.x >= GRID_COLS || newHead.y < 0 || newHead.y >= GRID_ROWS) {
        triggerGameOver();
        return;
      }
    }

    // Obstacle collision check
    if (mode === 'OBSTACLES') {
      const hitObstacle = obstacles.some(o => o.position.x === newHead.x && o.position.y === newHead.y);
      if (hitObstacle) {
        triggerGameOver();
        return;
      }
    }

    // Self-collision check (excluding the very tail tip since it moves out of the way)
    const selfCollision = snake.slice(0, -1).some(segment => segment.x === newHead.x && segment.y === newHead.y);
    if (selfCollision) {
      triggerGameOver();
      return;
    }

    // Add new head to snake
    const newSnake = [newHead, ...snake];
    let foodEaten = false;

    // Check food collection
    if (food && newHead.x === food.position.x && newHead.y === food.position.y) {
      foodEaten = true;
      const cellPixels = canvasDimensions.width / GRID_COLS;
      const spawnX = (food.position.x + 0.5) * cellPixels;
      const spawnY = (food.position.y + 0.5) * cellPixels;

      // Score computations
      const addedPoints = food.points;
      const newScore = score + addedPoints;
      const newFoodEaten = foodEatenCount + 1;

      stateRef.current.score = newScore;
      stateRef.current.foodEatenCount = newFoodEaten;

      // Play Sound & Create Particles
      if (food.type === 'NORMAL') {
        sound.playEatNormal();
        spawnParticles(spawnX, spawnY, 'rgb(57, 255, 20)', 12);
      } else if (food.type === 'GOLDEN') {
        sound.playEatGolden();
        spawnParticles(spawnX, spawnY, 'rgb(255, 215, 0)', 25);
        stateRef.current.screenShake = 12; // Shake more for Golden
      } else if (food.type === 'SPEED') {
        sound.playEatSpeed();
        spawnParticles(spawnX, spawnY, 'rgb(0, 240, 255)', 18);
        stateRef.current.screenShake = 6;
      } else if (food.type === 'REDUCE') {
        sound.playEatReduce();
        spawnParticles(spawnX, spawnY, 'rgb(255, 0, 127)', 15);
      }

      // Check level up (every 5 food eaten)
      let currentLvl = level;
      if (newFoodEaten > 0 && newFoodEaten % 5 === 0) {
        currentLvl = level + 1;
        stateRef.current.level = currentLvl;
        sound.playLevelUp();
        // Glow effect
        stateRef.current.screenShake = 15;
        
        // Spawn shiny transition wave particles
        for (let r = 0; r < GRID_COLS; r += 2) {
          spawnParticles(r * cellPixels, 0, 'rgb(0, 240, 255)', 2);
          spawnParticles(r * cellPixels, canvasDimensions.height, 'rgb(0, 240, 255)', 2);
        }

        // Regen obstacles symmetric layout for new levels in Obstacle mode
        if (mode === 'OBSTACLES') {
          generateObstacles();
        }
      }

      stateRef.current.tickInterval = getTickInterval(difficulty, currentLvl);

      // Handle REDUCE logic (pops segments from tail)
      if (food.type === 'REDUCE') {
        // Pop 3 elements to compensate for the segment we just added plus shrink by 2
        newSnake.pop();
        if (newSnake.length > 3) newSnake.pop();
        if (newSnake.length > 3) newSnake.pop();
      }

      // Generate new food
      generateFood(newSnake, stateRef.current.obstacles);

      // Save high score
      const currentHighKey = `snake_high_${mode}_${difficulty}`;
      const savedHigh = Number(localStorage.getItem(currentHighKey) || '0');
      let finalHigh = savedHigh;
      if (newScore > savedHigh) {
        localStorage.setItem(currentHighKey, newScore.toString());
        finalHigh = newScore;
      }

      // Update parent React state
      setStats({
        score: newScore,
        highScore: finalHigh,
        level: currentLvl,
        foodEaten: newFoodEaten,
        speed: Math.round(1000 / stateRef.current.tickInterval),
      });
    }

    if (!foodEaten) {
      // Pop last segment to move forward
      newSnake.pop();
    }

    // Save back updated snake
    stateRef.current.snake = newSnake;
  };

  const triggerGameOver = () => {
    sound.playCrash();
    setStatus('GAME_OVER');
    stateRef.current.screenShake = 22; // Large crash screen shake!
    
    // Explode entire snake segments into particles!
    const cellPixels = canvasDimensions.width / GRID_COLS;
    stateRef.current.snake.forEach((segment) => {
      spawnParticles(
        (segment.x + 0.5) * cellPixels,
        (segment.y + 0.5) * cellPixels,
        'rgb(0, 240, 255)',
        6
      );
    });
  };

  // Main Render/Animation Loop (Runs at 60fps)
  useEffect(() => {
    let animationFrameId: number;

    const tick = (time: number) => {
      // 1. Logic Tick
      if (stateRef.current.status === 'PLAYING') {
        const elapsed = time - stateRef.current.lastTickTime;
        if (elapsed >= stateRef.current.tickInterval) {
          gameTick();
          stateRef.current.lastTickTime = time;
        }
      } else {
        // Prevent ticker freeze
        stateRef.current.lastTickTime = time;
      }

      // 2. Draw Call
      draw();

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [canvasDimensions, settings]);

  // Drawing routines inside canvas context
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellWidth = width / GRID_COLS;
    const cellHeight = height / GRID_ROWS;

    // Clear Canvas & Apply screen shake translation
    ctx.save();
    if (stateRef.current.screenShake > 0.1) {
      const shakeX = (Math.random() - 0.5) * stateRef.current.screenShake;
      const shakeY = (Math.random() - 0.5) * stateRef.current.screenShake;
      ctx.translate(shakeX, shakeY);
      stateRef.current.screenShake *= 0.88; // decay
    }

    // Draw dark background gradient
    ctx.fillStyle = '#0a0b10';
    ctx.fillRect(0, 0, width, height);

    // Subtle background mesh / vignette
    const bgGrad = ctx.createRadialGradient(width/2, height/2, 20, width/2, height/2, width * 0.8);
    bgGrad.addColorStop(0, '#10131e');
    bgGrad.addColorStop(1, '#050508');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw grid mesh lines if enabled
    if (settings.gridVisible) {
      ctx.strokeStyle = 'rgba(35, 39, 58, 0.4)';
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let c = 1; c < GRID_COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cellWidth, 0);
        ctx.lineTo(c * cellWidth, height);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let r = 1; r < GRID_ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * cellHeight);
        ctx.lineTo(width, r * cellHeight);
        ctx.stroke();
      }
    }

    // Draw futuristic obstacles in OBSTACLES mode
    if (mode === 'OBSTACLES') {
      stateRef.current.obstacles.forEach((obs) => {
        const ox = obs.position.x * cellWidth;
        const oy = obs.position.y * cellHeight;

        // Draw metallic/neon hazard pillar
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.5)'; // red glow
        
        // Dark red body
        ctx.fillStyle = '#3f1115';
        ctx.fillRect(ox + 2, oy + 2, cellWidth - 4, cellHeight - 4);
        
        // Hazard diagonal stripes
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox + 4, oy + cellHeight - 4);
        ctx.lineTo(ox + cellWidth - 4, oy + 4);
        ctx.stroke();

        ctx.restore();
      });
    }

    // Draw portals border glow for visual cues in PORTAL mode
    if (mode === 'PORTALS') {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 12]);
      ctx.strokeRect(2, 2, width - 4, height - 4);
      ctx.restore();
    }

    // Draw active Food
    const food = stateRef.current.food;
    if (food) {
      const fx = (food.position.x + 0.5) * cellWidth;
      const fy = (food.position.y + 0.5) * cellHeight;
      const radius = (Math.min(cellWidth, cellHeight) / 2) * 0.75 * food.sizeMultiplier;

      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = food.glowColor;

      // Apply simple floating pulse
      const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.12;

      // Draw shiny core circle
      ctx.beginPath();
      ctx.arc(fx, fy, radius * pulse, 0, Math.PI * 2);
      ctx.fillStyle = food.color;
      ctx.fill();

      // Golden glint or inner ring for non-normal fruits
      if (food.type === 'GOLDEN') {
        ctx.beginPath();
        ctx.arc(fx, fy, radius * pulse * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else if (food.type === 'SPEED') {
        // Draw a tiny lightning bolt or sharp core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(fx, fy - radius * 0.7);
        ctx.lineTo(fx + radius * 0.3, fy - radius * 0.1);
        ctx.lineTo(fx - radius * 0.2, fy + radius * 0.1);
        ctx.lineTo(fx, fy + radius * 0.7);
        ctx.lineTo(fx - radius * 0.3, fy + radius * 0.1);
        ctx.lineTo(fx + radius * 0.2, fy - radius * 0.1);
        ctx.closePath();
        ctx.fill();
      } else if (food.type === 'REDUCE') {
        // Draw miniature shield/cross
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx - radius * 0.5, fy - radius * 0.15, radius, radius * 0.3);
        ctx.fillRect(fx - radius * 0.15, fy - radius * 0.5, radius * 0.3, radius);
      }

      ctx.restore();
    }

    // Draw Snake Segments
    const snake = stateRef.current.snake;
    if (snake.length > 0) {
      snake.forEach((segment, index) => {
        const sx = segment.x * cellWidth;
        const sy = segment.y * cellHeight;
        const isHead = index === 0;

        ctx.save();
        
        if (isHead) {
          // Head coloring & glow
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
          
          const gradient = ctx.createRadialGradient(
            sx + cellWidth/2, sy + cellHeight/2, 2,
            sx + cellWidth/2, sy + cellHeight/2, cellWidth/2
          );
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.3, '#00f0ff');
          gradient.addColorStop(1, '#0083a3');
          ctx.fillStyle = gradient;

          // Smoothly rounded head shape
          ctx.beginPath();
          ctx.arc(sx + cellWidth / 2, sy + cellHeight / 2, cellWidth / 2 - 1, 0, Math.PI * 2);
          ctx.fill();

          // Draw neon glowing eyes
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#ff007f';
          ctx.fillStyle = '#ff007f';
          
          const eyeRadius = cellWidth * 0.12;
          const eyeOffset = cellWidth * 0.24;
          const { direction } = stateRef.current;

          let leftEyeX = sx + cellWidth/2;
          let leftEyeY = sy + cellHeight/2;
          let rightEyeX = sx + cellWidth/2;
          let rightEyeY = sy + cellHeight/2;

          if (direction === 'RIGHT') {
            leftEyeX += eyeOffset; leftEyeY -= eyeOffset;
            rightEyeX += eyeOffset; rightEyeY += eyeOffset;
          } else if (direction === 'LEFT') {
            leftEyeX -= eyeOffset; leftEyeY += eyeOffset;
            rightEyeX -= eyeOffset; rightEyeY -= eyeOffset;
          } else if (direction === 'UP') {
            leftEyeX -= eyeOffset; leftEyeY -= eyeOffset;
            rightEyeX += eyeOffset; rightEyeY -= eyeOffset;
          } else if (direction === 'DOWN') {
            leftEyeX += eyeOffset; leftEyeY += eyeOffset;
            rightEyeX -= eyeOffset; rightEyeY += eyeOffset;
          }

          ctx.beginPath();
          ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2);
          ctx.fill();

        } else {
          // Tail body sizing & coloring gradient (fades to darker blue)
          const ratio = index / snake.length;
          const bodyRadius = (cellWidth / 2) * (1 - ratio * 0.4); // shrink down towards tail
          
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(0, 150, 255, 0.4)';

          // Smooth transition from bright blue to dark cyber blue
          const bodyGrad = ctx.createLinearGradient(sx, sy, sx + cellWidth, sy + cellHeight);
          bodyGrad.addColorStop(0, '#0083a3');
          bodyGrad.addColorStop(1, '#052b41');
          ctx.fillStyle = bodyGrad;

          ctx.beginPath();
          ctx.arc(sx + cellWidth/2, sy + cellHeight/2, bodyRadius - 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Add a sleek futuristic center scale / pattern in center of cells
          ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(sx + cellWidth/2, sy + cellHeight/2, bodyRadius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });
    }

    // Draw active Particles (Updated at 60fps)
    const particles = stateRef.current.particles;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96; // drag
      p.vy *= 0.96; // drag
      p.life--;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      p.alpha = p.life / p.maxLife;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = p.size * 2;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw running score in corner of canvas
    if (stateRef.current.status === 'PLAYING' || stateRef.current.status === 'PAUSED') {
      ctx.save();
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(57, 255, 20, 0.4)';
      ctx.fillStyle = 'rgba(57, 255, 20, 0.8)'; // neon-green
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${stateRef.current.score}`, 16, 24);

      ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.8)'; // neon-blue
      ctx.textAlign = 'right';
      ctx.fillText(`BEST: ${stats.highScore}`, width - 16, 24);
      ctx.restore();
    }

    ctx.restore(); // Restore shake
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full select-none">
      <div
        ref={containerRef}
        id="canvas-container"
        className="relative flex items-center justify-center w-full aspect-square max-w-[340px] border border-cyber-light bg-cyber-dark/80 rounded-2xl overflow-hidden p-1 shadow-2xl shadow-black/80"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          className="rounded-xl cursor-crosshair touch-none max-w-full max-h-full block"
        />

        {/* State HUD Overlay screens */}
        {status === 'IDLE' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <h3 className="font-display text-2xl font-bold text-neon-green tracking-wide text-glow-green mb-2">
              SNAKE ENGAGED
            </h3>
            <p className="text-gray-400 text-sm max-w-[280px] mb-6">
              Navigate via keyboard (WASD/Arrows), swiping, or the controller pad. Avoid barriers and your tail!
            </p>
            <button
              onClick={startGame}
              className="px-6 py-2.5 bg-neon-green/10 hover:bg-neon-green/20 text-neon-green border border-neon-green/30 hover:border-neon-green rounded-xl font-medium tracking-wider cursor-pointer transition-all duration-300 transform active:scale-95 text-sm"
            >
              LAUNCH GAME
            </button>
          </div>
        )}

        {status === 'PAUSED' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <h3 className="font-display text-2xl font-bold text-neon-blue tracking-wide text-glow-blue mb-6">
              SYSTEM PAUSED
            </h3>
            <button
              onClick={() => {
                sound.playUnpause();
                setStatus('PLAYING');
              }}
              className="px-6 py-2.5 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:border-neon-blue rounded-xl font-medium tracking-wider cursor-pointer transition-all duration-300 transform active:scale-95 text-sm"
            >
              RESUME MISSION
            </button>
          </div>
        )}

        {status === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <h3 className="font-display text-3xl font-bold text-neon-pink tracking-wide text-glow-pink mb-1">
              GAME OVER
            </h3>
            <p className="text-xs font-mono text-gray-500 mb-6">COLLISION TERMINATION DETECTED</p>
            
            <div className="grid grid-cols-2 gap-4 bg-cyber-gray/60 border border-cyber-light p-4 rounded-xl mb-6 min-w-[200px]">
              <div className="text-center">
                <p className="text-[10px] font-mono text-gray-500">FINAL SCORE</p>
                <p className="font-mono text-lg font-bold text-neon-green">{stats.score}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-mono text-gray-500">FOOD EATEN</p>
                <p className="font-mono text-lg font-bold text-neon-blue">{stats.foodEaten}</p>
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-6 py-2.5 bg-neon-pink/10 hover:bg-neon-pink/20 text-neon-pink border border-neon-pink/30 hover:border-neon-pink rounded-xl font-medium tracking-wider cursor-pointer transition-all duration-300 transform active:scale-95 text-sm"
            >
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
