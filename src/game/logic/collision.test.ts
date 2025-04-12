import {
  hasCollidedWithWall,
  hasCollidedWithSnake,
  checkFoodCollision,
  checkPowerUpCollision
} from './collision';
import { Snake, Food, PowerUp, Direction, PowerUpType } from '../state/types';

describe('Collision Logic', () => {
  const gridSize = { width: 10, height: 10 };

  describe('hasCollidedWithWall', () => {
    it('should return true if point is outside left boundary', () => {
      expect(hasCollidedWithWall({ x: -1, y: 5 }, gridSize)).toBe(true);
    });

    it('should return true if point is outside right boundary', () => {
      expect(hasCollidedWithWall({ x: 10, y: 5 }, gridSize)).toBe(true);
    });

    it('should return true if point is outside top boundary', () => {
      expect(hasCollidedWithWall({ x: 5, y: -1 }, gridSize)).toBe(true);
    });

    it('should return true if point is outside bottom boundary', () => {
      expect(hasCollidedWithWall({ x: 5, y: 10 }, gridSize)).toBe(true);
    });

    it('should return false if point is inside boundaries', () => {
      expect(hasCollidedWithWall({ x: 0, y: 0 }, gridSize)).toBe(false);
      expect(hasCollidedWithWall({ x: 9, y: 9 }, gridSize)).toBe(false);
      expect(hasCollidedWithWall({ x: 5, y: 5 }, gridSize)).toBe(false);
    });

    it('should return false if point is exactly on the boundary edge (valid)', () => {
      expect(hasCollidedWithWall({ x: 0, y: 5 }, gridSize)).toBe(false);
      expect(hasCollidedWithWall({ x: 9, y: 5 }, gridSize)).toBe(false);
      expect(hasCollidedWithWall({ x: 5, y: 0 }, gridSize)).toBe(false);
      expect(hasCollidedWithWall({ x: 5, y: 9 }, gridSize)).toBe(false);
    });
  });

  describe('hasCollidedWithSnake', () => {
    const snake1: Snake = {
      id: 's1',
      color: 'red',
      score: 0,
      direction: Direction.RIGHT,
      activePowerUps: [],
      body: [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 }
      ]
    };
    const snake2: Snake = {
      id: 's2',
      color: 'blue',
      score: 0,
      direction: Direction.LEFT,
      activePowerUps: [],
      body: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 }
      ]
    };
    const singleSegmentSnake: Snake = {
      id: 's3',
      color: 'green',
      score: 0,
      direction: Direction.UP,
      activePowerUps: [],
      body: [{ x: 8, y: 8 }]
    };
    const snakes = [snake1, snake2, singleSegmentSnake];

    it('should return true if point collides with another snake body', () => {
      expect(hasCollidedWithSnake({ x: 2, y: 1 }, snakes)).toBe(true);
    });

    it('should return true if point collides with own snake body (excluding head)', () => {
      expect(hasCollidedWithSnake({ x: 4, y: 5 }, snakes, 's1')).toBe(true);

      expect(hasCollidedWithSnake({ x: 3, y: 5 }, snakes, 's1')).toBe(true);
    });

    it('should return false if point collides with own snake head when currentSnakeId is provided', () => {
      expect(hasCollidedWithSnake({ x: 5, y: 5 }, snakes, 's1')).toBe(false);
    });

    it('should return true if point collides with own snake head when currentSnakeId is NOT provided', () => {
      expect(hasCollidedWithSnake({ x: 5, y: 5 }, snakes)).toBe(true);
    });

    it('should return false if point does not collide with any snake', () => {
      expect(hasCollidedWithSnake({ x: 0, y: 0 }, snakes)).toBe(false);
      expect(hasCollidedWithSnake({ x: 9, y: 9 }, snakes, 's1')).toBe(false);
    });

    it('should return false for an empty list of snakes', () => {
      expect(hasCollidedWithSnake({ x: 1, y: 1 }, [])).toBe(false);
    });

    it('should return false if checking collision with own single-segment snake head', () => {
      expect(hasCollidedWithSnake({ x: 8, y: 8 }, snakes, 's3')).toBe(false);
    });

    it('should return true if point collides with the head of a single-segment snake (not current)', () => {
      expect(hasCollidedWithSnake({ x: 8, y: 8 }, snakes, 's1')).toBe(true);
    });

    it('should return true if point collides with the head of a single-segment snake (no current ID)', () => {
      expect(hasCollidedWithSnake({ x: 8, y: 8 }, snakes)).toBe(true);
    });
  });

  describe('checkFoodCollision', () => {
    const foodItems: Food[] = [
      { position: { x: 2, y: 2 }, value: 1 },
      { position: { x: 8, y: 8 }, value: 1 }
    ];

    it('should return the food item if point collides with food', () => {
      expect(checkFoodCollision({ x: 2, y: 2 }, foodItems)).toEqual(foodItems[0]);
      expect(checkFoodCollision({ x: 8, y: 8 }, foodItems)).toEqual(foodItems[1]);
    });

    it('should return null if point does not collide with any food', () => {
      expect(checkFoodCollision({ x: 1, y: 1 }, foodItems)).toBeNull();
      expect(checkFoodCollision({ x: 5, y: 5 }, foodItems)).toBeNull();
    });

    it('should return null for an empty list of food items', () => {
      expect(checkFoodCollision({ x: 1, y: 1 }, [])).toBeNull();
    });
  });

  describe('checkPowerUpCollision', () => {
    const powerUps: PowerUp[] = [
      { id: 'p1', type: PowerUpType.SPEED, position: { x: 3, y: 3 }, expiresAt: 0 },
      { id: 'p2', type: PowerUpType.SLOW, position: { x: 7, y: 7 }, expiresAt: 0 }
    ];

    it('should return the power-up item if point collides with a power-up', () => {
      expect(checkPowerUpCollision({ x: 3, y: 3 }, powerUps)).toEqual(powerUps[0]);
      expect(checkPowerUpCollision({ x: 7, y: 7 }, powerUps)).toEqual(powerUps[1]);
    });

    it('should return null if point does not collide with any power-up', () => {
      expect(checkPowerUpCollision({ x: 1, y: 1 }, powerUps)).toBeNull();
      expect(checkPowerUpCollision({ x: 5, y: 5 }, powerUps)).toBeNull();
    });

    it('should return null for an empty list of power-ups', () => {
      expect(checkPowerUpCollision({ x: 1, y: 1 }, [])).toBeNull();
    });
  });
});
