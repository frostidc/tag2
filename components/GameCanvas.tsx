import React, { useRef, useEffect, useState } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  MAP_PRESETS, 
  PLAYER_WIDTH, 
  PLAYER_HEIGHT, 
  BOMB_DURATION_SEC, 
  BOMB_TRANSFER_COOLDOWN,
  PLAYER_COLORS,
  MOVE_SPEED,
  JUMP_FORCE,
  GRAVITY
} from '../constants';
import { Player, PlayerType, GameConfig, GameStatus, Particle, FallingBomb, Platform } from '../types';
import { updatePlayerPhysics, updateNPCBehavior, checkCollision } from '../services/physics';

interface GameCanvasProps {
  config: GameConfig;
  onGameOver: (winnerLabel: string) => void;
  voiceCommand: string | null;
  onCommandProcessed: () => void;
}

// Helper to convert word numbers to digits for voice commands
const parseWordNumber = (str: string): number => {
  const num = parseInt(str);
  if (!isNaN(num)) return num;
  
  const lower = str.toLowerCase();
  if (lower.includes('hundred')) return 100;
  if (lower.includes('fifty')) return 50;
  if (lower.includes('ten')) return 10;
  if (lower.includes('five')) return 5;
  if (lower === 'one') return 1;
  return 10; // Default fallback
};

