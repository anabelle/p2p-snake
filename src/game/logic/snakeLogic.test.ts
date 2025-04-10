import {
  generateNewSnake,
  getNextHeadPosition,
  moveSnakeBody,
  growSnake
} from './snakeLogic';
import { Point, Snake, Direction } from '../state/types'; // Removed unused PowerUp import
import * as prng from './prng';
import { PLAYER_COLORS, GRID_SIZE as CONST_GRID_SIZE } from '../constants'; // Import GRID_SIZE from constants

// Mock dependencies from prng
jest.mock('./prng', () => ({
  ...jest.requireActual('./prng'), // Keep real mulberry32 etc.
  generateRandomPosition: jest.fn(),
}));

describe('Snake Logic', () => {
  // Use constant GRID_SIZE
  const gridSize = CONST_GRID_SIZE;
  const mockRandomFunc = jest.fn();
  const generateRandomPositionMock = prng.generateRandomPosition as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomFunc.mockReturnValue(0.5); // Default mock random value
    // Restore console spies if they are mock functions
    if (jest.isMockFunction(console.error)) {
      (console.error as jest.Mock).mockRestore();
    }
     if (jest.isMockFunction(console.log)) {
      (console.log as jest.Mock).mockRestore();
    }
     if (jest.isMockFunction(console.warn)) { // Add warn spy restore
      (console.warn as jest.Mock).mockRestore();
    }
  });

  // --- generateNewSnake Tests ---
  describe('generateNewSnake', () => {
    const snakeId = 'player1';
    const occupied: Point[] = [];

    it('should generate a snake with a random position and direction (UP)', () => { // Clarify UP
      const expectedPos = { x: 3, y: 3 };
      generateRandomPositionMock.mockReturnValue(expectedPos);
      mockRandomFunc.mockReturnValue(0); // To select Direction.UP (index 0)

      const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc);

      expect(generateRandomPositionMock).toHaveBeenCalledWith(gridSize, occupied, mockRandomFunc);
      expect(snake.id).toBe(snakeId);
      expect(snake.body).toEqual([expectedPos]);
      expect(snake.direction).toBe(Direction.UP); // Based on mockRandomFunc returning 0
      expect(snake.score).toBe(0);
      expect(snake.activePowerUps).toEqual([]);
      expect(PLAYER_COLORS).toContain(snake.color);
    });

    it('should assign Direction.DOWN based on randomFunc', () => {
        const expectedPos = { x: 3, y: 3 };
        generateRandomPositionMock.mockReturnValue(expectedPos);
        // Assuming Direction enum order: UP, DOWN, LEFT, RIGHT
        mockRandomFunc.mockReturnValue(0.25); // Should result in index 1 (DOWN)

        const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc);
        expect(snake.direction).toBe(Direction.DOWN);
    });

    it('should assign Direction.LEFT based on randomFunc', () => {
        const expectedPos = { x: 3, y: 3 };
        generateRandomPositionMock.mockReturnValue(expectedPos);
        // Assuming Direction enum order: UP, DOWN, LEFT, RIGHT
        mockRandomFunc.mockReturnValue(0.5); // Should result in index 2 (LEFT)

        const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc);
        expect(snake.direction).toBe(Direction.LEFT);
    });

    it('should assign Direction.RIGHT based on randomFunc', () => {
        const expectedPos = { x: 3, y: 3 };
        generateRandomPositionMock.mockReturnValue(expectedPos);
        // Assuming Direction enum order: UP, DOWN, LEFT, RIGHT
        mockRandomFunc.mockReturnValue(0.75); // Should result in index 3 (RIGHT)

        const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc);
        expect(snake.direction).toBe(Direction.RIGHT);
    });

    it('should use preferredColor if provided and valid', () => {
       const preferredColor = '#123456';
       const expectedPos = { x: 4, y: 4 };
       generateRandomPositionMock.mockReturnValue(expectedPos);

       const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc, preferredColor);
       expect(snake.color).toBe(preferredColor);
    });

    it('should fall back to hashed color if preferredColor is invalid', () => {
       const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
       const preferredColor = 'invalid-color';
       const expectedPos = { x: 5, y: 5 };
       generateRandomPositionMock.mockReturnValue(expectedPos);

       const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc, preferredColor);
       expect(snake.color).not.toBe(preferredColor);
       expect(PLAYER_COLORS).toContain(snake.color); // Should be one of the defaults
       expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(`Preferred color '${preferredColor}' for ${snakeId} invalid`));
    });

     it('should fall back to hashed color if preferredColor is missing', () => {
       const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
       const expectedPos = { x: 6, y: 6 };
       generateRandomPositionMock.mockReturnValue(expectedPos);

       const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc);
       expect(PLAYER_COLORS).toContain(snake.color); // Should be one of the defaults
       expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(`Preferred color 'undefined' for ${snakeId} invalid`)); // Check log message
    });

    it('should handle grid full scenario and return a dummy snake at 0,0', () => {
      generateRandomPositionMock.mockReturnValue(null); // Simulate full grid
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc);

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(`Could not generate initial position for snake ${snakeId}`));
      expect(snake.body).toEqual([{ x: 0, y: 0 }]);
      expect(snake.id).toBe(snakeId);
      expect(snake.score).toBe(0);
      expect(snake.direction).toBe(Direction.RIGHT); // Default direction if grid full
      expect(PLAYER_COLORS).toContain(snake.color);
    });
  });

  // --- getNextHeadPosition Tests ---
  describe('getNextHeadPosition', () => {
    const baseSnake: Snake = {
      id: 's1', color: 'red', score: 0, activePowerUps: [],
      body: [{ x: 5, y: 5 }], // Simple snake head
      direction: Direction.RIGHT
    };

    it('should calculate next position UP', () => {
      const nextPos = getNextHeadPosition({ ...baseSnake, direction: Direction.UP }, gridSize);
      expect(nextPos).toEqual({ x: 5, y: 4 });
    });

    it('should calculate next position DOWN', () => {
      const nextPos = getNextHeadPosition({ ...baseSnake, direction: Direction.DOWN }, gridSize);
      expect(nextPos).toEqual({ x: 5, y: 6 });
    });

    it('should calculate next position LEFT', () => {
      const nextPos = getNextHeadPosition({ ...baseSnake, direction: Direction.LEFT }, gridSize);
      expect(nextPos).toEqual({ x: 4, y: 5 });
    });

    it('should calculate next position RIGHT', () => {
      const nextPos = getNextHeadPosition({ ...baseSnake, direction: Direction.RIGHT }, gridSize);
      expect(nextPos).toEqual({ x: 6, y: 5 });
    });

    it('should wrap around the grid - RIGHT to LEFT', () => {
      const s = { ...baseSnake, body: [{ x: gridSize.width - 1, y: 5 }], direction: Direction.RIGHT };
      const nextPos = getNextHeadPosition(s, gridSize);
      expect(nextPos).toEqual({ x: 0, y: 5 });
    });

    it('should wrap around the grid - LEFT to RIGHT', () => {
      const s = { ...baseSnake, body: [{ x: 0, y: 5 }], direction: Direction.LEFT };
      const nextPos = getNextHeadPosition(s, gridSize);
      expect(nextPos).toEqual({ x: gridSize.width - 1, y: 5 });
    });

    it('should wrap around the grid - DOWN to UP', () => {
      const s = { ...baseSnake, body: [{ x: 5, y: gridSize.height - 1 }], direction: Direction.DOWN };
      const nextPos = getNextHeadPosition(s, gridSize);
      expect(nextPos).toEqual({ x: 5, y: 0 });
    });

    it('should wrap around the grid - UP to DOWN', () => {
      const s = { ...baseSnake, body: [{ x: 5, y: 0 }], direction: Direction.UP };
      const nextPos = getNextHeadPosition(s, gridSize);
      expect(nextPos).toEqual({ x: 5, y: gridSize.height - 1 });
    });

    it('should handle empty snake body gracefully', () => {
       const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
       const s = { ...baseSnake, body: [] };
       const nextPos = getNextHeadPosition(s, gridSize);
       expect(nextPos).toEqual({ x: 0, y: 0 }); // Returns default
       expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`Snake ${s.id} has empty body.`));
    });
  });

  // --- moveSnakeBody Tests ---
  describe('moveSnakeBody', () => {
    const baseSnake: Snake = {
      id: 's1', color: 'red', score: 0, direction: Direction.RIGHT, activePowerUps: [],
      body: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }]
    };

    it('should move the snake one step in its direction', () => {
      const movedSnake = moveSnakeBody(baseSnake, gridSize);
      expect(movedSnake.body).toEqual([{ x: 6, y: 5 }, { x: 5, y: 5 }, { x: 4, y: 5 }]);
    });

    it('should preserve other snake properties', () => {
      const movedSnake = moveSnakeBody(baseSnake, gridSize);
      expect(movedSnake.id).toBe(baseSnake.id);
      expect(movedSnake.color).toBe(baseSnake.color);
      expect(movedSnake.direction).toBe(baseSnake.direction);
      expect(movedSnake.score).toBe(baseSnake.score);
      expect(movedSnake.activePowerUps).toBe(baseSnake.activePowerUps);
    });

    it('should handle wrapping correctly during move', () => {
      const wrappingSnake: Snake = {
        ...baseSnake,
        body: [{ x: gridSize.width - 1, y: 5 }, { x: gridSize.width - 2, y: 5 }, { x: gridSize.width - 3, y: 5 }],
        direction: Direction.RIGHT
      };
      const movedSnake = moveSnakeBody(wrappingSnake, gridSize);
      expect(movedSnake.body).toEqual([{ x: 0, y: 5 }, { x: gridSize.width - 1, y: 5 }, { x: gridSize.width - 2, y: 5 }]);
    });

    it('should move a single-segment snake correctly', () => {
        const singleSegmentSnake: Snake = {
            ...baseSnake,
            body: [{ x: 5, y: 5 }],
            direction: Direction.UP
        };
        const movedSnake = moveSnakeBody(singleSegmentSnake, gridSize);
        expect(movedSnake.body).toEqual([{ x: 5, y: 4 }]);
        expect(movedSnake.body.length).toBe(1);
    });
  });

  // --- growSnake Tests ---
  describe('growSnake', () => {
    const baseSnake: Snake = {
      id: 's1', color: 'red', score: 0, direction: Direction.RIGHT, activePowerUps: [],
      body: [{ x: 5, y: 5 }, { x: 4, y: 5 }]
    };

    it('should add a segment to the end of the snake body', () => {
      const grownSnake = growSnake(baseSnake);
      expect(grownSnake.body.length).toBe(baseSnake.body.length + 1);
      expect(grownSnake.body[grownSnake.body.length - 1]).toEqual(baseSnake.body[baseSnake.body.length - 1]);
      expect(grownSnake.body[grownSnake.body.length - 1]).not.toBe(baseSnake.body[baseSnake.body.length - 1]);
    });

     it('should keep the rest of the body intact', () => {
      const grownSnake = growSnake(baseSnake);
      expect(grownSnake.body.slice(0, -1)).toEqual(baseSnake.body);
    });

    it('should preserve other snake properties', () => {
      const grownSnake = growSnake(baseSnake);
      expect(grownSnake.id).toBe(baseSnake.id);
      expect(grownSnake.color).toBe(baseSnake.color);
      expect(grownSnake.direction).toBe(baseSnake.direction);
      expect(grownSnake.score).toBe(baseSnake.score);
      expect(grownSnake.activePowerUps).toBe(baseSnake.activePowerUps);
    });

    it('should return the original snake if the body is empty', () => {
        const emptySnake: Snake = { ...baseSnake, body: [] };
        const grownSnake = growSnake(emptySnake);
        expect(grownSnake).toBe(emptySnake);
        expect(grownSnake.body.length).toBe(0);
    });

    it('should grow a single-segment snake correctly', () => {
        const singleSegmentSnake: Snake = {
            ...baseSnake,
            body: [{ x: 5, y: 5 }]
        };
        const grownSnake = growSnake(singleSegmentSnake);
        expect(grownSnake.body.length).toBe(2);
        expect(grownSnake.body).toEqual([{ x: 5, y: 5 }, { x: 5, y: 5 }]);
        expect(grownSnake.body[1]).toEqual(singleSegmentSnake.body[0]);
        expect(grownSnake.body[1]).not.toBe(singleSegmentSnake.body[0]);
    });
  });
});
