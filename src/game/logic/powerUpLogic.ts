import { Point, PowerUp, PowerUpType, ActivePowerUp, Snake } from '../state/types';
import { generateRandomPosition } from './prng';
import { POWER_UP_GRID_DURATION, POWER_UP_EFFECT_DURATION } from '../constants';

export const generatePowerUp = (
  gridSize: { width: number; height: number },
  occupiedPositions: Point[],
  randomFunc: () => number,
  currentTime: number,
  powerUpId: number
): PowerUp | null => {
  const position = generateRandomPosition(gridSize, occupiedPositions, randomFunc);
  if (!position) {
    console.warn('Could not generate power-up: No unoccupied position found.');
    return null;
  }

  const powerUpTypes = Object.values(PowerUpType);
  const randomType = powerUpTypes[Math.floor(randomFunc() * powerUpTypes.length)];

  return {
    id: `powerup-${powerUpId}`,
    type: randomType,
    position,
    expiresAt: currentTime + POWER_UP_GRID_DURATION
  };
};

export const activatePowerUp = (
  snake: Snake,
  powerUp: PowerUp,
  currentTime: number
): ActivePowerUp => {
  return {
    type: powerUp.type,
    playerId: snake.id,
    expiresAt: currentTime + POWER_UP_EFFECT_DURATION
  };
};

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

export const cleanupExpiredActivePowerUps = (
  activePowerUps: ActivePowerUp[],
  currentTime: number
): ActivePowerUp[] => {
  return activePowerUps.filter((ap) => ap.expiresAt > currentTime);
};

export const cleanupExpiredGridPowerUps = (powerUps: PowerUp[], currentTime: number): PowerUp[] => {
  return powerUps.filter((p) => p.expiresAt > currentTime);
};

export const getSpeedFactor = (
  snakeId: string,
  activePowerUps: ActivePowerUp[],
  currentTime: number
): number => {
  if (isPowerUpActive(PowerUpType.SPEED, snakeId, activePowerUps, currentTime)) {
    return 2;
  }
  if (isPowerUpActive(PowerUpType.SLOW, snakeId, activePowerUps, currentTime)) {
    return 0.5;
  }
  return 1;
};

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

export const isInvincible = (
  snakeId: string,
  activePowerUps: ActivePowerUp[],
  currentTime: number
): boolean => {
  return isPowerUpActive(PowerUpType.INVINCIBILITY, snakeId, activePowerUps, currentTime);
};