const GameCanvas: React.FC<GameCanvasProps> = ({ config, onGameOver, voiceCommand, onCommandProcessed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeLeft, setTimeLeft] = useState(BOMB_DURATION_SEC);
  const [playersRemaining, setPlayersRemaining] = useState(5);
  const [currentMapName, setCurrentMapName] = useState("");
  
  // Game State Refs
  const playersRef = useRef<Player[]>([]);
  const bombHolderRef = useRef<number>(0);
  const lastTransferTimeRef = useRef<number>(0);
  const gameStatusRef = useRef<GameStatus>(GameStatus.PLAYING);
  const startTimeRef = useRef<number>(Date.now());
  const particlesRef = useRef<Particle[]>([]);
  const fallingBombsRef = useRef<FallingBomb[]>([]);
  const currentMapRef = useRef<Platform[]>(MAP_PRESETS[0].platforms);
  
  // Camera State
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  
  // Command State
  const forcedTargetRef = useRef<number | null>(null);
  const bombQueueRef = useRef<{ targetId: number; count: number; nextSpawnTime: number } | null>(null);

  // Input State
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Initialization
  useEffect(() => {
    // Initial start: Pick a random map (keepMap = false)
    initializeRound(false);
    
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Handle Voice Commands
  useEffect(() => {
    if (!voiceCommand) return;

    let cmd = voiceCommand.toLowerCase().trim();
    
    // Normalize text
    cmd = cmd.replace(/\bto\b/g, 'two').replace(/\btoo\b/g, 'two');
    cmd = cmd.replace(/\bone\b/g, '1').replace(/\btwo\b/g, '2').replace(/\bthree\b/g, '3');

    // Admin Commands Regex
    const closeRegex = /^close\s+(\d+)$/i;
    const targetRegex = /^target\s+(\d+)$/i;
    const bombRegex = /^bomb\s+(?:player\s+)?(\d+)$/i;
    
    // Fun Commands
    const giantRegex = /^giant\s+(\d+)$/i;
    const tinyRegex = /^tiny\s+(\d+)$/i;
    const freezeRegex = /^freeze\s+(\d+)$/i;
    const unfreezeRegex = /^unfreeze\s+(\d+)$/i;
    const swapRegex = /^swap/i;

    const closeMatch = cmd.match(closeRegex);
    const targetMatch = cmd.match(targetRegex);
    const bombMatch = cmd.match(bombRegex);
    const giantMatch = cmd.match(giantRegex);
    const tinyMatch = cmd.match(tinyRegex);
    const freezeMatch = cmd.match(freezeRegex);
    const unfreezeMatch = cmd.match(unfreezeRegex);

    const getPlayer = (idStr: string) => {
        const id = parseInt(idStr) - 1;
        return playersRef.current.find(p => p.id === id);
    };

    if (closeMatch) {
      const p = getPlayer(closeMatch[1]);
      if (p) {
         p.isAdmin = true;
         createExplosion(p.pos.x, p.pos.y, '#FFF');
      }
    }
    else if (targetMatch) {
       const id = parseInt(targetMatch[1]) - 1;
       if (id >= 0 && id < 5) forcedTargetRef.current = id;
    }
    else if (bombMatch) {
        const id = parseInt(bombMatch[1]) - 1;
        if (id >= 0 && id < 5) {
            bombQueueRef.current = { targetId: id, count: 10, nextSpawnTime: Date.now() };
        }
    }
    else if (giantMatch) {
        const p = getPlayer(giantMatch[1]);
        if (p) p.scale = 2.0;
    }
    else if (tinyMatch) {
        const p = getPlayer(tinyMatch[1]);
        if (p) p.scale = 0.5;
    }
    else if (freezeMatch) {
        const p = getPlayer(freezeMatch[1]);
        if (p) p.isFrozen = true;
    }
    else if (unfreezeMatch) {
        const p = getPlayer(unfreezeMatch[1]);
        if (p) p.isFrozen = false;
    }
    else if (swapRegex) {
        // Swap all positions randomly
        const positions = playersRef.current.map(p => ({...p.pos}));
        // Shuffle positions
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        playersRef.current.forEach((p, idx) => {
            p.pos = positions[idx];
            createExplosion(p.pos.x, p.pos.y, '#00FFFF');
        });
    }

    onCommandProcessed();
  }, [voiceCommand, onCommandProcessed]);

  const initializeRound = (keepMap = false) => {
    const newPlayers: Player[] = [];
    const totalPlayers = 5;
    
    // Select Random Map ONLY if not keeping current one
    if (!keepMap) {
        const mapIndex = Math.floor(Math.random() * MAP_PRESETS.length);
        currentMapRef.current = MAP_PRESETS[mapIndex].platforms;
        setCurrentMapName(MAP_PRESETS[mapIndex].name);
    }

    forcedTargetRef.current = null;
    bombQueueRef.current = null;
    fallingBombsRef.current = [];

    const spawns = [
        { x: 100, y: 100 }, 
        { x: 350, y: 100 }, 
        { x: 600, y: 100 }, 
        { x: 850, y: 100 }, 
        { x: 1100, y: 100 }
    ];

    for (let i = 0; i < config.humanCount; i++) {
      newPlayers.push({
        id: i,
        type: PlayerType.HUMAN,
        label: `P${i + 1}`,
        pos: { ...spawns[i] },
        vel: { x: 0, y: 0 },
        color: PLAYER_COLORS[i],
        isGrounded: false,
        isAdmin: false,
        isDead: false,
        facingRight: true,
        scale: 1,
        isFrozen: false
      });
    }

    for (let i = config.humanCount; i < totalPlayers; i++) {
      newPlayers.push({
        id: i,
        type: PlayerType.NPC,
        label: "NPC",
        pos: { ...spawns[i] },
        vel: { x: 0, y: 0 },
        color: PLAYER_COLORS[i],
        isGrounded: false,
        isAdmin: false,
        isDead: false,
        facingRight: true,
        scale: 1,
        // FREEZE NPC IN TEST MODE
        isFrozen: config.isTestMode ? true : false 
      });
    }

    playersRef.current = newPlayers;
    
    const aliveIds = newPlayers.filter(p => !p.isDead).map(p => p.id);
    bombHolderRef.current = aliveIds[Math.floor(Math.random() * aliveIds.length)];
    
    startTimeRef.current = Date.now();
    gameStatusRef.current = GameStatus.PLAYING;
    setPlayersRemaining(aliveIds.length);
  };

  const createExplosion = (x: number, y: number, colorOverride?: string) => {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: colorOverride || '#ff4500'
      });
    }
  };

  const updateCamera = () => {
      const players = playersRef.current.filter(p => !p.isDead);
      if (players.length === 0) return;

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      
      players.forEach(p => {
          minX = Math.min(minX, p.pos.x);
          maxX = Math.max(maxX, p.pos.x + PLAYER_WIDTH * p.scale);
          minY = Math.min(minY, p.pos.y);
          maxY = Math.max(maxY, p.pos.y + PLAYER_HEIGHT * p.scale);
      });

      const paddingX = 300; 
      const paddingY = 200;
      minX -= paddingX;
      maxX += paddingX;
      minY -= paddingY;
      maxY += paddingY;

      const desiredWidth = maxX - minX;
      const desiredHeight = maxY - minY;

      const scaleX = CANVAS_WIDTH / desiredWidth;
      const scaleY = CANVAS_HEIGHT / desiredHeight;
      let targetZoom = Math.min(scaleX, scaleY);
      targetZoom = Math.max(0.6, Math.min(targetZoom, 1.5));

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const targetX = centerX - (CANVAS_WIDTH / 2) / targetZoom;
      const targetY = centerY - (CANVAS_HEIGHT / 2) / targetZoom;

      const lerpFactor = 0.05;
      cameraRef.current.zoom += (targetZoom - cameraRef.current.zoom) * lerpFactor;
      cameraRef.current.x += (targetX - cameraRef.current.x) * lerpFactor;
      cameraRef.current.y += (targetY - cameraRef.current.y) * lerpFactor;
  };

  const handleInput = () => {
    const players = playersRef.current;
    const getSpeed = (p: Player) => {
        if (p.isFrozen) return 0;
        let s = p.isAdmin ? MOVE_SPEED * 2 : MOVE_SPEED;
        if (p.scale > 1) s *= 0.8; // Giants move slow
        if (p.scale < 1) s *= 1.2; // Tiny moves fast
        return s;
    };
    
    const getJump = (p: Player) => p.scale < 1 ? JUMP_FORCE * 0.8 : JUMP_FORCE;

    // P1
    if (!players[0].isDead) {
      const speed = getSpeed(players[0]);
      if (keysPressed.current['KeyA']) { players[0].vel.x = -speed; players[0].facingRight = false; }
      if (keysPressed.current['KeyD']) { players[0].vel.x = speed; players[0].facingRight = true; }
      if (keysPressed.current['KeyW']) {
        if (players[0].isAdmin) players[0].vel.y = -speed;
        else if (players[0].isGrounded) players[0].vel.y = getJump(players[0]);
      }
    }

    // P2
    if (players[1] && !players[1].isDead && players[1].type === PlayerType.HUMAN) {
      const speed = getSpeed(players[1]);
      if (keysPressed.current['ArrowLeft']) { players[1].vel.x = -speed; players[1].facingRight = false; }
      if (keysPressed.current['ArrowRight']) { players[1].vel.x = speed; players[1].facingRight = true; }
      if (keysPressed.current['ArrowUp']) {
         if (players[1].isAdmin) players[1].vel.y = -speed;
         else if (players[1].isGrounded) players[1].vel.y = getJump(players[1]);
      }
    }

    // P3
    if (players[2] && !players[2].isDead && players[2].type === PlayerType.HUMAN) {
        const speed = getSpeed(players[2]);
        if (keysPressed.current['KeyJ']) { players[2].vel.x = -speed; players[2].facingRight = false; }
        if (keysPressed.current['KeyL']) { players[2].vel.x = speed; players[2].facingRight = true; }
        if (keysPressed.current['KeyI']) {
           if (players[2].isAdmin) players[2].vel.y = -speed;
           else if (players[2].isGrounded) players[2].vel.y = getJump(players[2]);
        }
    }
  };

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const now = Date.now();
      
      // 1. Process Bomb Queue
      if (bombQueueRef.current && gameStatusRef.current === GameStatus.PLAYING) {
          const queue = bombQueueRef.current;
          if (queue.count > 0) {
              if (now >= queue.nextSpawnTime) {
                  // Spawn a bomb "Next to" the target
                  const target = playersRef.current.find(p => p.id === queue.targetId);
                  if (target && !target.isDead) {
                      const side = Math.random() > 0.5 ? 1 : -1;
                      const offsetX = side * (60 + Math.random() * 60);
                      
                      fallingBombsRef.current.push({
                          x: target.pos.x + (PLAYER_WIDTH*target.scale)/2 + offsetX,
                          y: target.pos.y - 300, 
                          vy: 5
                      });
                      queue.count--;
                      queue.nextSpawnTime = now + 700; 
                  } else {
                      queue.count = 0; 
                  }
              }
          }
      }

      // 2. Logic Updates
      if (gameStatusRef.current === GameStatus.PLAYING) {
        const elapsed = (now - startTimeRef.current) / 1000;
        const currentTimer = Math.max(0, BOMB_DURATION_SEC - elapsed);
        
        if (Math.ceil(currentTimer) !== Math.ceil(timeLeft)) {
           setTimeLeft(currentTimer);
        }

        handleInput();
        updateCamera();

        // Players & NPC
        playersRef.current.forEach(p => {
          if (!p.isDead) {
            updatePlayerPhysics(p, currentMapRef.current);
            if (p.type === PlayerType.NPC) {
               updateNPCBehavior(p, playersRef.current, bombHolderRef.current, forcedTargetRef.current);
            }
          }
        });

        // Falling Bombs Physics
        for (let i = fallingBombsRef.current.length - 1; i >= 0; i--) {
            const fb = fallingBombsRef.current[i];
            fb.y += fb.vy;
            fb.vy += GRAVITY;

            let hit = false;
            // Map Boundary
            if (fb.y > CANVAS_HEIGHT + 100) hit = true; 
            
            if (!hit) {
                for (const plat of currentMapRef.current) {
                    if (fb.x > plat.x && fb.x < plat.x + plat.w && fb.y > plat.y && fb.y < plat.y + plat.h) {
                        hit = true; break;
                    }
                }
            }

            if (hit) {
                createExplosion(fb.x, fb.y, '#333');
                fallingBombsRef.current.splice(i, 1);
            }
        }

        // Bomb Transfer
        if (now - lastTransferTimeRef.current > BOMB_TRANSFER_COOLDOWN) {
            const holder = playersRef.current.find(p => p.id === bombHolderRef.current);
            if (holder && !holder.isDead) {
                playersRef.current.forEach(other => {
                    if (other.id !== holder.id && !other.isDead) {
                        // Adjust hitbox for scale
                        const hW = PLAYER_WIDTH * holder.scale;
                        const hH = PLAYER_HEIGHT * holder.scale;
                        const oW = PLAYER_WIDTH * other.scale;
                        const oH = PLAYER_HEIGHT * other.scale;

                        const p1Rect = { x: holder.pos.x, y: holder.pos.y, w: hW, h: hH };
                        const p2Rect = { x: other.pos.x, y: other.pos.y, w: oW, h: oH };
                        if (checkCollision(p1Rect, p2Rect)) {
                            bombHolderRef.current = other.id;
                            lastTransferTimeRef.current = now;
                        }
                    }
                });
            }
        }

        // Explosion Time
        if (currentTimer <= 0) {
           const victimIndex = playersRef.current.findIndex(p => p.id === bombHolderRef.current);
           if (victimIndex !== -1) {
              const victim = playersRef.current[victimIndex];
              const vw = PLAYER_WIDTH * victim.scale;
              const vh = PLAYER_HEIGHT * victim.scale;
              createExplosion(victim.pos.x + vw/2, victim.pos.y + vh/2);
              playersRef.current[victimIndex].isDead = true;
           }
           const survivors = playersRef.current.filter(p => !p.isDead);
           setPlayersRemaining(survivors.length);

           // INFINITE LOOP LOGIC FOR TEST MODE
           if (survivors.length <= 1 && !config.isTestMode) {
               gameStatusRef.current = GameStatus.GAME_OVER;
               onGameOver(survivors[0] ? survivors[0].label : "Nobody");
           } else {
               // Restart but KEEP THE MAP
               initializeRound(true); 
           }
        }
      }

      // 3. RENDER WORLD (With Camera Transform)
      ctx.save();
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // BG fills everything
      
      // Apply Camera Transform
      ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

      // Draw Background Details
      ctx.fillStyle = '#7db9d1';
      ctx.beginPath();
      ctx.arc(100, 100, 50, 0, Math.PI * 2);
      ctx.fill();

      // Platforms (Current Map)
      ctx.fillStyle = '#654321';
      currentMapRef.current.forEach(p => {
          ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.fillStyle = '#228B22';
          ctx.fillRect(p.x, p.y, p.w, 5);
          ctx.fillStyle = '#654321';
      });

      // Falling Bombs
      ctx.fillStyle = '#111';
      fallingBombsRef.current.forEach(fb => {
          ctx.beginPath();
          ctx.arc(fb.x, fb.y, 10, 0, Math.PI * 2);
          ctx.fill();
          // Fuse
          ctx.fillStyle = 'red';
          ctx.beginPath();
          ctx.arc(fb.x + 3, fb.y - 3, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#111';
      });

      // Players
      playersRef.current.forEach(p => {
        if (p.isDead) return;

        const w = PLAYER_WIDTH * p.scale;
        const h = PLAYER_HEIGHT * p.scale;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(p.pos.x + w/2, p.pos.y + h, w/2, 5 * p.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Admin Aura
        if (p.isAdmin) {
             ctx.strokeStyle = '#FFFFFF';
             ctx.lineWidth = 3;
             ctx.beginPath();
             ctx.arc(p.pos.x + w/2, p.pos.y + h/2, w, 0, Math.PI * 2);
             ctx.stroke();
        }

        // Frozen Effect
        if (p.isFrozen) {
            ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
            ctx.fillRect(p.pos.x - 5, p.pos.y - 5, w + 10, h + 10);
        }

        // Target Aura
        if (forcedTargetRef.current === p.id) {
             ctx.strokeStyle = '#FF00FF';
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.arc(p.pos.x + w/2, p.pos.y + h/2, w + 10, 0, Math.PI * 2);
             ctx.stroke();
             ctx.fillStyle = '#FF00FF';
             ctx.font = 'bold 10px sans-serif';
             ctx.fillText('TARGET', p.pos.x + w/2, p.pos.y + h + 20);
        }

        // Body
        ctx.fillStyle = p.color;
        const radius = 10 * p.scale;
        ctx.beginPath();
        ctx.roundRect(p.pos.x, p.pos.y, w, h, radius);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eyes
        ctx.fillStyle = 'white';
        const eyeOffset = p.facingRight ? 5 * p.scale : -5 * p.scale;
        const eyeX = p.pos.x + w/2 + eyeOffset;
        const eyeY = p.pos.y + 15 * p.scale;
        
        ctx.beginPath();
        ctx.arc(eyeX + 5 * p.scale, eyeY, 6 * p.scale, 0, Math.PI * 2);
        ctx.arc(eyeX - 5 * p.scale, eyeY, 6 * p.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(eyeX + 5 * p.scale + (p.facingRight?2*p.scale:-2*p.scale), eyeY, 2 * p.scale, 0, Math.PI * 2);
        ctx.arc(eyeX - 5 * p.scale + (p.facingRight?2*p.scale:-2*p.scale), eyeY, 2 * p.scale, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = 'white';
        ctx.font = `${10 * p.scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.label, p.pos.x + w/2, p.pos.y - 10);

        // Active Bomb
        if (bombHolderRef.current === p.id) {
            if (Math.floor(Date.now() / 200) % 2 === 0) {
               ctx.fillStyle = 'red';
               ctx.beginPath();
               ctx.arc(p.pos.x + w/2, p.pos.y - 35 * p.scale, 12 * p.scale, 0, Math.PI * 2);
               ctx.fill();
               ctx.strokeStyle = '#333';
               ctx.beginPath();
               ctx.moveTo(p.pos.x + w/2, p.pos.y - 45 * p.scale);
               ctx.quadraticCurveTo(p.pos.x + w/2 + 5, p.pos.y - 55 * p.scale, p.pos.x + w/2 + 10, p.pos.y - 50 * p.scale);
               ctx.stroke();
               ctx.fillStyle = 'orange';
               ctx.beginPath();
               ctx.arc(p.pos.x + w/2 + 10, p.pos.y - 50 * p.scale, 4 * p.scale, 0, Math.PI*2);
               ctx.fill();
            }
        }
      });

      // Particles
      particlesRef.current.forEach((part, idx) => {
        part.life -= 0.02;
        part.x += part.vx;
        part.y += part.vy;
        part.vy += 0.2;
        ctx.globalAlpha = Math.max(0, part.life);
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        if (part.life <= 0) particlesRef.current.splice(idx, 1);
      });

      // Restore Context (End of World Space)
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [playersRemaining]);

  return (
    <div className="relative inline-block border-4 border-gray-800 rounded-lg shadow-2xl bg-gray-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block rounded-md"
      />
      
      {/* HUD Layer (Static Position) */}
      <div className="absolute top-4 left-0 w-full flex justify-between px-8 pointer-events-none">
         <div className="bg-black/50 text-white p-4 rounded-lg backdrop-blur-sm">
             <div className="text-sm text-gray-300">PLAYERS LEFT</div>
             <div className="text-4xl font-bold pixel-font text-green-400">{playersRemaining}</div>
         </div>
         
         {config.isTestMode && (
             <div className="bg-purple-900/80 border border-purple-500 text-purple-200 p-2 px-4 rounded-lg backdrop-blur-sm mt-2 animate-pulse">
                <div className="text-[10px] text-purple-400 uppercase tracking-widest">MODE</div>
                <div className="text-sm font-bold">TEST SERVER</div>
             </div>
         )}
         
          <div className="bg-black/50 text-white p-2 px-4 rounded-lg backdrop-blur-sm mt-2">
             <div className="text-[10px] text-gray-400 uppercase tracking-widest">MAP</div>
             <div className="text-sm font-bold text-yellow-400">{currentMapName}</div>
         </div>

         <div className={`bg-black/50 text-white p-4 rounded-lg backdrop-blur-sm transition-transform ${timeLeft < 5 ? 'scale-110 text-red-500' : ''}`}>
             <div className="text-sm text-gray-300">BOMB TIMER</div>
             <div className="text-4xl font-bold pixel-font">{timeLeft.toFixed(1)}s</div>
         </div>
      </div>
      
       <div className="absolute bottom-4 left-4 text-white/50 text-xs font-mono pointer-events-none">
         P1: WASD | P2: Arrows | P3: IJKL | Key '1': Toggle Voice | Key '2': Admin Panel
       </div>
    </div>
  );
};

export default GameCanvas;