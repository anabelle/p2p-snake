import { GameState } from '../game/state/types';
import { GRID_SIZE } from '../game/constants';

export const mockGameState: GameState = {
  snakes: [],
  food: [],
  powerUps: [],
  activePowerUps: [],
  gridSize: GRID_SIZE,
  timestamp: Date.now(),
  sequence: 0,
  rngSeed: 12345,
  playerCount: 0,
  powerUpCounter: 0,
  playerStats: {}
};
