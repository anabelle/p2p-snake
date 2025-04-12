// @ts-nocheck

import {
  generateRandomColor,
  generateRandomPosition,
  mulberry32,
  getOccupiedPositions
} from './prng';
import { Point } from '../state/types';

interface MockState {
  snakes: { body: Point[] }[];
  food: { position: Point }[];
  powerUps: { position: Point }[];
}

describe('PRNG Logic', () => {
  describe('mulberry32', () => {
    it('should return a function', () => {
      const randomFunc = mulberry32(123);
      expect(typeof randomFunc).toBe('function');
    });

    it('should produce deterministic numbers between 0 and 1', () => {
      const seed = 42;
      const randomFunc1 = mulberry32(seed);
      const randomFunc2 = mulberry32(seed);

      const results1 = Array.from({ length: 5 }, randomFunc1);
      const results2 = Array.from({ length: 5 }, randomFunc2);

      expect(results1).toEqual(results2);
      results1.forEach((num) => {
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThan(1);
      });
    });

    it('should produce different sequences for different seeds', () => {
      const randomFunc1 = mulberry32(1);
      const randomFunc2 = mulberry32(2);
      expect(randomFunc1()).not.toEqual(randomFunc2());
    });
  });

  describe('generateRandomColor', () => {
    it('should return a color string from the list using the provided random function', () => {
      const mockRandomFunc = jest.fn().mockReturnValue(0);
      const color = generateRandomColor(mockRandomFunc);
      expect(typeof color).toBe('string');
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(mockRandomFunc).toHaveBeenCalledTimes(1);

      mockRandomFunc.mockReturnValue(0.5);
      const color2 = generateRandomColor(mockRandomFunc);
      expect(typeof color2).toBe('string');
      expect(color2).not.toEqual(color);
    });
  });

  describe('generateRandomPosition', () => {
    const gridSize = { width: 3, height: 3 };
    let randomFunc: () => number;

    beforeEach(() => {
      randomFunc = mulberry32(Date.now());
    });

    it('should generate a position within grid bounds', () => {
      const occupied: Point[] = [];
      const pos = generateRandomPosition(gridSize, occupied, randomFunc);
      expect(pos).not.toBeNull();
      expect(pos!.x).toBeGreaterThanOrEqual(0);
      expect(pos!.x).toBeLessThan(gridSize.width);
      expect(pos!.y).toBeGreaterThanOrEqual(0);
      expect(pos!.y).toBeLessThan(gridSize.height);
    });

    it('should generate a position not in occupiedPositions', () => {
      const occupied: Point[] = [
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      ];

      const mockRandomFunc = jest
        .fn()
        .mockReturnValueOnce(0 / 3)
        .mockReturnValueOnce(0 / 3)
        .mockReturnValueOnce(1 / 3)
        .mockReturnValueOnce(1 / 3)
        .mockReturnValueOnce(2 / 3)
        .mockReturnValueOnce(2 / 3);

      const pos = generateRandomPosition(gridSize, occupied, mockRandomFunc);
      expect(pos).toEqual({ x: 2, y: 2 });
    });

    it('should return null if the grid is full', () => {
      const occupied: Point[] = [];
      for (let x = 0; x < gridSize.width; x++) {
        for (let y = 0; y < gridSize.height; y++) {
          occupied.push({ x, y });
        }
      }
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const pos = generateRandomPosition(gridSize, occupied, randomFunc);
      expect(pos).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        'Could not find an unoccupied position to generate random item.'
      );
      warnSpy.mockRestore();
    });
  });

  describe('getOccupiedPositions', () => {
    it('should return an empty array for an empty state', () => {
      const state: MockState = { snakes: [], food: [], powerUps: [] };
      expect(getOccupiedPositions(state)).toEqual([]);
    });

    it('should return positions occupied by snakes', () => {
      const state: MockState = {
        snakes: [
          {
            body: [
              { x: 0, y: 0 },
              { x: 0, y: 1 }
            ]
          },
          { body: [{ x: 2, y: 2 }] }
        ],
        food: [],
        powerUps: []
      };
      const expected = [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 2, y: 2 }
      ];
      expect(getOccupiedPositions(state)).toEqual(expect.arrayContaining(expected));
      expect(getOccupiedPositions(state).length).toBe(expected.length);
    });

    it('should return positions occupied by food', () => {
      const state: MockState = {
        snakes: [],
        food: [{ position: { x: 1, y: 1 } }, { position: { x: 3, y: 3 } }],
        powerUps: []
      };
      const expected = [
        { x: 1, y: 1 },
        { x: 3, y: 3 }
      ];
      expect(getOccupiedPositions(state)).toEqual(expect.arrayContaining(expected));
      expect(getOccupiedPositions(state).length).toBe(expected.length);
    });

    it('should return positions occupied by powerUps', () => {
      const state: MockState = {
        snakes: [],
        food: [],
        powerUps: [{ position: { x: 4, y: 4 } }]
      };
      const expected = [{ x: 4, y: 4 }];
      expect(getOccupiedPositions(state)).toEqual(expect.arrayContaining(expected));
      expect(getOccupiedPositions(state).length).toBe(expected.length);
    });

    it('should return all occupied positions from snakes, food, and powerUps', () => {
      const state: MockState = {
        snakes: [{ body: [{ x: 0, y: 0 }] }],
        food: [{ position: { x: 1, y: 1 } }],
        powerUps: [{ position: { x: 2, y: 2 } }]
      };
      const expected = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 }
      ];
      expect(getOccupiedPositions(state)).toEqual(expect.arrayContaining(expected));
      expect(getOccupiedPositions(state).length).toBe(expected.length);
    });

    it('should include duplicate positions if present', () => {
      const state: MockState = {
        snakes: [{ body: [{ x: 0, y: 0 }] }],
        food: [{ position: { x: 0, y: 0 } }],
        powerUps: []
      };
      const expected = [
        { x: 0, y: 0 },
        { x: 0, y: 0 }
      ];
      expect(getOccupiedPositions(state)).toEqual(expect.arrayContaining(expected));
      expect(getOccupiedPositions(state).length).toBe(expected.length);
    });
  });
});
