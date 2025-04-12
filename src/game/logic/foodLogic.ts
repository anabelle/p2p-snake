import { Point, Food } from '../state/types';
import { generateRandomPosition } from './prng';
import { FOOD_VALUE } from '../constants';

export const generateFood = (
  gridSize: { width: number; height: number },
  occupiedPositions: Point[],
  randomFunc: () => number
): Food | null => {
  const position = generateRandomPosition(gridSize, occupiedPositions, randomFunc);
  if (!position) {
    console.warn('Could not generate food: No unoccupied position found.');
    return null;
  }

  return {
    position,
    value: FOOD_VALUE
  };
};
