import { PLAYER_WIDTH, PLAYER_HEIGHT, GRAVITY, CANVAS_WIDTH, CANVAS_HEIGHT, MOVE_SPEED, JUMP_FORCE, GROUND_FRICTION, AIR_RESISTANCE } from '../constants';
import { Player, PlayerType, Platform } from '../types';

export const checkCollision = (r1: {x: number, y: number, w: number, h: number}, r2: {x: number, y: number, w: number, h: number}) => {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
};

export const updatePlayerPhysics = (player: Player, platforms: Platform[]) => {
  if (player.isDead) return;

  // Handle Frozen State
  if (player.isFrozen) {
      player.vel.x = 0;
      player.vel.y = 0;
      return;
  }

  // Calculate scaled dimensions
  const currentW = PLAYER_WIDTH * player.scale;
  const currentH = PLAYER_HEIGHT * player.scale;

  // Apply Gravity (unless Admin flying)
  if (!player.isAdmin) {
    player.vel.y += GRAVITY * (player.scale > 1 ? 1.2 : 1); // Heavy if giant
  } else {
    // Admin Mode: Low gravity/drag
    player.vel.y *= 0.9; 
    player.vel.x *= 0.93; 
  }

  // Apply velocity to position
  player.pos.x += player.vel.x;
  player.pos.y += player.vel.y;

  // Apply Friction
  if (player.isGrounded && !player.isAdmin) {
    player.vel.x *= GROUND_FRICTION;
  } else if (!player.isAdmin) {
    player.vel.x *= AIR_RESISTANCE;
  }

  // --- World Boundary Checks (Prevent falling off or getting stuck in walls) ---
  
  // Left Wall
  if (player.pos.x < 0) {
    player.pos.x = 0;
    player.vel.x = 0;
  }
  // Right Wall
  if (player.pos.x + currentW > CANVAS_WIDTH) {
    player.pos.x = CANVAS_WIDTH - currentW;
    player.vel.x = 0;
  }
  // Ceiling
  if (player.pos.y < 0) {
    player.pos.y = 0;
    player.vel.y = 0;
  }
  // Floor Safety Net (Respawn if fell through map logic gaps)
  if (player.pos.y > CANVAS_HEIGHT + 100) {
     player.pos.y = 0; // Fall from top
     player.pos.x = CANVAS_WIDTH / 2;
     player.vel.y = 0;
  }

  // --- Platform Collisions ---
  player.isGrounded = false;
  
  for (const plat of platforms) {
    // AABB Check
    if (
      player.pos.x < plat.x + plat.w &&
      player.pos.x + currentW > plat.x &&
      player.pos.y + currentH > plat.y &&
      player.pos.y < plat.y + plat.h
    ) {
      // Determine direction of collision based on previous frame or overlap center
      // Simple Overlap Resolution
      const overlapX = (player.pos.x + currentW / 2) - (plat.x + plat.w / 2);
      const overlapY = (player.pos.y + currentH / 2) - (plat.y + plat.h / 2);

      const width = (currentW + plat.w) / 2;
      const height = (currentH + plat.h) / 2;

      const crossWidth = width * overlapY;
      const crossHeight = height * overlapX;

      if (Math.abs(overlapX) <= width && Math.abs(overlapY) <= height) {
        if (crossWidth > crossHeight) {
          if (crossWidth > -crossHeight) {
            // Bottom collision (Head hitting bottom of platform)
            player.pos.y = plat.y + plat.h;
            player.vel.y = 0;
          } else {
            // Left collision
            player.pos.x = plat.x - currentW;
            player.vel.x = 0;
          }
        } else {
          if (crossWidth > -crossHeight) {
            // Right collision
            player.pos.x = plat.x + plat.w;
            player.vel.x = 0;
          } else {
            // Top collision (Landing)
            player.pos.y = plat.y - currentH;
            player.vel.y = 0;
            player.isGrounded = true;
          }
        }
      }
    }
  }
};

