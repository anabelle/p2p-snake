import { Point, PowerUp, PowerUpType, ActivePowerUp, Snake } from "../state/types";
import { generateRandomPosition } from "./prng";
import { POWER_UP_GRID_DURATION, POWER_UP_EFFECT_DURATION } from "../constants";
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator

// Generate a new power-up at a random position
export const generatePowerUp = (
  gridSize: { width: number; height: number },
  occupiedPositions: Point[],
  randomFunc: () => number,
  currentTime: number
): PowerUp | null => {
  const position = generateRandomPosition(gridSize, occupiedPositions, randomFunc);
  if (!position) {
    console.warn("Could not generate power-up: No unoccupied position found.");
    return null; // Grid might be full
  }

  const powerUpTypes = Object.values(PowerUpType);
  const randomType = powerUpTypes[Math.floor(randomFunc() * powerUpTypes.length)];

  return {
    id: uuidv4(), // Assign a unique ID
    type: randomType,
    position,
    expiresAt: currentTime + POWER_UP_GRID_DURATION,
  };
};

// Activate a power-up effect for a snake
export const activatePowerUp = (
  snake: Snake,
  powerUp: PowerUp,
  currentTime: number
): ActivePowerUp => {
  return {
    type: powerUp.type,
    playerId: snake.id,
    expiresAt: currentTime + POWER_UP_EFFECT_DURATION,
  };
};

// Check if a specific power-up type is active for a snake at the current time
export const isPowerUpActive = (
  type: PowerUpType,
  snakeId: string,
  activePowerUps: ActivePowerUp[],
  currentTime: number
): boolean => {
  return activePowerUps.some(
    (ap) => ap.playerId === snakeId && ap.type === type && ap.expiresAt > currentTime
  );
};

// Remove expired active power-ups for all snakes
export const cleanupExpiredActivePowerUps = (
  activePowerUps: ActivePowerUp[],
  currentTime: number
): ActivePowerUp[] => {
  return activePowerUps.filter(ap => ap.expiresAt > currentTime);
};

// Remove expired power-ups from the grid
export const cleanupExpiredGridPowerUps = (
  powerUps: PowerUp[],
  currentTime: number
): PowerUp[] => {
  return powerUps.filter(p => p.expiresAt > currentTime);
};


// --- Effect Calculation Functions ---

// Get the speed factor based on active power-ups
// Returns 1 for normal, >1 for faster, <1 for slower
export const getSpeedFactor = (
  snakeId: string,
  activePowerUps: ActivePowerUp[],
  currentTime: number
): number => {
  if (isPowerUpActive(PowerUpType.SPEED, snakeId, activePowerUps, currentTime)) {
    return 1.5; // Example: 50% faster
  }
  if (isPowerUpActive(PowerUpType.SLOW, snakeId, activePowerUps, currentTime)) {
    return 0.5; // Example: 50% slower
  }
  return 1; // Normal speed
};

// Get the score multiplier based on active power-ups
export const getScoreMultiplier = (
  snakeId: string,
  activePowerUps: ActivePowerUp[],
  currentTime: number
): number => {
  if (isPowerUpActive(PowerUpType.DOUBLE_SCORE, snakeId, activePowerUps, currentTime)) {
    return 2;
  }
  return 1;
};

// Check if the snake is invincible
export const isInvincible = (
  snakeId: string,
  activePowerUps: ActivePowerUp[],
  currentTime: number
): boolean => {
  return isPowerUpActive(PowerUpType.INVINCIBILITY, snakeId, activePowerUps, currentTime);
}; 