import { Point } from '../state/types';

export const generateRandomColor = (randomFunc: () => number): string => {
  const highContrastColors = [
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#FFFF00',
    '#FF00FF',
    '#00FFFF',
    '#FFA500',
    '#800080',
    '#FFFFFF',
    '#00FF7F',
    '#FF69B4',
    '#1E90FF'
  ];
  return highContrastColors[Math.floor(randomFunc() * highContrastColors.length)];
};

export const generateRandomPosition = (
  gridSize: { width: number; height: number },
  occupiedPositions: Point[],
  randomFunc: () => number
): Point | null => {
  const maxAttempts = gridSize.width * gridSize.height;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const potentialPos = {
      x: Math.floor(randomFunc() * gridSize.width),
      y: Math.floor(randomFunc() * gridSize.height)
    };

    const isOccupied = occupiedPositions.some(
      (occupiedPos) => occupiedPos.x === potentialPos.x && occupiedPos.y === potentialPos.y
    );

    if (!isOccupied) {
      return potentialPos;
    }

    attempts++;
  }

  console.warn('Could not find an unoccupied position to generate random item.');
  return null;
};

export function mulberry32(seed: number): () => number {
  return function () {
    var t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    seed = t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