export const updateNPCBehavior = (npc: Player, allPlayers: Player[], bombHolderId: number, forcedTargetId: number | null) => {
  if (npc.type !== PlayerType.NPC || npc.isDead || npc.isFrozen) return;

  const bombHolder = allPlayers.find(p => p.id === bombHolderId);
  const isHoldingBomb = npc.id === bombHolderId;

  // Decide movement logic
  // If there is a forced target command, OVERRIDE normal behavior and chase that target
  let shouldChase = false;
  let chaseTarget: Player | null = null;
  let shouldFlee = false;

  if (forcedTargetId !== null) {
      const target = allPlayers.find(p => p.id === forcedTargetId);
      if (target && !target.isDead) {
          shouldChase = true;
          chaseTarget = target;
      }
  } 
  
  // Fallback to standard game logic if no forced target or target is dead
  if (!shouldChase) {
      if (isHoldingBomb) {
        shouldChase = true;
        // Find closest living player
        let closestDist = Infinity;
        allPlayers.forEach(p => {
            if (p.id !== npc.id && !p.isDead) {
                const dist = Math.abs(p.pos.x - npc.pos.x) + Math.abs(p.pos.y - npc.pos.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    chaseTarget = p;
                }
            }
        });
      } else if (bombHolder) {
        shouldFlee = true;
      }
  }

  // EXECUTE MOVEMENT
  if (shouldChase && chaseTarget) {
      // Move horizontally towards target
      if (chaseTarget.pos.x > npc.pos.x) {
        npc.vel.x += 1.0; // Accelerate right
        npc.facingRight = true;
      } else {
        npc.vel.x -= 1.0; // Accelerate left
        npc.facingRight = false;
      }

      // Jump if target is significantly higher and we are on ground
      if (chaseTarget.pos.y < npc.pos.y - 50 && npc.isGrounded) {
         npc.vel.y = JUMP_FORCE;
      }
  } else if (shouldFlee && bombHolder) {
      // --- FLEE MODE ---
      const distX = bombHolder.pos.x - npc.pos.x;
      const distY = bombHolder.pos.y - npc.pos.y;
      const dist = Math.sqrt(distX * distX + distY * distY);
      const SAFE_ZONE = 250;

      if (dist < SAFE_ZONE) {
        // Run away from bomb holder
        if (distX > 0) {
          // Bomb is to the right, run left
          npc.vel.x -= 1.0;
          npc.facingRight = false;
        } else {
          // Bomb is to the left, run right
          npc.vel.x += 1.0;
          npc.facingRight = true;
        }
        
        // Panic jump if cornered or bomb is very close
        if (dist < 100 && npc.isGrounded) {
          npc.vel.y = JUMP_FORCE;
        }
      } else {
         // --- IDLE / PATROL ---
         if (Math.random() < 0.02) {
            const dir = Math.random() > 0.5 ? 1 : -1;
            npc.vel.x = dir * MOVE_SPEED * 0.6;
         }
      }
  }

  // Jump if stuck against a wall or random chance
  if (npc.isGrounded) {
      const isAtLeftWall = npc.pos.x <= 10;
      const isAtRightWall = npc.pos.x >= CANVAS_WIDTH - PLAYER_WIDTH - 10;
      
      // If at wall and trying to move into it, jump
      if ((isAtLeftWall && npc.vel.x < 0) || (isAtRightWall && npc.vel.x > 0)) {
          npc.vel.y = JUMP_FORCE;
      }
      
      // Random jump to keep things dynamic
      if (Math.random() < 0.01) {
          npc.vel.y = JUMP_FORCE;
      }
  }

  // Cap speed
  if (npc.vel.x > MOVE_SPEED) npc.vel.x = MOVE_SPEED;
  if (npc.vel.x < -MOVE_SPEED) npc.vel.x = -MOVE_SPEED;
};