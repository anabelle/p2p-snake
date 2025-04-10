import { Direction, GameState, Point, Snake } from "../state/types";
import { getNextHeadPosition } from "./snakeLogic";
import { hasCollidedWithSnake, hasCollidedWithWall } from "./collision";
import { mulberry32 } from "./prng";

// Constant ID for the AI snake
export const AI_SNAKE_ID = "ai-snake";

// Generate a direction for the AI snake based on the current game state
// This function MUST be deterministic to ensure all clients see the same behavior
export const getAIDirection = (gameState: GameState): Direction => {
  // Find the AI snake
  const aiSnake = gameState.snakes.find(snake => snake.id === AI_SNAKE_ID);
  if (!aiSnake || aiSnake.body.length === 0) {
    return Direction.RIGHT; // Default direction if snake not found
  }

  const currentDirection = aiSnake.direction;
  const head = aiSnake.body[0];
  const gridSize = gameState.gridSize;
  
  // Create a deterministic random function based on the current game state
  // This ensures the AI makes the same decisions on all clients
  const deterministicRandom = mulberry32(gameState.rngSeed + gameState.sequence);
  
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

  // Filter out invalid moves (collisions)
  const validDirections = Object.entries(possibleMoves).filter(([direction, position]) => {
    // Check if this move would result in a collision with a wall
    const wouldCollideWithWall = hasCollidedWithWall(position, gridSize);
    
    // Check if this move would result in a collision with a snake
    const wouldCollideWithSnake = hasCollidedWithSnake(
      position, 
      gameState.snakes,
      AI_SNAKE_ID // Skip collision with AI snake's head
    );
    
    return !wouldCollideWithWall && !wouldCollideWithSnake;
  }).map(([direction]) => direction as Direction);

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
    
    if (directionToFood) {
      return directionToFood;
    }
  }

  // If can't move toward food, select a direction deterministically
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
  gridSize: { width: number, height: number },
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