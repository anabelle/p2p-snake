import { generateFood } from './foodLogic';
import { Point } from '../state/types';
import * as prng from './prng'; // Import all exports from prng
import { FOOD_VALUE } from '../constants';

// Mock the generateRandomPosition function from prng module
jest.mock('./prng', () => ({
  ...jest.requireActual('./prng'), // Keep other exports intact
  generateRandomPosition: jest.fn()
}));

describe('Food Logic', () => {
  const gridSize = { width: 5, height: 5 };
  const occupiedPositions: Point[] = [{ x: 0, y: 0 }];
  const mockRandomFunc = jest.fn(); // Mock random function (though its usage is inside the mocked generateRandomPosition)
  const generateRandomPositionMock = prng.generateRandomPosition as jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Restore console spy if it exists
    if (jest.isMockFunction(console.warn)) {
      (console.warn as jest.Mock).mockRestore();
    }
  });

  it('should generate food at the position returned by generateRandomPosition', () => {
    const expectedPosition: Point = { x: 2, y: 2 };
    generateRandomPositionMock.mockReturnValue(expectedPosition);

    const food = generateFood(gridSize, occupiedPositions, mockRandomFunc);

    expect(generateRandomPositionMock).toHaveBeenCalledWith(
      gridSize,
      occupiedPositions,
      mockRandomFunc
    );
    expect(food).not.toBeNull();
    expect(food).toEqual({
      position: expectedPosition,
      value: FOOD_VALUE
    });
  });

  it('should return null and log a warning if generateRandomPosition returns null', () => {
    generateRandomPositionMock.mockReturnValue(null);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); // Spy on console.warn

    const food = generateFood(gridSize, occupiedPositions, mockRandomFunc);

    expect(generateRandomPositionMock).toHaveBeenCalledWith(
      gridSize,
      occupiedPositions,
      mockRandomFunc
    );
    expect(food).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Could not generate food: No unoccupied position found.');

    warnSpy.mockRestore(); // Clean up the spy
  });

  it('should use the correct FOOD_VALUE constant', () => {
    const expectedPosition: Point = { x: 3, y: 3 };
    generateRandomPositionMock.mockReturnValue(expectedPosition);

    const food = generateFood(gridSize, occupiedPositions, mockRandomFunc);

    expect(food).not.toBeNull();
    expect(food!.value).toBe(FOOD_VALUE); // Check against the imported constant
  });
});
