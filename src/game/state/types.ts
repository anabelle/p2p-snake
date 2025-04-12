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
  activePowerUps: PowerUp[];
  isAlive: boolean;
  partsToGrow: number;
  speed: number;
  effects: Record<string, any>;
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
  id: string;
  type: PowerUpType;
  position: Point;
  expiresAt: number;
}

export interface ActivePowerUp {
  type: PowerUpType;
  playerId: string;
  expiresAt: number;
}

export interface PlayerStats {
  id: string;
  name?: string;
  color: string;
  score: number;
  deaths: number;
  isConnected: boolean;
}

export interface GameState {
  snakes: Snake[];
  food: Food[];
  powerUps: PowerUp[];
  activePowerUps: ActivePowerUp[];
  gridSize: {
    width: number;
    height: number;
  };
  timestamp: number;
  sequence: number;
  rngSeed: number;
  playerCount: number;
  powerUpCounter: number;
  playerStats: Record<string, PlayerStats>;
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}
