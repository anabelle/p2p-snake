import { Direction, Point, Snake } from '../state/types';
import { generateRandomPosition } from './prng';
import { PLAYER_COLORS } from '../constants'; // Import player colors
import logger from '../../utils/logger';

// Helper function to get a color for a player ID
// Uses a simple hash modulo to assign a deterministic color from the list
const getPlayerColor = (playerId: string): string => {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash << 5) - hash + playerId.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % PLAYER_COLORS.length;
  return PLAYER_COLORS[index];
};

// Generate a new snake for a player
export const generateNewSnake = (
  id: string,
  gridSize: { width: number; height: number },
  occupiedPositions: Point[],
  randomFunc: () => number,
  preferredColor?: string // Optional preferred color
): Snake => {
  // Start with a single segment at a random, unoccupied position
  const position = generateRandomPosition(gridSize, occupiedPositions, randomFunc);

  // Determine color: Use preferred if valid hex, otherwise fallback to hash
  let finalColor = preferredColor;
  const hexColorRegex = /^#[0-9A-F]{6}$/i;
  if (!finalColor || !hexColorRegex.test(finalColor)) {
    logger.debug(`Preferred color '${preferredColor}' for ${id} invalid or missing, using hash.`);
    finalColor = getPlayerColor(id);
  }

  if (!position) {
    // Handle the rare case where no position could be found (grid full)
    logger.error(`Could not generate initial position for snake ${id}`);
    // Return a dummy snake or throw an error, depending on desired handling
    // For now, placing it at 0,0, which might cause immediate collision
    return {
      id,
      color: finalColor, // Use the determined final color
      body: [{ x: 0, y: 0 }],
      direction: Direction.RIGHT,
      score: 0,
      activePowerUps: []
    };
  }

  const directions = Object.values(Direction);
  const initialDirection = directions[Math.floor(randomFunc() * directions.length)];

  return {
    id,
    color: finalColor, // Use the determined final color
    body: [position],
    direction: initialDirection,
    score: 0,
    activePowerUps: []
  };
};

// Calculate the next head position based on current direction, including screen wrapping
export const getNextHeadPosition = (
  snake: Snake,
  gridSize: { width: number; height: number }
): Point => {
  if (snake.body.length === 0) {
    // Should not happen for a valid snake
    logger.warn(`Snake ${snake.id} has empty body.`);
    return { x: 0, y: 0 };
  }
  const head = { ...snake.body[0] };

  // Calculate raw next position
  switch (snake.direction) {
    case Direction.UP:
      head.y -= 1;
      break;
    case Direction.DOWN:
      head.y += 1;
      break;
    case Direction.LEFT:
      head.x -= 1;
      break;
    case Direction.RIGHT:
      head.x += 1;
      break;
  }

  // Apply screen wrapping
  head.x = ((head.x % gridSize.width) + gridSize.width) % gridSize.width;
  head.y = ((head.y % gridSize.height) + gridSize.height) % gridSize.height;

  return head;
};

// Move a snake forward by one step
// This function *only* calculates the new body based on direction.
// It does NOT handle growth, collision, or state updates.
export const moveSnakeBody = (snake: Snake, gridSize: { width: number; height: number }): Snake => {
  const nextHead = getNextHeadPosition(snake, gridSize);

  // Create new body: add new head, remove last segment (unless snake grows)
  // Growth is handled separately (e.g., after eating food)
  const newBody = [nextHead, ...snake.body.slice(0, -1)];

  return { ...snake, body: newBody };
};

// Grow snake by duplicating the tail segment
export const growSnake = (snake: Snake): Snake => {
  if (snake.body.length === 0) return snake; // Cannot grow empty snake
  const tail = snake.body[snake.body.length - 1];
  return {
    ...snake,
    body: [...snake.body, { ...tail }] // Add a new segment identical to the last one
  };
};
