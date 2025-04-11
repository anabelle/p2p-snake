import { GameState } from '../game/state/types';
import { GRID_SIZE } from '../game/constants';

// A minimal mock game state for testing purposes
export const mockGameState: GameState = {
  snakes: [], // Add mock snake data if needed
  food: [],
  powerUps: [],
  activePowerUps: [],
  gridSize: GRID_SIZE,
  timestamp: Date.now(), // Use current time or a fixed number
  sequence: 0,
  rngSeed: 12345,
  playerCount: 0,
  powerUpCounter: 0,
  playerStats: {} // Add mock player stats if needed
};
