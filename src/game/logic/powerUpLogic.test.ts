import {
  generatePowerUp,
  activatePowerUp,
  isPowerUpActive,
  cleanupExpiredActivePowerUps,
  cleanupExpiredGridPowerUps,
  getSpeedFactor,
  getScoreMultiplier,
  isInvincible
} from './powerUpLogic';
import { Point, PowerUp, PowerUpType, ActivePowerUp, Snake, Direction } from '../state/types';
import * as prng from './prng';
import { POWER_UP_GRID_DURATION, POWER_UP_EFFECT_DURATION } from '../constants';

// Mock dependencies
jest.mock('./prng', () => ({
  ...jest.requireActual('./prng'),
  generateRandomPosition: jest.fn()
}));

describe('PowerUp Logic', () => {
  const gridSize = { width: 10, height: 10 };
  const occupiedPositions: Point[] = [];
  const mockRandomFunc = jest.fn();
  const generateRandomPositionMock = prng.generateRandomPosition as jest.Mock;
  const mockSnake: Snake = {
    id: 's1',
    body: [{ x: 1, y: 1 }],
    color: 'red',
    direction: Direction.RIGHT,
    score: 0,
    activePowerUps: []
  };
  const currentTime = 10000;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomFunc.mockReturnValue(0); // Default to first powerup type (SPEED)
    generateRandomPositionMock.mockReturnValue({ x: 5, y: 5 }); // Default position
    if (jest.isMockFunction(console.warn)) {
      (console.warn as jest.Mock).mockRestore();
    }
  });

  describe('generatePowerUp', () => {
    it('should generate a power-up with random type and position', () => {
      const powerUpId = 1;
      const expectedPosition = { x: 5, y: 5 };
      const expectedType = PowerUpType.SPEED; // Because mockRandomFunc returns 0
      generateRandomPositionMock.mockReturnValue(expectedPosition);

      const powerUp = generatePowerUp(
        gridSize,
        occupiedPositions,
        mockRandomFunc,
        currentTime,
        powerUpId
      );

      expect(generateRandomPositionMock).toHaveBeenCalledWith(
        gridSize,
        occupiedPositions,
        mockRandomFunc
      );
      expect(powerUp).not.toBeNull();
      expect(powerUp).toEqual({
        id: `powerup-${powerUpId}`,
        type: expectedType,
        position: expectedPosition,
        expiresAt: currentTime + POWER_UP_GRID_DURATION
      });
    });

    it('should return null if no position can be found', () => {
      generateRandomPositionMock.mockReturnValue(null);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const powerUp = generatePowerUp(gridSize, occupiedPositions, mockRandomFunc, currentTime, 1);
      expect(powerUp).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        'Could not generate power-up: No unoccupied position found.'
      );
      warnSpy.mockRestore();
    });
  });

  describe('activatePowerUp', () => {
    it('should create an ActivePowerUp based on the snake and power-up', () => {
      const powerUp: PowerUp = {
        id: 'p1',
        type: PowerUpType.INVINCIBILITY,
        position: { x: 1, y: 1 },
        expiresAt: currentTime + 1000
      };
      const activePowerUp = activatePowerUp(mockSnake, powerUp, currentTime);

      expect(activePowerUp).toEqual({
        type: powerUp.type,
        playerId: mockSnake.id,
        expiresAt: currentTime + POWER_UP_EFFECT_DURATION
      });
    });
  });

  describe('isPowerUpActive', () => {
    const activePowerUps: ActivePowerUp[] = [
      { type: PowerUpType.SPEED, playerId: 's1', expiresAt: currentTime + 100 },
      { type: PowerUpType.INVINCIBILITY, playerId: 's2', expiresAt: currentTime + 200 },
      { type: PowerUpType.SPEED, playerId: 's1', expiresAt: currentTime - 50 } // Expired
    ];

    it('should return true if the power-up type is active for the snake', () => {
      expect(isPowerUpActive(PowerUpType.SPEED, 's1', activePowerUps, currentTime)).toBe(true);
    });

    it('should return false if the power-up type is active but for another snake', () => {
      expect(isPowerUpActive(PowerUpType.INVINCIBILITY, 's1', activePowerUps, currentTime)).toBe(
        false
      );
    });

    it('should return false if the power-up type is active for the snake but expired', () => {
      // Test with the expired SPEED power-up by advancing time just enough
      expect(isPowerUpActive(PowerUpType.SPEED, 's1', activePowerUps, currentTime + 60)).toBe(true); // Still active
      expect(isPowerUpActive(PowerUpType.SPEED, 's1', activePowerUps, currentTime + 110)).toBe(
        false
      ); // Now expired
    });

    it('should return false if the power-up type is not found', () => {
      expect(isPowerUpActive(PowerUpType.SLOW, 's1', activePowerUps, currentTime)).toBe(false);
    });
  });

  describe('cleanupExpiredActivePowerUps', () => {
    it('should remove expired active power-ups', () => {
      const activePowerUps: ActivePowerUp[] = [
        { type: PowerUpType.SPEED, playerId: 's1', expiresAt: currentTime + 100 }, // Keep
        { type: PowerUpType.INVINCIBILITY, playerId: 's2', expiresAt: currentTime - 50 }, // Remove (Expired)
        { type: PowerUpType.SLOW, playerId: 's1', expiresAt: currentTime + 1 } // Keep
      ];
      const cleaned = cleanupExpiredActivePowerUps(activePowerUps, currentTime);
      expect(cleaned).toHaveLength(2);
      expect(cleaned).toEqual(
        expect.arrayContaining([
          activePowerUps[0], // SPEED
          activePowerUps[2] // SLOW
        ])
      );
    });

    it('should return an empty array if all power-ups are expired', () => {
      const activePowerUps: ActivePowerUp[] = [
        { type: PowerUpType.SPEED, playerId: 's1', expiresAt: currentTime - 100 },
        { type: PowerUpType.SLOW, playerId: 's2', expiresAt: currentTime - 50 }
      ];
      const cleaned = cleanupExpiredActivePowerUps(activePowerUps, currentTime);
      expect(cleaned).toHaveLength(0);
    });

    it('should return the same array if no power-ups are expired', () => {
      const activePowerUps: ActivePowerUp[] = [
        { type: PowerUpType.SPEED, playerId: 's1', expiresAt: currentTime + 100 },
        { type: PowerUpType.SLOW, playerId: 's2', expiresAt: currentTime + 50 }
      ];
      const cleaned = cleanupExpiredActivePowerUps(activePowerUps, currentTime);
      expect(cleaned).toEqual(activePowerUps);
    });
  });

  describe('cleanupExpiredGridPowerUps', () => {
    it('should remove expired power-ups from the grid', () => {
      const powerUps: PowerUp[] = [
        {
          id: 'p1',
          type: PowerUpType.SPEED,
          position: { x: 1, y: 1 },
          expiresAt: currentTime + 100
        }, // Keep
        {
          id: 'p2',
          type: PowerUpType.INVINCIBILITY,
          position: { x: 2, y: 2 },
          expiresAt: currentTime - 50
        }, // Remove
        { id: 'p3', type: PowerUpType.SLOW, position: { x: 3, y: 3 }, expiresAt: currentTime + 1 } // Keep
      ];
      const cleaned = cleanupExpiredGridPowerUps(powerUps, currentTime);
      expect(cleaned).toHaveLength(2);
      expect(cleaned).toEqual(
        expect.arrayContaining([
          powerUps[0], // SPEED
          powerUps[2] // SLOW
        ])
      );
    });
    // Add tests for empty/all expired/none expired similar to active cleanup
    it('should return an empty array if all grid power-ups are expired', () => {
      const powerUps: PowerUp[] = [
        {
          id: 'p1',
          type: PowerUpType.SPEED,
          position: { x: 1, y: 1 },
          expiresAt: currentTime - 100
        },
        { id: 'p2', type: PowerUpType.SLOW, position: { x: 2, y: 2 }, expiresAt: currentTime - 50 }
      ];
      const cleaned = cleanupExpiredGridPowerUps(powerUps, currentTime);
      expect(cleaned).toHaveLength(0);
    });

    it('should return the same array if no grid power-ups are expired', () => {
      const powerUps: PowerUp[] = [
        {
          id: 'p1',
          type: PowerUpType.SPEED,
          position: { x: 1, y: 1 },
          expiresAt: currentTime + 100
        },
        { id: 'p2', type: PowerUpType.SLOW, position: { x: 2, y: 2 }, expiresAt: currentTime + 50 }
      ];
      const cleaned = cleanupExpiredGridPowerUps(powerUps, currentTime);
      expect(cleaned).toEqual(powerUps);
    });
  });

  describe('Effect Calculation Helpers', () => {
    const activePowerUps: ActivePowerUp[] = [
      { type: PowerUpType.SPEED, playerId: 's1', expiresAt: currentTime + 100 },
      { type: PowerUpType.SLOW, playerId: 's2', expiresAt: currentTime + 100 },
      { type: PowerUpType.DOUBLE_SCORE, playerId: 's1', expiresAt: currentTime + 100 },
      { type: PowerUpType.INVINCIBILITY, playerId: 's3', expiresAt: currentTime + 100 }
    ];

    // getSpeedFactor
    it('getSpeedFactor should return 1.5 if SPEED is active', () => {
      expect(getSpeedFactor('s1', activePowerUps, currentTime)).toBe(1.5);
    });
    it('getSpeedFactor should return 0.5 if SLOW is active', () => {
      expect(getSpeedFactor('s2', activePowerUps, currentTime)).toBe(0.5);
    });
    it('getSpeedFactor should return 1 if neither SPEED nor SLOW is active', () => {
      expect(getSpeedFactor('s3', activePowerUps, currentTime)).toBe(1);
    });
    it('getSpeedFactor should return 1 if SPEED/SLOW is expired', () => {
      const expiredTime = currentTime + 200;
      expect(getSpeedFactor('s1', activePowerUps, expiredTime)).toBe(1);
      expect(getSpeedFactor('s2', activePowerUps, expiredTime)).toBe(1);
    });

    // getScoreMultiplier
    it('getScoreMultiplier should return 2 if DOUBLE_SCORE is active', () => {
      expect(getScoreMultiplier('s1', activePowerUps, currentTime)).toBe(2);
    });
    it('getScoreMultiplier should return 1 if DOUBLE_SCORE is not active', () => {
      expect(getScoreMultiplier('s2', activePowerUps, currentTime)).toBe(1);
    });
    it('getScoreMultiplier should return 1 if DOUBLE_SCORE is expired', () => {
      const expiredTime = currentTime + 200;
      expect(getScoreMultiplier('s1', activePowerUps, expiredTime)).toBe(1);
    });

    // isInvincible
    it('isInvincible should return true if INVINCIBILITY is active', () => {
      expect(isInvincible('s3', activePowerUps, currentTime)).toBe(true);
    });
    it('isInvincible should return false if INVINCIBILITY is not active', () => {
      expect(isInvincible('s1', activePowerUps, currentTime)).toBe(false);
    });
    it('isInvincible should return false if INVINCIBILITY is expired', () => {
      const expiredTime = currentTime + 200;
      expect(isInvincible('s3', activePowerUps, expiredTime)).toBe(false);
    });
  });
});
