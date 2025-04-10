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
  activePowerUps: PowerUpType[];
}

export interface Food {
  position: Point;
  value: number;
}

export interface PowerUp {
  type: PowerUpType;
  position: Point;
  duration: number; // Duration in seconds
  expiresAt?: number; // Timestamp when the power-up expires
}

export interface GameState {
  snakes: Snake[];
  food: Food[];
  powerUps: PowerUp[];
  gridSize: {
    width: number;
    height: number;
  };
  timestamp: number;
  sequence: number;
}

export enum Direction {
  UP = "UP",
  DOWN = "DOWN",
  LEFT = "LEFT",
  RIGHT = "RIGHT",
}

export enum PowerUpType {
  SPEED = "SPEED",
  SLOW = "SLOW",
  INVINCIBILITY = "INVINCIBILITY",
  DOUBLE_SCORE = "DOUBLE_SCORE",
}

export interface PeerMessage {
  type: 'STATE_UPDATE' | 'PLAYER_JOIN' | 'PLAYER_LEAVE' | 'DIRECTION_CHANGE';
  data: any;
  senderId: string;
  timestamp: number;
  sequence: number;
}

export interface Peer {
  id: string;
  connection: any; // Will be replaced with SimplePeer.Instance
} 