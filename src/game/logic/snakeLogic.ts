import { Direction, Point, Snake } from '../state/types';
import { generateRandomPosition } from './prng';
import { PLAYER_COLORS } from '../constants';
import logger from '../../utils/logger';

const getPlayerColor = (playerId: string): string => {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash << 5) - hash + playerId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PLAYER_COLORS.length;
  return PLAYER_COLORS[index];
};

export const generateNewSnake = (
  id: string,
  gridSize: { width: number; height: number },
  occupiedPositions: Point[],
  randomFunc: () => number,
  preferredColor?: string
): Snake => {
  const position = generateRandomPosition(gridSize, occupiedPositions, randomFunc);

  let finalColor = preferredColor;
  const hexColorRegex = /^#[0-9A-F]{6}$/i;
  if (!finalColor || !hexColorRegex.test(finalColor)) {
    logger.debug(`Preferred color '${preferredColor}' for ${id} invalid or missing, using hash.`);
    finalColor = getPlayerColor(id);
  }

  const initialProps = {
    isAlive: true,
    partsToGrow: 0,
    speed: 1,
    effects: {},
    activePowerUps: []
  };

  if (!position) {
    logger.error(`Could not generate initial position for snake ${id}`);
    return {
      id,
      color: finalColor,
      body: [{ x: 0, y: 0 }],
      direction: Direction.RIGHT,
      score: 0,
      ...initialProps
    };
  }

  const directions = Object.values(Direction);
  const initialDirection = directions[Math.floor(randomFunc() * directions.length)];

  return {
    id,
    color: finalColor,
    body: [position],
    direction: initialDirection,
    score: 0,
    ...initialProps
  };
};

export const getNextHeadPosition = (
  snake: Snake,
  gridSize: { width: number; height: number }
): Point => {
  if (snake.body.length === 0) {
    logger.warn(`Snake ${snake.id} has empty body.`);
    return { x: 0, y: 0 };
  }
  const head = { ...snake.body[0] };

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

  head.x = ((head.x % gridSize.width) + gridSize.width) % gridSize.width;
  head.y = ((head.y % gridSize.height) + gridSize.height) % gridSize.height;

  return head;
};

export const moveSnakeBody = (snake: Snake, gridSize: { width: number; height: number }): Snake => {
  const nextHead = getNextHeadPosition(snake, gridSize);

  const newBody = [nextHead, ...snake.body.slice(0, -1)];

  return { ...snake, body: newBody };
};

export const growSnake = (snake: Snake): Snake => {
  if (snake.body.length === 0) return snake;
  const tail = snake.body[snake.body.length - 1];
  return {
    ...snake,
    body: [...snake.body, { ...tail }]
  };
};
