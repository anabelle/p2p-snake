import { Point, Snake, Food, PowerUp } from '../state/types';

// Check if a point has collided with a wall
export const hasCollidedWithWall = (
  point: Point,
  gridSize: { width: number; height: number }
): boolean => {
  return point.x < 0 || point.x >= gridSize.width || point.y < 0 || point.y >= gridSize.height;
};

// Check if a point (typically a snake head) has collided with any snake body
export const hasCollidedWithSnake = (
  point: Point,
  snakes: Snake[],
  currentSnakeId?: string // Optional: If provided, skip collision with this snake's head
): boolean => {
  for (const snake of snakes) {
    // Start checking from index 1 if it's the current snake (don't collide with own head)
    const startIndex = snake.id === currentSnakeId ? 1 : 0;

    for (let i = startIndex; i < snake.body.length; i++) {
      const segment = snake.body[i];
      if (point.x === segment.x && point.y === segment.y) {
        return true; // Collision detected
      }
    }
  }
  return false; // No collision
};

// Check if a point (typically a snake head) is on a food item
// Returns the food item if found, otherwise null
export const checkFoodCollision = (point: Point, food: Food[]): Food | null => {
  return food.find((f) => f.position.x === point.x && f.position.y === point.y) || null;
};

// Check if a point (typically a snake head) is on a power-up item
// Returns the power-up item if found, otherwise null
export const checkPowerUpCollision = (point: Point, powerUps: PowerUp[]): PowerUp | null => {
  return powerUps.find((p) => p.position.x === point.x && p.position.y === point.y) || null;
};
