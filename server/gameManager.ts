import { GameState, Direction, PlayerStats } from '../src/game/state/types';
import { GAME_SPEED_MS, GRID_SIZE } from '../src/game/constants';
import { updateGame, PlayerInputs } from '../src/game/logic/gameRules';
import { generateFood } from '../src/game/logic/foodLogic';
import { getOccupiedPositions, mulberry32 } from '../src/game/logic/prng';
import { AI_SNAKE_ID } from '../src/game/logic/aiSnake';

interface PlayerInputData {
  dx: number;
  dy: number;
}

interface ProfileUpdate {
  playerId: string;
  name: string;
  color: string;
}

export class GameManager {
  private currentGameState!: GameState;
  private connectedPlayerIds = new Set<string>();
  private playerInputs = new Map<string, PlayerInputData>();
  private profileUpdateQueue: ProfileUpdate[] = [];
  private lastTickTime = 0;

  constructor() {
    this.initializeGame();
  }

  initializeGame(): void {
    const initialSeed = Date.now();
    const initialRandomFunc = mulberry32(initialSeed);
    const initialState: GameState = {
      snakes: [],
      food: [],
      powerUps: [],
      activePowerUps: [],
      gridSize: GRID_SIZE,
      timestamp: performance.now(),
      sequence: 0,
      rngSeed: initialSeed,
      playerCount: 0,
      powerUpCounter: 0,
      playerStats: {}
    };

    initialState.playerStats[AI_SNAKE_ID] = {
      id: AI_SNAKE_ID,
      name: 'AI Snake',
      color: '#FF5500',
      score: this.currentGameState?.playerStats?.[AI_SNAKE_ID]?.score || 0,
      deaths: this.currentGameState?.playerStats?.[AI_SNAKE_ID]?.deaths || 0,
      isConnected: true
    };

    const occupiedInitial = getOccupiedPositions(initialState);
    const foodCount = 3;
    for (let i = 0; i < foodCount; i++) {
      const food = generateFood(initialState.gridSize, occupiedInitial, initialRandomFunc);
      if (food) {
        initialState.food.push(food);
        occupiedInitial.push(food.position);
      }
    }
    initialState.rngSeed = initialRandomFunc() * 4294967296;

    this.currentGameState = initialState;
    this.lastTickTime = performance.now();

    const emptyInputs = new Map<string, Direction>();
    const emptyPlayerSet = new Set<string>();
    this.currentGameState = updateGame(
      this.currentGameState,
      emptyInputs,
      this.currentGameState.timestamp,
      emptyPlayerSet
    );
  }

  addPlayer(playerId: string, name: string, color: string): void {
    if (this.connectedPlayerIds.has(playerId)) {
      console.warn(`Player ${playerId} already connected.`);

      if (this.currentGameState.playerStats[playerId]) {
        this.currentGameState.playerStats[playerId].isConnected = true;
        this.currentGameState.playerStats[playerId].name = name;
      }
    } else {
      this.connectedPlayerIds.add(playerId);
      this.playerInputs.set(playerId, { dx: 0, dy: 0 });

      if (!this.currentGameState.playerStats) {
        this.currentGameState.playerStats = {};
      }

      if (this.currentGameState.playerStats[playerId]) {
        this.currentGameState.playerStats[playerId] = {
          ...this.currentGameState.playerStats[playerId],
          isConnected: true,
          name: name
        };
      } else {
        this.currentGameState.playerStats[playerId] = {
          id: playerId,
          name: name,
          color: color,
          score: 0,
          deaths: 0,
          isConnected: true
        };
      }
    }

    this.currentGameState.playerCount = this.connectedPlayerIds.size;
  }

  removePlayer(playerId: string): void {
    this.connectedPlayerIds.delete(playerId);
    this.playerInputs.delete(playerId);

    this.currentGameState.playerCount = this.connectedPlayerIds.size;

    if (this.currentGameState.playerStats && this.currentGameState.playerStats[playerId]) {
      this.currentGameState.playerStats[playerId].isConnected = false;
    }
  }

  setPlayerInput(playerId: string, input: PlayerInputData): void {
    if (
      this.connectedPlayerIds.has(playerId) &&
      typeof input?.dx === 'number' &&
      typeof input?.dy === 'number'
    ) {
      this.playerInputs.set(playerId, input);
    }
  }

  queueProfileUpdate(update: ProfileUpdate): void {
    if (!this.currentGameState.playerStats || !this.currentGameState.playerStats[update.playerId]) {
      console.warn(`Received updateProfile for unknown or disconnected player: ${update.playerId}`);
      return;
    }
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    if (!update.name || !update.color || !hexColorRegex.test(update.color)) {
      console.warn(`Invalid profile update data for ${update.playerId}:`, update);
      return;
    }
    this.profileUpdateQueue.push(update);
  }

  runGameTick(): GameState | null {
    if (
      this.connectedPlayerIds.size === 0 &&
      !this.currentGameState.playerStats[AI_SNAKE_ID]?.isConnected
    ) {
      this.lastTickTime = performance.now();

      return null;
    }

    const now = performance.now();

    const deltaTime = Math.min(now - this.lastTickTime, GAME_SPEED_MS * 5);
    const logicalTime = this.currentGameState.timestamp + deltaTime;
    this.lastTickTime = now;

    this.processProfileUpdates();

    const currentTickPlayerInputs: PlayerInputs = new Map();
    this.playerInputs.forEach((input, pId) => {
      if (this.connectedPlayerIds.has(pId)) {
        let requestedDirection: Direction | null = null;
        if (input.dx === -1) requestedDirection = Direction.LEFT;
        else if (input.dx === 1) requestedDirection = Direction.RIGHT;
        else if (input.dy === 1) requestedDirection = Direction.UP;
        else if (input.dy === -1) requestedDirection = Direction.DOWN;

        if (requestedDirection !== null) {
          currentTickPlayerInputs.set(pId, requestedDirection);
        }
      } else {
        this.playerInputs.delete(pId);
      }
    });

    try {
      this.currentGameState = updateGame(
        this.currentGameState,
        currentTickPlayerInputs,
        logicalTime,
        this.connectedPlayerIds
      );
    } catch (e) {
      console.error('!!! Error during updateGame in GameManager:', e);

      return null;
    }

    return this.currentGameState;
  }

  private processProfileUpdates(): void {
    this.profileUpdateQueue.forEach((update) => {
      const stats = this.currentGameState.playerStats?.[update.playerId];

      if (stats && this.connectedPlayerIds.has(update.playerId)) {
        if (!update.name || update.name.length > 16) {
          return;
        }

        if (!/^#[0-9a-fA-F]{6}$/.test(update.color)) {
          return;
        }

        if (stats.name !== update.name) {
          stats.name = update.name;
        }
        if (stats.color !== update.color) {
          stats.color = update.color;

          const snake = this.currentGameState.snakes.find((s) => s.id === update.playerId);
          if (snake) {
            snake.color = update.color;
          }
        }
      } else {
      }
    });

    this.profileUpdateQueue.length = 0;
  }

  getGameState(): GameState {
    return this.currentGameState;
  }

  getPlayerCount(): number {
    return this.connectedPlayerIds.size;
  }

  getPlayerStats(): Record<string, PlayerStats> {
    return this.currentGameState.playerStats || {};
  }
}
