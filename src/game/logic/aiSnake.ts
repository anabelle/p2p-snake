import { Direction, GameState, Point } from '../state/types';
import { hasCollidedWithSnake, hasCollidedWithWall } from './collision';
import { mulberry32 } from './prng';

// Constant ID for the AI snake
export const AI_SNAKE_ID = 'ai-snake';

// Generate a direction for the AI snake based on the current game state
// This function MUST be deterministic to ensure all clients see the same behavior
export const getAIDirection = (gameState: GameState): Direction => {
  // Find the AI snake
  const aiSnake = gameState.snakes.find((snake) => snake.id === AI_SNAKE_ID);
  if (!aiSnake || aiSnake.body.length === 0) {
    return Direction.RIGHT; // Default direction if snake not found
  }

  const currentDirection = aiSnake.direction;
  const head = aiSnake.body[0];
  const gridSize = gameState.gridSize;

  // Create a deterministic random function based on the current game state
  // This ensures the AI makes the same decisions on all clients
  const deterministicRandom = mulberry32(gameState.rngSeed + gameState.sequence);

  // Add a chance of making a "mistake" - more likely with longer snakes (increases difficulty)
  // The calculation ensures the result is deterministic across all clients
  const mistakeProbability = Math.min(0.05 + aiSnake.body.length * 0.002, 0.15);
  const makeMistake = deterministicRandom() < mistakeProbability;

  // Calculate possible next positions for each direction
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

  // Get all possible directions regardless of collision
  const allDirections = Object.keys(possibleMoves) as Direction[];

  // If we're making a mistake, potentially choose a direction that might lead to collision
  if (makeMistake) {
    // 50% chance to make a truly poor decision (potentially leading to collision)
    // Otherwise, just make a non-optimal but still safe move
    const severeError = deterministicRandom() < 0.5;

    if (severeError) {
      // Choose a random direction that may lead to collision
      const randomIndex = Math.floor(deterministicRandom() * allDirections.length);
      const randomDirection = allDirections[randomIndex];

      // Don't go directly back into own neck though - that's too obvious
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

  // Normal AI behavior if not making a mistake (or if severe error would cause obvious death)
  // Filter out invalid moves (collisions)
  const validDirections = Object.entries(possibleMoves)
    .filter(([direction, position]) => {
      // Check if this move would result in a collision with a wall
      const wouldCollideWithWall = hasCollidedWithWall(position, gridSize);

      // Check if this move would result in a collision with a snake
      const wouldCollideWithSnake = hasCollidedWithSnake(
        position,
        gameState.snakes,
        AI_SNAKE_ID // Skip collision with AI snake's head
      );

      return !wouldCollideWithWall && !wouldCollideWithSnake;
    })
    .map(([direction]) => direction as Direction);

  // If no valid directions, return current direction (will likely die)
  if (validDirections.length === 0) {
    return currentDirection;
  }

  // Find closest food using deterministic approach
  if (gameState.food.length > 0) {
    // Sort foods based on distance - using a stable sort for determinism
    const sortedFoods = [...gameState.food].sort((a, b) => {
      const distA = calculateDistance(head, a.position);
      const distB = calculateDistance(head, b.position);
      return distA - distB;
    });

    // Always target the closest food for determinism
    const closestFood = sortedFoods[0];

    // Try to move toward the food if possible
    const directionToFood = getDirectionToTarget(
      head,
      closestFood.position,
      gridSize,
      validDirections
    );

    // Even when not making a severe mistake, occasionally don't choose the optimal path
    // This creates more natural-looking movement
    if (directionToFood && (!makeMistake || deterministicRandom() > 0.7)) {
      return directionToFood;
    }
  }

  // If can't move toward food, or deliberately choosing suboptimal path,
  // select a direction deterministically
  // Prefer continuing in same direction if that's valid
  if (validDirections.includes(currentDirection)) {
    return currentDirection;
  }

  // Sort valid directions for deterministic selection
  const sortedDirections = [...validDirections].sort();

  // Use deterministic random to select from sorted valid directions
  const randomIndex = Math.floor(deterministicRandom() * sortedDirections.length);
  return sortedDirections[randomIndex];
};

// Calculate the Manhattan distance between two points (considering grid wrapping)
const calculateDistance = (a: Point, b: Point): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

// Get the direction that would move toward a target
const getDirectionToTarget = (
  current: Point,
  target: Point,
  gridSize: { width: number; height: number },
  validDirections: Direction[]
): Direction | null => {
  // Calculate relative position (considering wrapping)
  const xDiff = calculateWrappedDifference(current.x, target.x, gridSize.width);
  const yDiff = calculateWrappedDifference(current.y, target.y, gridSize.height);

  // Determine preferred directions based on relative position
  let preferredDirections: Direction[] = [];

  // Decide whether to prioritize x or y movement
  if (Math.abs(xDiff) > Math.abs(yDiff)) {
    // Prioritize horizontal movement
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
    // Prioritize vertical movement
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

  // Find the first preferred direction that's valid
  for (const direction of preferredDirections) {
    if (validDirections.includes(direction)) {
      return direction;
    }
  }

  return null; // No valid preferred direction found
};

// Calculate the wrapped difference between two coordinates
const calculateWrappedDifference = (a: number, b: number, size: number): number => {
  const direct = b - a;
  const wrapped = direct > 0 ? direct - size : direct + size;

  // Return the smaller absolute difference
  return Math.abs(direct) < Math.abs(wrapped) ? direct : wrapped;
};
