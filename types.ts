export enum PlayerType {
  HUMAN = 'HUMAN',
  NPC = 'NPC'
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  id: number;
  type: PlayerType;
  label: string; // "P1", "P2", "NPC"
  pos: Vector2;
  vel: Vector2;
  color: string;
  isGrounded: boolean;
  isAdmin: boolean; // Flight capability
  isDead: boolean;
  facingRight: boolean;
  
  // New Fun Properties
  scale: number; // 1 = Normal, 2 = Giant, 0.5 = Tiny
  isFrozen: boolean;
}

export interface GameConfig {
  humanCount: 2 | 3;
  isTestMode?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface FallingBomb {
  x: number;
  y: number;
  vy: number;
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  ROUND_OVER = 'ROUND_OVER',
  GAME_OVER = 'GAME_OVER'
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
}