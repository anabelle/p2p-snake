import { Point, Snake, Food, PowerUp } from '../state/types';

export const hasCollidedWithWall = (
  point: Point,
  gridSize: { width: number; height: number }
): boolean => {
  return point.x < 0 || point.x >= gridSize.width || point.y < 0 || point.y >= gridSize.height;
};

export const hasCollidedWithSnake = (
  point: Point,
  snakes: Snake[],
  currentSnakeId?: string
): boolean => {
  for (const snake of snakes) {
    const startIndex = snake.id === currentSnakeId ? 1 : 0;

    for (let i = startIndex; i < snake.body.length; i++) {
      const segment = snake.body[i];
      if (point.x === segment.x && point.y === segment.y) {
        return true;
      }
    }
  }
  return false;
};

export const checkFoodCollision = (point: Point, food: Food[]): Food | null => {
  return food.find((f) => f.position.x === point.x && f.position.y === point.y) || null;
};

export const checkPowerUpCollision = (point: Point, powerUps: PowerUp[]): PowerUp | null => {
  return powerUps.find((p) => p.position.x === point.x && p.position.y === point.y) || null;
};
