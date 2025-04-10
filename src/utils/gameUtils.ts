import { Direction, Point, Snake, Food, PowerUp, GameState, PowerUpType } from './types';

// Constants
export const GRID_SIZE = { width: 20, height: 20 };
export const CELL_SIZE = 20;
export const GAME_SPEED = 150; // ms
export const FOOD_VALUE = 10;
export const POWER_UP_DURATION = 10; // seconds

// Generate a random color (with high contrast for accessibility)
export const generateRandomColor = (): string => {
  const highContrastColors = [
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FF8000', // Orange
    '#8000FF', // Purple
  ];
  
  return highContrastColors[Math.floor(Math.random() * highContrastColors.length)];
};

// Generate a random position on the grid
export const generateRandomPosition = (
  gridSize: { width: number; height: number },
  occupiedPositions: Point[]
): Point => {
  let position: Point;
  let isOccupied: boolean;
  
  do {
    position = {
      x: Math.floor(Math.random() * gridSize.width),
      y: Math.floor(Math.random() * gridSize.height),
    };
    
    isOccupied = occupiedPositions.some(
      (pos) => pos.x === position.x && pos.y === position.y
    );
  } while (isOccupied);
  
  return position;
};

// Get all occupied positions from snakes, food, and power-ups
export const getOccupiedPositions = (
  snakes: Snake[],
  food: Food[],
  powerUps: PowerUp[]
): Point[] => {
  const positions: Point[] = [];
  
  // Add snake positions
  snakes.forEach((snake) => {
    snake.body.forEach((segment) => {
      positions.push(segment);
    });
  });
  
  // Add food positions
  food.forEach((f) => {
    positions.push(f.position);
  });
  
  // Add power-up positions
  powerUps.forEach((powerUp) => {
    positions.push(powerUp.position);
  });
  
  return positions;
};

// Check if a snake has collided with a wall
export const hasCollidedWithWall = (
  head: Point,
  gridSize: { width: number; height: number }
): boolean => {
  return (
    head.x < 0 ||
    head.x >= gridSize.width ||
    head.y < 0 ||
    head.y >= gridSize.height
  );
};

// Check if a snake has collided with itself or another snake
export const hasCollidedWithSnake = (
  head: Point,
  snakes: Snake[],
  currentSnakeId: string
): boolean => {
  for (const snake of snakes) {
    // For the current snake, skip the head (first segment)
    const startIndex = snake.id === currentSnakeId ? 1 : 0;
    
    for (let i = startIndex; i < snake.body.length; i++) {
      const segment = snake.body[i];
      if (head.x === segment.x && head.y === segment.y) {
        return true;
      }
    }
  }
  
  return false;
};

// Check if a snake has eaten food
export const hasEatenFood = (
  head: Point,
  food: Food[]
): Food | null => {
  for (let i = 0; i < food.length; i++) {
    if (head.x === food[i].position.x && head.y === food[i].position.y) {
      return food[i];
    }
  }
  
  return null;
};

// Check if a snake has collected a power-up
export const hasCollectedPowerUp = (
  head: Point,
  powerUps: PowerUp[]
): PowerUp | null => {
  for (let i = 0; i < powerUps.length; i++) {
    if (head.x === powerUps[i].position.x && head.y === powerUps[i].position.y) {
      return powerUps[i];
    }
  }
  
  return null;
};

// Move a snake in its current direction
export const moveSnake = (
  snake: Snake,
  grow: boolean = false,
  speedFactor: number = 1
): Snake => {
  const newSnake = { ...snake };
  const head = { ...newSnake.body[0] };
  
  // Determine the new head position based on direction
  switch (newSnake.direction) {
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
  
  // Create a new body with the new head at the beginning
  const newBody = [head, ...newSnake.body];
  
  // If not growing, remove the tail
  if (!grow) {
    newBody.pop();
  }
  
  return { ...newSnake, body: newBody };
};

// Generate a new snake at a random position
export const generateNewSnake = (
  id: string,
  gridSize: { width: number; height: number },
  occupiedPositions: Point[]
): Snake => {
  // Start with a single segment at a random position
  const position = generateRandomPosition(gridSize, occupiedPositions);
  
  return {
    id,
    color: generateRandomColor(),
    body: [position],
    direction: Object.values(Direction)[
      Math.floor(Math.random() * Object.values(Direction).length)
    ],
    score: 0,
    activePowerUps: [],
  };
};

// Generate new food at a random position
export const generateFood = (
  gridSize: { width: number; height: number },
  occupiedPositions: Point[]
): Food => {
  return {
    position: generateRandomPosition(gridSize, occupiedPositions),
    value: FOOD_VALUE,
  };
};

// Generate a new power-up at a random position
export const generatePowerUp = (
  gridSize: { width: number; height: number },
  occupiedPositions: Point[]
): PowerUp => {
  const powerUpTypes = Object.values(PowerUpType);
  const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
  
  return {
    type: randomType,
    position: generateRandomPosition(gridSize, occupiedPositions),
    duration: POWER_UP_DURATION,
  };
};

// Apply power-up effects to a snake
export const applyPowerUpEffect = (
  snake: Snake,
  powerUp: PowerUp
): Snake => {
  const now = Date.now();
  
  return {
    ...snake,
    activePowerUps: [
      ...snake.activePowerUps,
      powerUp.type,
    ],
  };
};

// Check and remove expired power-ups
export const removeExpiredPowerUps = (
  snake: Snake,
  currentTime: number
): Snake => {
  // This would check timestamps and remove expired power-ups
  // For simplicity, we'll just return the snake as is
  return snake;
};

// Get the speed factor based on active power-ups
export const getSpeedFactor = (snake: Snake): number => {
  let speedFactor = 1;
  
  if (snake.activePowerUps.includes(PowerUpType.SPEED)) {
    speedFactor = 1.5; // 50% faster
  } else if (snake.activePowerUps.includes(PowerUpType.SLOW)) {
    speedFactor = 0.5; // 50% slower
  }
  
  return speedFactor;
};

// Get the score multiplier based on active power-ups
export const getScoreMultiplier = (snake: Snake): number => {
  return snake.activePowerUps.includes(PowerUpType.DOUBLE_SCORE) ? 2 : 1;
};

// Check if a snake is invincible
export const isInvincible = (snake: Snake): boolean => {
  return snake.activePowerUps.includes(PowerUpType.INVINCIBILITY);
};

// Update the game state
export const updateGameState = (
  gameState: GameState,
  playerId: string
): GameState => {
  const newState: GameState = JSON.parse(JSON.stringify(gameState));
  newState.sequence += 1;
  newState.timestamp = Date.now();
  
  // Update each snake
  newState.snakes = newState.snakes.map((snake) => {
    // Skip local player's snake, as it's handled by input
    if (snake.id === playerId) {
      return snake;
    }
    
    // Get speed factor
    const speedFactor = getSpeedFactor(snake);
    
    // Move snake
    const movedSnake = moveSnake(snake, false, speedFactor);
    
    return movedSnake;
  });
  
  return newState;
};

// Merge local and remote game states to resolve conflicts
export const mergeGameStates = (
  localState: GameState,
  remoteState: GameState,
  playerId: string
): GameState => {
  // For simplicity, we'll just use the remote state if it's newer
  if (remoteState.sequence > localState.sequence) {
    return remoteState;
  }
  
  return localState;
}; 