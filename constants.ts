import { Platform } from "./types";

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 600;

export const GRAVITY = 0.5;
export const JUMP_FORCE = -12;
export const MOVE_SPEED = 5;
export const AIR_RESISTANCE = 0.95;
export const GROUND_FRICTION = 0.8;

export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 60;

export const BOMB_DURATION_SEC = 13;
export const BOMB_TRANSFER_COOLDOWN = 500; // ms

// --- MAP PRESETS ---
export const MAP_PRESETS: { name: string; platforms: Platform[] }[] = [
  {
    name: "Classic Arena",
    platforms: [
      { x: 0, y: CANVAS_HEIGHT - 40, w: CANVAS_WIDTH, h: 40 }, // Solid Floor
      { x: 50, y: 420, w: 200, h: 20 },
      { x: 950, y: 420, w: 200, h: 20 },
      { x: 350, y: 320, w: 500, h: 20 },
      { x: 100, y: 180, w: 150, h: 20 },
      { x: 525, y: 150, w: 150, h: 20 },
      { x: 950, y: 180, w: 150, h: 20 },
      { x: 280, y: 250, w: 50, h: 20 },
      { x: 870, y: 250, w: 50, h: 20 },
    ]
  },
  {
    name: "The Gap",
    platforms: [
      // Floor with a hole in the middle
      { x: 0, y: CANVAS_HEIGHT - 40, w: 400, h: 40 }, 
      { x: 800, y: CANVAS_HEIGHT - 40, w: 400, h: 40 },
      // Safe island at bottom
      { x: 500, y: 500, w: 200, h: 20 },
      // Floating steps
      { x: 200, y: 400, w: 150, h: 20 },
      { x: 850, y: 400, w: 150, h: 20 },
      // High bridge
      { x: 300, y: 200, w: 600, h: 20 },
      { x: 50, y: 150, w: 100, h: 20 },
      { x: 1050, y: 150, w: 100, h: 20 },
    ]
  },
  {
    name: "Twin Towers",
    platforms: [
      { x: 0, y: CANVAS_HEIGHT - 40, w: CANVAS_WIDTH, h: 40 },
      // Left Tower
      { x: 100, y: 450, w: 200, h: 20 },
      { x: 100, y: 300, w: 200, h: 20 },
      { x: 100, y: 150, w: 200, h: 20 },
      // Right Tower
      { x: 900, y: 450, w: 200, h: 20 },
      { x: 900, y: 300, w: 200, h: 20 },
      { x: 900, y: 150, w: 200, h: 20 },
      // Center connections
      { x: 400, y: 380, w: 400, h: 20 },
      { x: 550, y: 220, w: 100, h: 20 },
    ]
  }
];

export const PLAYER_COLORS = [
  '#ef4444', // Red (P1)
  '#3b82f6', // Blue (P2)
  '#22c55e', // Green (P3)
  '#eab308', // Yellow (NPC)
  '#a855f7', // Purple (NPC)
];