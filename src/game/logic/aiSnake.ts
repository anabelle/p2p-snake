import { Direction, GameState, Point } from '../state/types';
import { hasCollidedWithSnake, hasCollidedWithWall } from './collision';
import { mulberry32 } from './prng';

export const AI_SNAKE_ID = 'ai-snake';

export const getAIDirection = (gameState: GameState): Direction => {
  const aiSnake = gameState.snakes.find((snake) => snake.id === AI_SNAKE_ID);
  if (!aiSnake || aiSnake.body.length === 0) {
    return Direction.RIGHT;
  }

  const currentDirection = aiSnake.direction;
  const head = aiSnake.body[0];
  const gridSize = gameState.gridSize;

  const deterministicRandom = mulberry32(gameState.rngSeed + gameState.sequence);

  const mistakeProbability = Math.min(0.05 + aiSnake.body.length * 0.002, 0.15);
  const makeMistake = deterministicRandom() < mistakeProbability;

  const possibleMoves: Record<Direction, Point> = {
    [Direction.UP]: {
      x: head.x,
      y: (head.y - 1 + gridSize.height) % gridSize.height
    },
    [Direction.DOWN]: {
      x: head.x,
      y: (head.y + 1) % gridSize.height
    },
    [Direction.LEFT]: {
      x: (head.x - 1 + gridSize.width) % gridSize.width,
      y: head.y
    },
    [Direction.RIGHT]: {
      x: (head.x + 1) % gridSize.width,
      y: head.y
    }
  };

  const allDirections = Object.keys(possibleMoves) as Direction[];

  if (makeMistake) {
    const severeError = deterministicRandom() < 0.5;

    if (severeError) {
      const randomIndex = Math.floor(deterministicRandom() * allDirections.length);
      const randomDirection = allDirections[randomIndex];

      const isOpposite =
        (randomDirection === Direction.UP && currentDirection === Direction.DOWN) ||
        (randomDirection === Direction.DOWN && currentDirection === Direction.UP) ||
        (randomDirection === Direction.LEFT && currentDirection === Direction.RIGHT) ||
        (randomDirection === Direction.RIGHT && currentDirection === Direction.LEFT);

      if (!isOpposite || aiSnake.body.length === 1) {
        return randomDirection;
      }
    }
  }

  const validDirections = Object.entries(possibleMoves)
    .filter(([direction, position]) => {
      const wouldCollideWithWall = hasCollidedWithWall(position, gridSize);

      const wouldCollideWithSnake = hasCollidedWithSnake(position, gameState.snakes, AI_SNAKE_ID);

      return !wouldCollideWithWall && !wouldCollideWithSnake;
    })
    .map(([direction]) => direction as Direction);

  if (validDirections.length === 0) {
    return currentDirection;
  }

  if (gameState.food.length > 0) {
    const sortedFoods = [...gameState.food].sort((a, b) => {
      const distA = calculateDistance(head, a.position);
      const distB = calculateDistance(head, b.position);
      return distA - distB;
    });

    const closestFood = sortedFoods[0];

    const directionToFood = getDirectionToTarget(
      head,
      closestFood.position,
      gridSize,
      validDirections
    );

    if (directionToFood && (!makeMistake || deterministicRandom() > 0.7)) {
      return directionToFood;
    }
  }

  if (validDirections.includes(currentDirection)) {
    return currentDirection;
  }

  const sortedDirections = [...validDirections].sort();

  const randomIndex = Math.floor(deterministicRandom() * sortedDirections.length);
  return sortedDirections[randomIndex];
};

const calculateDistance = (a: Point, b: Point): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

const getDirectionToTarget = (
  current: Point,
  target: Point,
  gridSize: { width: number; height: number },
  validDirections: Direction[]
): Direction | null => {
  const xDiff = calculateWrappedDifference(current.x, target.x, gridSize.width);
  const yDiff = calculateWrappedDifference(current.y, target.y, gridSize.height);

  const preferredDirections: Direction[] = [];

  if (Math.abs(xDiff) > Math.abs(yDiff)) {
    if (xDiff < 0) {
      preferredDirections.push(Direction.LEFT);
    } else if (xDiff > 0) {
      preferredDirections.push(Direction.RIGHT);
    }

    if (yDiff < 0) {
      preferredDirections.push(Direction.UP);
    } else if (yDiff > 0) {
      preferredDirections.push(Direction.DOWN);
    }
  } else {
    if (yDiff < 0) {
      preferredDirections.push(Direction.UP);
    } else if (yDiff > 0) {
      preferredDirections.push(Direction.DOWN);
    }

    if (xDiff < 0) {
      preferredDirections.push(Direction.LEFT);
    } else if (xDiff > 0) {
      preferredDirections.push(Direction.RIGHT);
    }
  }

  for (const direction of preferredDirections) {
    if (validDirections.includes(direction)) {
      return direction;
    }
  }

  return null;
};

const calculateWrappedDifference = (a: number, b: number, size: number): number => {
  const direct = b - a;
  const wrapped = direct > 0 ? direct - size : direct + size;

  return Math.abs(direct) < Math.abs(wrapped) ? direct : wrapped;
};
