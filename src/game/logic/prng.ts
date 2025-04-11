import { Point } from '../state/types';

// Generate a random color (with high contrast for accessibility)
// Uses a provided random function (expected to return [0, 1))
export const generateRandomColor = (randomFunc: () => number): string => {
  const highContrastColors = [
    '#FF0000', // Red
    '#00FF00', // Lime
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
    '#800080', // Purple
    '#FFFFFF', // White
    '#00FF7F', // SpringGreen
    '#FF69B4', // HotPink
    '#1E90FF' // DodgerBlue
  ];
  return highContrastColors[Math.floor(randomFunc() * highContrastColors.length)];
};

// Generate a random position on the grid that is not occupied
export const generateRandomPosition = (
  gridSize: { width: number; height: number },
  occupiedPositions: Point[],
  randomFunc: () => number
): Point | null => {
  const maxAttempts = gridSize.width * gridSize.height; // Avoid infinite loops
  let attempts = 0;

  while (attempts < maxAttempts) {
    const potentialPos = {
      x: Math.floor(randomFunc() * gridSize.width),
      y: Math.floor(randomFunc() * gridSize.height)
    };

    // Check if the potential position is occupied
    const isOccupied = occupiedPositions.some(
      (occupiedPos) => occupiedPos.x === potentialPos.x && occupiedPos.y === potentialPos.y
    );

    if (!isOccupied) {
      return potentialPos; // Found an unoccupied position
    }

    attempts++;
  }

  // Grid is full or near full, cannot find a free spot after max attempts
  console.warn('Could not find an unoccupied position to generate random item.');
  return null;
};

// Simple Mulberry32 PRNG function generator
// Takes an initial seed and returns a function that generates pseudo-random numbers [0, 1)
export function mulberry32(seed: number): () => number {
  return function () {
    // Use parentheses to clarify operator precedence
    var t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    seed = t; // Update seed for next call
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Helper to get all currently occupied positions
export const getOccupiedPositions = (state: {
  snakes: { body: Point[] }[];
  food: { position: Point }[];
  powerUps: { position: Point }[];
}): Point[] => {
  const positions: Point[] = [];

  state.snakes.forEach((snake) => {
    snake.body.forEach((segment) => {
      positions.push(segment);
    });
  });

  state.food.forEach((f) => {
    positions.push(f.position);
  });

  state.powerUps.forEach((powerUp) => {
    positions.push(powerUp.position);
  });

  return positions;
};
