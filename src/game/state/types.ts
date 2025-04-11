export interface Point {
  x: number;
  y: number;
}

export interface Snake {
  id: string;
  color: string;
  body: Point[];
  direction: Direction;
  score: number;
  activePowerUps: PowerUp[]; // Keep track of active power-ups with expiry
}

export interface Food {
  position: Point;
  value: number;
}

export enum PowerUpType {
  SPEED = 'SPEED',
  SLOW = 'SLOW',
  INVINCIBILITY = 'INVINCIBILITY',
  DOUBLE_SCORE = 'DOUBLE_SCORE'
}

export interface PowerUp {
  id: string; // Unique ID for each power-up instance
  type: PowerUpType;
  position: Point;
  expiresAt: number; // Timestamp when this specific power-up instance expires from the game board
}

export interface ActivePowerUp {
  type: PowerUpType;
  playerId: string; // ID of the snake affected
  expiresAt: number; // Timestamp when the effect expires for this snake
}

export interface PlayerStats {
  id: string;
  name?: string; // Add optional name field
  color: string; // Store color here for persistence
  score: number;
  deaths: number;
  isConnected: boolean;
}

export interface GameState {
  snakes: Snake[];
  food: Food[];
  powerUps: PowerUp[]; // Power-ups available on the grid
  activePowerUps: ActivePowerUp[]; // Power-ups currently affecting snakes
  gridSize: {
    width: number;
    height: number;
  };
  timestamp: number; // Consider removing if unused by core logic
  sequence: number; // Managed by NetplayJS adapter
  rngSeed: number; // For deterministic randomness
  playerCount: number; // Number of active players
  powerUpCounter: number; // Counter for deterministic power-up IDs
  playerStats: Record<string, PlayerStats>; // Add map for player stats
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}
