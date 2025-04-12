import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { generateNewSnake, getNextHeadPosition, moveSnakeBody, growSnake } from './snakeLogic';
import { Point, Snake, Direction } from '../state/types';
import * as prng from './prng';
import { GRID_SIZE as CONST_GRID_SIZE } from '../constants';
import logger from '../../utils/logger';

describe('Snake Logic', () => {
  const gridSize = CONST_GRID_SIZE;
  const mockRandomFunc = jest.fn(() => 0.5);

  let generateRandomPositionSpy: ReturnType<typeof jest.spyOn>;
  let loggerWarnSpy: ReturnType<typeof jest.spyOn>;
  let loggerErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    generateRandomPositionSpy = jest
      .spyOn(prng, 'generateRandomPosition')
      .mockImplementation(() => ({ x: 5, y: 5 }));
    loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    generateRandomPositionSpy.mockRestore();
    loggerWarnSpy.mockRestore();
    loggerErrorSpy.mockRestore();
  });

  describe('generateNewSnake', () => {
    const snakeId = 'player1';
    const occupied: Point[] = [];

    it('should generate a snake with correct properties', () => {
      const expectedPos = { x: 3, y: 3 };
      generateRandomPositionSpy.mockReturnValue(expectedPos);
      mockRandomFunc.mockReturnValue(0);

      const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc);

      expect(generateRandomPositionSpy).toHaveBeenCalledWith(gridSize, occupied, mockRandomFunc);
      expect(snake).not.toBeNull();
      expect(snake!.id).toBe(snakeId);
      expect(typeof snake!.color).toBe('string');
      expect(snake!.color.startsWith('#')).toBe(true);
      expect(snake!.body.length).toBeGreaterThanOrEqual(1);
      expect(snake!.body[0]).toEqual(expectedPos);
      expect([Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]).toContain(
        snake!.direction
      );
      expect(snake!.isAlive).toBe(true);
      expect(snake!.score).toBe(0);
      expect(snake!.partsToGrow).toBe(0);
      expect(snake!.speed).toBeGreaterThan(0);
      expect(snake!.effects).toEqual({});
    });

    it('should return a fallback snake and log error if generateRandomPosition returns null', () => {
      generateRandomPositionSpy.mockReturnValue(null);

      const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc);

      expect(snake).not.toBeNull();
      expect(snake!.id).toBe(snakeId);
      expect(snake!.body.length).toBeGreaterThanOrEqual(1);
      expect(snake!.body[0]).toEqual({ x: 0, y: 0 });
      expect(snake!.direction).toEqual(Direction.RIGHT);
      expect(snake!.isAlive).toBe(true);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not generate initial position for snake')
      );
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should assign Direction.UP based on randomFunc', () => {
      const expectedPos = { x: 3, y: 3 };
      generateRandomPositionSpy.mockReturnValue(expectedPos);
      mockRandomFunc.mockReturnValue(0);
      const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc);
      expect(snake!.direction).toEqual(Direction.UP);
    });

    it('should assign Direction.DOWN based on randomFunc', () => {
      const expectedPos = { x: 3, y: 3 };
      generateRandomPositionSpy.mockReturnValue(expectedPos);
      mockRandomFunc.mockReturnValue(0.25);
      const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc);
      expect(snake!.direction).toEqual(Direction.DOWN);
    });

    it('should assign Direction.LEFT based on randomFunc', () => {
      const expectedPos = { x: 3, y: 3 };
      generateRandomPositionSpy.mockReturnValue(expectedPos);
      mockRandomFunc.mockReturnValue(0.5);
      const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc);
      expect(snake!.direction).toEqual(Direction.LEFT);
    });

    it('should assign Direction.RIGHT based on randomFunc', () => {
      const expectedPos = { x: 3, y: 3 };
      generateRandomPositionSpy.mockReturnValue(expectedPos);
      mockRandomFunc.mockReturnValue(0.75);
      const snake = generateNewSnake(snakeId, gridSize, occupied, mockRandomFunc);
      expect(snake!.direction).toEqual(Direction.RIGHT);
    });

    it('should handle occupied positions correctly during generation', () => {
      const heavilyOccupied: Point[] = [];
      for (let x = 0; x < gridSize.width; x++) {
        for (let y = 0; y < gridSize.height; y++) {
          if (x !== 5 || y !== 5) {
            heavilyOccupied.push({ x, y });
          }
        }
      }
      const expectedPosition = { x: 5, y: 5 };
      generateRandomPositionSpy.mockReturnValue(expectedPosition);

      const snake = generateNewSnake('player4', gridSize, heavilyOccupied, mockRandomFunc);

      expect(generateRandomPositionSpy).toHaveBeenCalled();
      expect(snake).not.toBeNull();
      expect(snake!.body[0]).toEqual(expectedPosition);
    });
  });

  describe('getNextHeadPosition', () => {
    const baseSnake: Snake = {
      id: 's1',
      color: 'red',
      score: 0,
      activePowerUps: [],
      body: [{ x: 5, y: 5 }],
      direction: Direction.RIGHT,
      isAlive: true,
      partsToGrow: 0,
      speed: 1,
      effects: {}
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
      const s = {
        ...baseSnake,
        body: [{ x: gridSize.width - 1, y: 5 }],
        direction: Direction.RIGHT
      };
      const nextPos = getNextHeadPosition(s, gridSize);
      expect(nextPos).toEqual({ x: 0, y: 5 });
    });

    it('should wrap around the grid - LEFT to RIGHT', () => {
      const s = { ...baseSnake, body: [{ x: 0, y: 5 }], direction: Direction.LEFT };
      const nextPos = getNextHeadPosition(s, gridSize);
      expect(nextPos).toEqual({ x: gridSize.width - 1, y: 5 });
    });

    it('should wrap around the grid - DOWN to UP', () => {
      const s = {
        ...baseSnake,
        body: [{ x: 5, y: gridSize.height - 1 }],
        direction: Direction.DOWN
      };
      const nextPos = getNextHeadPosition(s, gridSize);
      expect(nextPos).toEqual({ x: 5, y: 0 });
    });

    it('should wrap around the grid - UP to DOWN', () => {
      const s = { ...baseSnake, body: [{ x: 5, y: 0 }], direction: Direction.UP };
      const nextPos = getNextHeadPosition(s, gridSize);
      expect(nextPos).toEqual({ x: 5, y: gridSize.height - 1 });
    });

    it('should handle empty snake body gracefully', () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const s = { ...baseSnake, body: [] };
      const nextPos = getNextHeadPosition(s, gridSize);
      expect(nextPos).toEqual({ x: 0, y: 0 });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Snake ${s.id} has empty body.`)
      );
      warnSpy.mockRestore();
    });
  });

  describe('moveSnakeBody', () => {
    const baseSnake: Snake = {
      id: 's1',
      color: 'red',
      score: 0,
      direction: Direction.RIGHT,
      activePowerUps: [],
      body: [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 }
      ],
      isAlive: true,
      partsToGrow: 0,
      speed: 1,
      effects: {}
    };

    it('should move the snake body correctly', () => {
      const testSnake = { ...baseSnake };
      const movedSnake = moveSnakeBody(testSnake, gridSize);
      expect(movedSnake.body).toEqual([
        { x: 6, y: 5 },
        { x: 5, y: 5 },
        { x: 4, y: 5 }
      ]);
    });

    it('should handle snake with single segment', () => {
      const testSnake = {
        ...baseSnake,
        body: [{ x: 1, y: 1 }],
        direction: Direction.DOWN
      };
      const movedSnake = moveSnakeBody(testSnake, gridSize);
      expect(movedSnake.body).toEqual([{ x: 1, y: 2 }]);
    });

    it('should preserve other snake properties', () => {
      const movedSnake = moveSnakeBody({ ...baseSnake }, gridSize);
      expect(movedSnake.id).toBe(baseSnake.id);
      expect(movedSnake.color).toBe(baseSnake.color);
      expect(movedSnake.direction).toBe(baseSnake.direction);
      expect(movedSnake.score).toBe(baseSnake.score);
      expect(movedSnake.activePowerUps).toEqual(baseSnake.activePowerUps);
      expect(movedSnake.isAlive).toBe(baseSnake.isAlive);
      expect(movedSnake.partsToGrow).toBe(baseSnake.partsToGrow);
      expect(movedSnake.speed).toBe(baseSnake.speed);
      expect(movedSnake.effects).toEqual(baseSnake.effects);
    });

    it('should handle wrapping correctly during move', () => {
      const wrappingSnake: Snake = {
        ...baseSnake,
        body: [
          { x: gridSize.width - 1, y: 5 },
          { x: gridSize.width - 2, y: 5 },
          { x: gridSize.width - 3, y: 5 }
        ],
        direction: Direction.RIGHT
      };
      const movedSnake = moveSnakeBody(wrappingSnake, gridSize);
      expect(movedSnake.body).toEqual([
        { x: 0, y: 5 },
        { x: gridSize.width - 1, y: 5 },
        { x: gridSize.width - 2, y: 5 }
      ]);
    });
  });

  describe('growSnake', () => {
    const baseSnake: Snake = {
      id: 's1',
      color: 'red',
      score: 0,
      direction: Direction.RIGHT,
      activePowerUps: [],
      body: [
        { x: 5, y: 5 },
        { x: 4, y: 5 }
      ],
      isAlive: true,
      partsToGrow: 0,
      speed: 1,
      effects: {}
    };

    it('should add a segment identical to the tail', () => {
      const testSnake = { ...baseSnake };
      const grownSnake = growSnake(testSnake);
      expect(grownSnake.body.length).toBe(baseSnake.body.length + 1);
      expect(grownSnake.body[grownSnake.body.length - 1]).toEqual(
        baseSnake.body[baseSnake.body.length - 1]
      );
      expect(grownSnake.body[grownSnake.body.length - 1]).not.toBe(
        baseSnake.body[baseSnake.body.length - 1]
      );
    });

    it('should keep the rest of the body intact', () => {
      const grownSnake = growSnake({ ...baseSnake });
      expect(grownSnake.body.slice(0, -1)).toEqual(baseSnake.body);
    });

    it('should preserve other snake properties', () => {
      const grownSnake = growSnake({ ...baseSnake });
      expect(grownSnake.id).toBe(baseSnake.id);
      expect(grownSnake.color).toBe(baseSnake.color);
      expect(grownSnake.direction).toBe(baseSnake.direction);
      expect(grownSnake.score).toBe(baseSnake.score);
      expect(grownSnake.activePowerUps).toEqual(baseSnake.activePowerUps);
      expect(grownSnake.isAlive).toBe(baseSnake.isAlive);
      expect(grownSnake.partsToGrow).toBe(baseSnake.partsToGrow);
      expect(grownSnake.speed).toBe(baseSnake.speed);
      expect(grownSnake.effects).toEqual(baseSnake.effects);
    });

    it('should grow a single-segment snake correctly', () => {
      const singleSegmentSnake: Snake = {
        ...baseSnake,
        body: [{ x: 5, y: 5 }]
      };
      const grownSnake = growSnake(singleSegmentSnake);
      expect(grownSnake.body.length).toBe(2);
      expect(grownSnake.body).toEqual([
        { x: 5, y: 5 },
        { x: 5, y: 5 }
      ]);
      expect(grownSnake.body[1]).toEqual(singleSegmentSnake.body[0]);
      expect(grownSnake.body[1]).not.toBe(singleSegmentSnake.body[0]);
    });

    it('should return the original snake if the body is empty', () => {
      const emptySnake: Snake = { ...baseSnake, body: [] };
      const grownSnake = growSnake(emptySnake);
      expect(grownSnake).toBe(emptySnake);
      expect(grownSnake.body.length).toBe(0);
    });
  });
});
