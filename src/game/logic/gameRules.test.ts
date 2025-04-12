// @ts-nocheck
import { updateGame, PlayerInputs } from './gameRules';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  GameState,
  Direction,
  Snake,
  Food,
  PowerUp,
  ActivePowerUp,
  Point,
  PowerUpType,
  PlayerStats
} from '../state/types';
import { GRID_SIZE, FOOD_VALUE, PLAYER_COLORS, POWER_UP_EFFECT_DURATION } from '../constants';
import * as snakeLogic from './snakeLogic';
import * as foodLogic from './foodLogic';
import * as powerUpLogic from './powerUpLogic';
import * as collision from './collision';
import * as prng from './prng';
import { AI_SNAKE_ID } from './aiSnake';
import logger from '../../utils/logger';

jest.mock('./snakeLogic');
jest.mock('./foodLogic');
jest.mock('./powerUpLogic');
jest.mock('./collision');

const mockGetNextHeadPosition = jest.fn().mockImplementation((snake, gridSize) => {
  const id = snake.id;

  if (id === 'p1') return { x: 6, y: 5 };
  if (id === 'p2') return { x: 5, y: 5 };
  if (id === AI_SNAKE_ID) return { x: 1, y: 0 };

  return { x: 0, y: 0 };
});

snakeLogic.getNextHeadPosition = mockGetNextHeadPosition;

const createMockSnake = (
  id: string,
  body: Point[],
  direction = Direction.RIGHT,
  score = 0
): Snake => ({
  id,
  body,
  direction,
  color: PLAYER_COLORS[0],
  score,
  activePowerUps: []
});

const createInitialState = (
  snakes: Snake[] = [],
  food: Food[] = [],
  powerUps: PowerUp[] = [],
  activePowerUps: ActivePowerUp[] = [],
  playerStats: Record<string, PlayerStats> = {}
): GameState => ({
  snakes,
  food,
  powerUps,
  activePowerUps,
  gridSize: GRID_SIZE,
  timestamp: 0,
  sequence: 0,
  rngSeed: 12345,
  powerUpCounter: 0,
  playerCount: snakes.length,
  playerStats
});

const createMinimalGameState = (): GameState => {
  return {
    snakes: [],
    food: [],
    powerUps: [],
    activePowerUps: [],
    gridSize: { width: 20, height: 20 },
    timestamp: Date.now(),
    sequence: 0,
    rngSeed: 12345,
    playerCount: 0,
    powerUpCounter: 0,
    playerStats: {}
  };
};

describe('Game Rules - updateGame', () => {
  let baseState: GameState;
  const currentTime = 1000;
  const generateNewSnakeMock = snakeLogic.generateNewSnake as jest.Mock;
  const moveSnakeBodyMock = snakeLogic.moveSnakeBody as jest.Mock;
  const generateFoodMock = foodLogic.generateFood as jest.Mock;
  const isInvincibleMock = powerUpLogic.isInvincible as jest.Mock;
  const hasCollidedWithSnakeMock = collision.hasCollidedWithSnake as jest.Mock;
  const checkFoodCollisionMock = collision.checkFoodCollision as jest.Mock;
  const checkPowerUpCollisionMock = collision.checkPowerUpCollision as jest.Mock;
  const getSpeedFactorMock = powerUpLogic.getSpeedFactor as jest.Mock;
  let getOccupiedPositionsSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    baseState = createInitialState();

    getOccupiedPositionsSpy = jest.spyOn(prng, 'getOccupiedPositions').mockReturnValue([]);

    generateNewSnakeMock.mockImplementation(
      (
        id: string,
        gs: { width: number; height: number },
        occ: any[],
        rf: () => number,
        color?: string
      ) => createMockSnake(id, [{ x: 0, y: 0 }])
    );

    moveSnakeBodyMock.mockImplementation((snake: Snake) => {
      const nextHead = { ...snake.body[0] };
      nextHead.x = (nextHead.x + 1 + GRID_SIZE.width) % GRID_SIZE.width;
      return { ...snake, body: [nextHead, ...snake.body.slice(0, -1)] };
    });

    isInvincibleMock.mockReturnValue(false);
    hasCollidedWithSnakeMock.mockReturnValue(false);
    checkFoodCollisionMock.mockReturnValue(null);
    checkPowerUpCollisionMock.mockReturnValue(null);
    getSpeedFactorMock.mockReturnValue(1);

    if (jest.isMockFunction(logger.debug)) {
      logger.debug.mockRestore();
    }
    if (jest.isMockFunction(logger.error)) {
      logger.error.mockRestore();
    }

    powerUpLogic.cleanupExpiredGridPowerUps = jest
      .fn()
      .mockImplementation((arr: PowerUp[]) =>
        arr.filter((p: PowerUp) => p.expiresAt > currentTime)
      );

    powerUpLogic.cleanupExpiredActivePowerUps = jest
      .fn()
      .mockImplementation((arr: ActivePowerUp[]) =>
        arr.filter((p: ActivePowerUp) => p.expiresAt > currentTime)
      );

    powerUpLogic.activatePowerUp = jest.fn();
    snakeLogic.growSnake = jest.fn((snake: Snake) => ({
      ...snake,
      body: [...snake.body, snake.body[snake.body.length - 1]]
    }));
    powerUpLogic.getScoreMultiplier = jest.fn().mockReturnValue(1);
  });

  afterEach(() => {
    jest.restoreAllMocks();

    if (getOccupiedPositionsSpy) {
      getOccupiedPositionsSpy.mockRestore();
    }
  });

  describe('Player Management', () => {
    it('should add a new snake for a new player ID', () => {
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);
      moveSnakeBodyMock.mockImplementation((snake: Snake) => snake);
      const mockNewSnake = createMockSnake('p1', [{ x: 1, y: 1 }]);
      generateNewSnakeMock.mockReturnValue(mockNewSnake);
      getOccupiedPositionsSpy.mockReturnValue([]);

      const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      expect(getOccupiedPositionsSpy).toHaveBeenCalled();
      expect(generateNewSnakeMock).toHaveBeenCalledTimes(2);
      expect(generateNewSnakeMock).toHaveBeenCalledWith(
        'p1',
        GRID_SIZE,
        expect.any(Array),
        expect.any(Function),
        undefined
      );
      expect(nextState.snakes).toHaveLength(2);
      const p1Snake = nextState.snakes.find((s) => s.id === 'p1');
      expect(p1Snake).toEqual(mockNewSnake);
      expect(nextState.playerCount).toBe(1);
      expect(nextState.playerStats['p1']).toBeDefined();
      expect(nextState.playerStats['p1'].isConnected).toBe(true);
      expect(nextState.playerStats['p1'].color).toBe(mockNewSnake.color);
    });

    it('should remove snakes for players who have left', () => {
      const snake1 = createMockSnake('p1', [{ x: 0, y: 0 }]);
      const snake2 = createMockSnake('p2', [{ x: 1, y: 1 }]);
      const initialState = createInitialState([snake1, snake2], [], [], [], {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true },
        p2: { id: 'p2', color: 'blue', score: 0, deaths: 0, isConnected: true }
      });
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(nextState.snakes).toHaveLength(2);
      expect(nextState.snakes.some((s) => s.id === 'p1')).toBe(true);
      expect(nextState.snakes.some((s) => s.id === AI_SNAKE_ID)).toBe(true);
      expect(nextState.playerCount).toBe(1);
      expect(nextState.playerStats['p1'].isConnected).toBe(true);
      expect(nextState.playerStats['p2']).toBeDefined();
      expect(nextState.playerStats['p2'].isConnected).toBe(false);
    });

    it('should preserve score for disconnected player and restore on rejoin', () => {
      const playerStats: Record<string, PlayerStats> = {
        p1: { id: 'p1', color: 'red', score: 10, deaths: 1, isConnected: false }
      };
      const initialState = createInitialState([], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      const mockP1Snake = createMockSnake('p1', [{ x: 1, y: 1 }], Direction.RIGHT, 0);

      const mockAISnake = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]);

      generateNewSnakeMock.mockImplementation(
        (id: string, gs: any, occ: any, rf: any, color: any) => {
          if (id === 'p1') return mockP1Snake;
          if (id === AI_SNAKE_ID) return mockAISnake;
          return createMockSnake(id, [{ x: 9, y: 9 }]);
        }
      );

      const logSpy = jest.spyOn(logger, 'debug').mockImplementation(() => {});

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(nextState.snakes).toHaveLength(2);
      const p1Snake = nextState.snakes.find((s) => s.id === 'p1');
      expect(p1Snake).toBeDefined();
      expect(p1Snake?.score).toBe(10);
      expect(nextState.playerStats['p1']).toBeDefined();
      expect(nextState.playerStats['p1'].score).toBe(10);
      expect(nextState.playerStats['p1'].deaths).toBe(1);
      expect(nextState.playerStats['p1'].isConnected).toBe(true);
      logSpy.mockRestore();
    });

    it('should use preferred color from playerStats when adding new snake', () => {
      const playerStats: Record<string, PlayerStats> = {
        p1: { id: 'p1', color: '#ABCDEF', score: 0, deaths: 0, isConnected: false }
      };
      const initialState = createInitialState([], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      generateNewSnakeMock.mockImplementation(
        (id: string, gs: any, occ: any, rf: any, color: any) => {
          if (id === 'p1') {
            return { ...createMockSnake(id, [{ x: 1, y: 1 }]), color: color || PLAYER_COLORS[0] };
          }

          return createMockSnake(id, [{ x: 0, y: 0 }]);
        }
      );
      getOccupiedPositionsSpy.mockReturnValue([]);

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(getOccupiedPositionsSpy).toHaveBeenCalled();
      expect(generateNewSnakeMock).toHaveBeenCalledTimes(2);
      expect(generateNewSnakeMock).toHaveBeenCalledWith(
        'p1',
        GRID_SIZE,
        expect.any(Array),
        expect.any(Function),
        '#ABCDEF'
      );
      expect(generateNewSnakeMock).toHaveBeenCalledWith(
        AI_SNAKE_ID,
        GRID_SIZE,
        expect.any(Array),
        expect.any(Function),
        '#FF5500'
      );

      const aiSnake = nextState.snakes.find((s) => s.id === AI_SNAKE_ID);
      expect(aiSnake?.color).toBeDefined();
    });

    it('should sync score if snake score and playerStats score diverge (stats higher)', () => {
      const snake1 = createMockSnake('p1', [{ x: 0, y: 0 }], Direction.RIGHT, 5);
      const playerStats: Record<string, PlayerStats> = {
        p1: { id: 'p1', color: 'red', score: 10, deaths: 0, isConnected: true }
      };

      const initialState = createInitialState([snake1], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);
      const logSpy = jest.spyOn(logger, 'debug').mockImplementation(() => {});

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(logSpy).toHaveBeenCalledWith('Syncing score for p1: Snake=5, Stats=10');

      const p1Snake = nextState.snakes.find((s) => s.id === 'p1');
      expect(p1Snake?.score).toBe(10);
      expect(nextState.playerStats['p1'].score).toBe(10);
      expect(nextState.snakes.length).toBe(2);
      logSpy.mockRestore();
    });

    it('should sync score if snake score and playerStats score diverge (snake higher)', () => {
      const snake1 = createMockSnake('p1', [{ x: 0, y: 0 }], Direction.RIGHT, 15);
      const playerStats: Record<string, PlayerStats> = {
        p1: { id: 'p1', color: 'red', score: 10, deaths: 0, isConnected: true }
      };

      const initialState = createInitialState([snake1], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);
      const logSpy = jest.spyOn(logger, 'debug').mockImplementation(() => {});

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(logSpy).toHaveBeenCalledWith('Syncing score for p1: Snake=15, Stats=10');

      const p1Snake = nextState.snakes.find((s) => s.id === 'p1');
      expect(p1Snake?.score).toBe(15);
      expect(nextState.playerStats['p1'].score).toBe(15);
      expect(nextState.snakes.length).toBe(2);
      logSpy.mockRestore();
    });

    it('should update isConnected to false in playerStats if player leaves', () => {
      const snake1 = createMockSnake('p1', [{ x: 0, y: 0 }]);
      const playerStats: Record<string, PlayerStats> = {
        p1: { id: 'p1', color: snake1.color, score: 0, deaths: 0, isConnected: true }
      };
      const initialState = createInitialState([snake1], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set<string>();

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(nextState.playerStats['p1']).toBeDefined();
      expect(nextState.playerStats['p1'].isConnected).toBe(false);
    });

    it('should keep isConnected as false in playerStats if player remains disconnected', () => {
      const playerStats: Record<string, PlayerStats> = {
        p1: { id: 'p1', color: 'red', score: 5, deaths: 1, isConnected: false }
      };
      const initialState = createInitialState([], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set<string>();

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(nextState.playerStats['p1']).toBeDefined();
      expect(nextState.playerStats['p1'].isConnected).toBe(false);
    });

    it('should update isConnected to true in playerStats if player rejoins', () => {
      const playerStats: Record<string, PlayerStats> = {
        p1: { id: 'p1', color: 'blue', score: 5, deaths: 1, isConnected: false }
      };
      const initialState = createInitialState([], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set<string>(['p1']);
      generateNewSnakeMock.mockReturnValue(createMockSnake('p1', [{ x: 1, y: 1 }]));

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(nextState.playerStats['p1']).toBeDefined();
      expect(nextState.playerStats['p1'].isConnected).toBe(true);
    });
  });

  describe('Snake Movement and Direction', () => {
    it('should update snake direction based on input if not opposite', () => {
      const snake = createMockSnake('p1', [{ x: 5, y: 5 }], Direction.UP);
      baseState = createInitialState([snake]);
      const inputs: PlayerInputs = new Map([['p1', Direction.UP]]);
      const currentPlayerIDs = new Set(['p1']);

      const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      expect(nextState.snakes[0].direction).toBe(Direction.UP);
    });

    it('should NOT update snake direction if input is opposite', () => {
      const snake = createMockSnake(
        'p1',
        [
          { x: 5, y: 5 },
          { x: 4, y: 5 }
        ],
        Direction.RIGHT
      );
      baseState = createInitialState([snake]);
      const inputs: PlayerInputs = new Map([['p1', Direction.LEFT]]);
      const currentPlayerIDs = new Set(['p1']);

      const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      expect(nextState.snakes[0].direction).toBe(Direction.RIGHT);
    });

    it('should ALLOW opposite direction if snake length is 1', () => {
      const snake = createMockSnake('p1', [{ x: 5, y: 5 }], Direction.RIGHT);
      baseState = createInitialState([snake]);
      const inputs: PlayerInputs = new Map([['p1', Direction.LEFT]]);
      const currentPlayerIDs = new Set(['p1']);

      const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      expect(nextState.snakes[0].direction).toBe(Direction.LEFT);
    });

    it('should call moveSnakeBody for each snake', () => {
      const snake1 = createMockSnake('p1', [{ x: 5, y: 5 }]);
      const snake2 = createMockSnake('p2', [{ x: 10, y: 10 }]);
      const baseState = createInitialState([snake1, snake2]);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1', 'p2']);

      moveSnakeBodyMock.mockImplementation(
        (snake: Snake, gridSize: { width: number; height: number }) => ({
          ...snake,
          moved: true,
          grid: gridSize
        })
      );

      updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      expect(moveSnakeBodyMock).toHaveBeenCalledTimes(3);
      expect(moveSnakeBodyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        GRID_SIZE
      );
      expect(moveSnakeBodyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p2' }),
        GRID_SIZE
      );

      expect(moveSnakeBodyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: AI_SNAKE_ID }),
        GRID_SIZE
      );
    });
  });

  describe('Collision Handling', () => {
    const initialSnake1 = createMockSnake(
      'p1',
      [
        { x: 5, y: 5 },
        { x: 4, y: 5 }
      ],
      Direction.RIGHT
    );
    const initialSnake2 = createMockSnake(
      'p2',
      [
        { x: 4, y: 5 },
        { x: 3, y: 5 }
      ],
      Direction.RIGHT
    );

    beforeEach(() => {
      baseState = createInitialState([{ ...initialSnake1 }, { ...initialSnake2 }], [], [], [], {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true },
        p2: { id: 'p2', color: 'blue', score: 0, deaths: 0, isConnected: true }
      });

      moveSnakeBodyMock.mockImplementation((snake: Snake) => snake);
      hasCollidedWithSnakeMock.mockReturnValue(false);
      isInvincibleMock.mockReturnValue(false);

      const mockAISnake = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]);
      generateNewSnakeMock.mockImplementation((id: string) => {
        if (id === AI_SNAKE_ID) return mockAISnake;

        if (id === 'p1') return { ...initialSnake1 };
        if (id === 'p2') return { ...initialSnake2 };
        return createMockSnake(id, [{ x: 9, y: 9 }]);
      });
    });

    it('should remove a snake if hasCollidedWithSnake returns true based on intended position', () => {
      const snake1 = createMockSnake('p1', [
        { x: 5, y: 5 },
        { x: 4, y: 5 }
      ]);
      const snake2 = createMockSnake('p2', [
        { x: 4, y: 5 },
        { x: 3, y: 5 }
      ]);

      const initialState = createInitialState([snake1, snake2], [], [], [], {
        p1: { id: 'p1', color: 'red', score: 5, deaths: 0, isConnected: true },
        p2: { id: 'p2', color: 'blue', score: 3, deaths: 0, isConnected: true }
      });

      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1', 'p2']);

      const p1IntendedPos = { x: 6, y: 5 };
      const p2IntendedPos = { x: 5, y: 5 };

      moveSnakeBodyMock.mockImplementation((snake: Snake) => {
        if (snake.id === 'p1') {
          return {
            ...snake,
            body: [p1IntendedPos, ...snake.body.slice(0, -1)]
          };
        } else if (snake.id === 'p2') {
          return {
            ...snake,
            body: [p2IntendedPos, ...snake.body.slice(0, -1)]
          };
        }
        return snake;
      });

      hasCollidedWithSnakeMock.mockImplementation((intendedPos, snakes, selfId) => {
        if (selfId === 'p2') {
          return true;
        }
        return false;
      });

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(hasCollidedWithSnakeMock).toHaveBeenCalled();

      const p2Snake = nextState.snakes.find((s) => s.id === 'p2');
      expect(p2Snake).toBeUndefined();

      expect(nextState.playerStats['p2'].deaths).toBe(1);
    });

    it('should NOT remove a snake if it collides but is invincible', () => {
      const snake1 = createMockSnake('p1', [{ x: 5, y: 5 }]);

      const invincibilityPowerUp: ActivePowerUp = {
        type: PowerUpType.INVINCIBILITY,
        playerId: 'p1',
        expiresAt: currentTime + 5000
      };

      const initialState = createInitialState([snake1], [], [], [invincibilityPowerUp], {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
      });

      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      isInvincibleMock.mockImplementation((snakeId, activePowerUps, time) => {
        return snakeId === 'p1';
      });

      hasCollidedWithSnakeMock.mockImplementation(() => true);

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(isInvincibleMock).toHaveBeenCalled();

      expect(hasCollidedWithSnakeMock).toHaveBeenCalled();

      const p1Snake = nextState.snakes.find((s) => s.id === 'p1');
      expect(p1Snake).toBeDefined();
      expect(nextState.playerStats['p1'].deaths).toBe(0);
    });
  });

  describe('Food Handling', () => {
    const growSnakeMock = snakeLogic.growSnake;
    const getScoreMultiplierMock = powerUpLogic.getScoreMultiplier;
    const foodItem: Food = { position: { x: 6, y: 5 }, value: FOOD_VALUE };

    beforeEach(() => {
      jest.clearAllMocks();

      const snake = createMockSnake('p1', [
        { x: 5, y: 5 },
        { x: 4, y: 5 }
      ]);

      baseState = createInitialState([snake], [foodItem], [], [], {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
      });

      moveSnakeBodyMock.mockImplementation((s: Snake) => {
        if (s.id === 'p1') {
          return {
            ...s,
            body: [
              { x: 6, y: 5 },
              { x: 5, y: 5 }
            ]
          };
        }
        return s;
      });

      growSnakeMock.mockImplementation((s: Snake) => ({
        ...s,
        body: [{ x: s.body[0].x, y: s.body[0].y }, ...s.body]
      }));

      checkFoodCollisionMock.mockImplementation((point: Point, foodList: Food[]) => {
        if (
          point &&
          point.x === foodItem.position.x &&
          point.y === foodItem.position.y &&
          foodList.includes(foodItem)
        ) {
          return foodItem;
        }
        return null;
      });

      getScoreMultiplierMock.mockReturnValue(1);

      getSpeedFactorMock.mockReturnValue(1);
    });

    it('should remove food, grow snake, and increase score upon collision', () => {
      const foodItem: Food = { position: { x: 6, y: 5 }, value: FOOD_VALUE };

      const snake = createMockSnake('p1', [
        { x: 5, y: 5 },
        { x: 4, y: 5 }
      ]);

      const initialState = createInitialState([snake], [foodItem], [], [], {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
      });

      const expectedHeadPos = { x: 6, y: 5 };
      moveSnakeBodyMock.mockImplementation((s: Snake) =>
        s.id === 'p1' ? { ...s, body: [expectedHeadPos, ...s.body.slice(0, -1)] } : s
      );

      checkFoodCollisionMock.mockReturnValue(foodItem);

      const growSnakeMock = snakeLogic.growSnake;
      growSnakeMock.mockImplementation((s: Snake) => ({
        ...s,
        body: [...s.body, { x: 3, y: 5 }]
      }));

      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(checkFoodCollisionMock).toHaveBeenCalled();
      expect(growSnakeMock).toHaveBeenCalled();

      expect(nextState.food).toHaveLength(0);
      expect(nextState.snakes[0].body).toHaveLength(3);
      expect(nextState.snakes[0].score).toBe(FOOD_VALUE);
      expect(nextState.playerStats['p1'].score).toBe(FOOD_VALUE);
    });

    it('should apply score multiplier when eating food', () => {
      const foodItem: Food = { position: { x: 6, y: 5 }, value: FOOD_VALUE };

      const snake = createMockSnake('p1', [
        { x: 5, y: 5 },
        { x: 4, y: 5 }
      ]);

      const doubleScorePowerUp: ActivePowerUp = {
        type: PowerUpType.DOUBLE_SCORE,
        playerId: 'p1',
        expiresAt: currentTime + 1000
      };

      const initialState = createInitialState([snake], [foodItem], [], [doubleScorePowerUp], {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
      });

      const expectedHeadPos = { x: 6, y: 5 };
      moveSnakeBodyMock.mockImplementation((s: Snake) =>
        s.id === 'p1' ? { ...s, body: [expectedHeadPos, ...s.body.slice(0, -1)] } : s
      );

      checkFoodCollisionMock.mockReturnValue(foodItem);

      const getScoreMultiplierMock = powerUpLogic.getScoreMultiplier as jest.Mock;
      getScoreMultiplierMock.mockReturnValue(2);

      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(checkFoodCollisionMock).toHaveBeenCalled();
      expect(getScoreMultiplierMock).toHaveBeenCalled();

      expect(nextState.food).toHaveLength(0);
      expect(nextState.snakes[0].score).toBe(FOOD_VALUE * 2);
      expect(nextState.playerStats['p1'].score).toBe(FOOD_VALUE * 2);
    });

    it('should generate new food if below threshold', () => {
      const snake = createMockSnake('p1', [
        { x: 5, y: 5 },
        { x: 4, y: 5 }
      ]);
      const emptyFoodState = createInitialState([snake], [], [], [], {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
      });

      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      const newFoodItem: Food = { position: { x: 1, y: 1 }, value: FOOD_VALUE };
      generateFoodMock.mockReturnValue(newFoodItem);

      const nextState = updateGame(emptyFoodState, inputs, currentTime, currentPlayerIDs);

      expect(generateFoodMock).toHaveBeenCalledTimes(3);
      expect(nextState.food).toHaveLength(3);
      expect(nextState.food).toEqual(expect.arrayContaining([newFoodItem]));
    });

    it('should eat food correctly even if SLOW powerup prevents movement in the current tick', () => {
      const snake = createMockSnake('p1', [{ x: 5, y: 5 }]);
      const foodItem: Food = {
        position: { x: 6, y: 5 },
        value: FOOD_VALUE
      };
      const slowPowerUp: ActivePowerUp = {
        type: PowerUpType.SLOW,
        playerId: 'p1',
        expiresAt: currentTime + 1000
      };

      const initialState = createInitialState([snake], [foodItem], [], [slowPowerUp], {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
      });
      initialState.sequence = 0;

      getSpeedFactorMock.mockReturnValue(0.5);

      moveSnakeBodyMock.mockImplementation((s: Snake) => s);

      checkFoodCollisionMock.mockReturnValue(foodItem);

      const growSnakeMock = snakeLogic.growSnake as jest.Mock;
      growSnakeMock.mockImplementation((s: Snake) => ({
        ...s,
        body: [...s.body, { x: 4, y: 5 }]
      }));

      const getScoreMultiplierMock = powerUpLogic.getScoreMultiplier as jest.Mock;
      getScoreMultiplierMock.mockReturnValue(1);

      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(getSpeedFactorMock).toHaveBeenCalledWith('p1', [slowPowerUp], currentTime);

      expect(checkFoodCollisionMock).toHaveBeenCalled();
      expect(growSnakeMock).toHaveBeenCalled();
      expect(getScoreMultiplierMock).toHaveBeenCalled();

      expect(nextState.food).toHaveLength(0);
      expect(nextState.snakes[0].score).toBe(FOOD_VALUE * 1);
      expect(nextState.playerStats['p1'].score).toBe(FOOD_VALUE * 1);
      expect(nextState.snakes[0].body.length).toBe(2);
    });
  });

  describe('PowerUp Handling', () => {
    const activatePowerUpMock = powerUpLogic.activatePowerUp;
    const cleanupExpiredActivePowerUpsMock = powerUpLogic.cleanupExpiredActivePowerUps;
    const cleanupExpiredGridPowerUpsMock = powerUpLogic.cleanupExpiredGridPowerUps;

    const powerUpItem: PowerUp = {
      id: 'pu1',
      type: PowerUpType.SPEED,
      position: { x: 6, y: 5 },
      expiresAt: currentTime + 5000
    };

    const activePowerUp: ActivePowerUp = {
      type: PowerUpType.SPEED,
      playerId: 'p1',
      expiresAt: currentTime + POWER_UP_EFFECT_DURATION
    };

    beforeEach(() => {
      jest.clearAllMocks();

      const snake = createMockSnake('p1', [
        { x: 5, y: 5 },
        { x: 4, y: 5 }
      ]);

      baseState = createInitialState([snake], [], [powerUpItem], [], {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
      });

      moveSnakeBodyMock.mockImplementation((s: Snake) => {
        if (s.id === 'p1') {
          return {
            ...s,
            body: [
              { x: 6, y: 5 },
              { x: 5, y: 5 }
            ]
          };
        }
        return s;
      });

      activatePowerUpMock.mockReturnValue(activePowerUp);

      checkPowerUpCollisionMock.mockImplementation((point: Point, puList: PowerUp[]) => {
        if (
          point &&
          point.x === powerUpItem.position.x &&
          point.y === powerUpItem.position.y &&
          puList.includes(powerUpItem)
        ) {
          return powerUpItem;
        }
        return null;
      });

      getSpeedFactorMock.mockReturnValue(1);

      cleanupExpiredGridPowerUpsMock.mockImplementation((arr: PowerUp[]) =>
        arr.filter((p: PowerUp) => p.expiresAt > currentTime)
      );

      cleanupExpiredActivePowerUpsMock.mockImplementation((arr: ActivePowerUp[]) =>
        arr.filter((p: ActivePowerUp) => p.expiresAt > currentTime)
      );
    });

    it('should remove grid powerup and add active powerup on collision', () => {
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      checkPowerUpCollisionMock.mockReturnValue(powerUpItem);

      const activatePowerUpMock = powerUpLogic.activatePowerUp as jest.Mock;
      activatePowerUpMock.mockReturnValue(activePowerUp);

      const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      expect(checkPowerUpCollisionMock).toHaveBeenCalled();

      expect(activatePowerUpMock).toHaveBeenCalled();

      expect(nextState.powerUps).toHaveLength(0);

      expect(nextState.activePowerUps).toHaveLength(2);
      expect(nextState.activePowerUps[0]).toEqual(activePowerUp);
      expect(nextState.activePowerUps[1]).toEqual(activePowerUp);
    });

    it('should call cleanup functions for expired powerups', () => {
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      const cleanupExpiredGridPowerUpsMock = powerUpLogic.cleanupExpiredGridPowerUps as jest.Mock;
      const cleanupExpiredActivePowerUpsMock =
        powerUpLogic.cleanupExpiredActivePowerUps as jest.Mock;

      updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      expect(cleanupExpiredGridPowerUpsMock).toHaveBeenCalled();
      expect(cleanupExpiredActivePowerUpsMock).toHaveBeenCalled();
    });
  });

  describe('Speed Boost Food Collection', () => {
    it('should detect food collision in intermediate positions with speed boost', () => {
      jest.clearAllMocks();

      const snake = createMockSnake('p1', [{ x: 5, y: 5 }], Direction.RIGHT);

      const intermediateFood: Food = { position: { x: 6, y: 5 }, value: FOOD_VALUE };
      const finalFood: Food = { position: { x: 7, y: 5 }, value: FOOD_VALUE };

      const speedPowerUp: ActivePowerUp = {
        type: PowerUpType.SPEED,
        playerId: 'p1',
        expiresAt: currentTime + 1000
      };

      const initialState = createInitialState(
        [snake],
        [intermediateFood, finalFood],
        [],
        [speedPowerUp],
        {
          p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
        }
      );

      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      const mockAISnake = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]);
      generateNewSnakeMock.mockImplementation((id: string) => {
        if (id === AI_SNAKE_ID) return mockAISnake;
        if (id === 'p1') return snake;
        return createMockSnake(id, [{ x: 9, y: 9 }]);
      });

      getSpeedFactorMock.mockReturnValue(2);

      let moveCounter = 0;
      moveSnakeBodyMock.mockImplementation((snake: Snake) => {
        if (snake.id === 'p1') {
          moveCounter++;

          if (moveCounter === 1) {
            return {
              ...snake,
              body: [{ x: 6, y: 5 }, ...snake.body.slice(0, -1)]
            };
          }

          return {
            ...snake,
            body: [{ x: 7, y: 5 }, ...snake.body.slice(0, -1)]
          };
        }

        return {
          ...snake,
          body: [{ x: 1, y: 0 }, ...snake.body.slice(0, -1)]
        };
      });

      let callCount = 0;
      checkFoodCollisionMock.mockImplementation(() => {
        callCount++;

        if (callCount === 1) return intermediateFood;
        else if (callCount === 2) return finalFood;
        return null;
      });

      const growSnakeMock = snakeLogic.growSnake;
      growSnakeMock.mockImplementation((snake) => ({
        ...snake,
        body: [...snake.body, { ...snake.body[snake.body.length - 1] }]
      }));

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(getSpeedFactorMock).toHaveBeenCalledWith('p1', [speedPowerUp], currentTime);

      expect(moveCounter).toBe(2);

      expect(checkFoodCollisionMock).toHaveBeenCalled();
      expect(callCount).toBeGreaterThan(0);

      expect(nextState.food.length).toBe(0);

      expect(growSnakeMock).toHaveBeenCalledTimes(2);

      const finalSnake = nextState.snakes.find((s) => s.id === 'p1');
      expect(finalSnake.body[0]).toEqual({ x: 7, y: 5 });
    });
  });

  describe('State and RNG', () => {
    it('should increment sequence number', () => {
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs: Set<string> = new Set();
      const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);
      expect(nextState.sequence).toBe(baseState.sequence + 1);
    });

    it('should update the RNG seed', () => {
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs: Set<string> = new Set();
      const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);
      expect(nextState.rngSeed).not.toBe(baseState.rngSeed);
      expect(typeof nextState.rngSeed).toBe('number');
    });

    it('should produce deterministic output for the same inputs', () => {
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs: Set<string> = new Set(['p1']);
      const snake1 = createMockSnake('p1', [{ x: 1, y: 1 }]);
      const initialState = createInitialState([snake1]);

      const nextState1 = updateGame(initialState, inputs, currentTime, currentPlayerIDs);
      const nextState2 = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(nextState1).toEqual(nextState2);
    });
  });

  describe('Snake Movement and Collision', () => {
    it('should move snake normally if no powerups active', () => {
      const snake1 = createMockSnake('p1', [{ x: 5, y: 5 }]);

      const initialState = createInitialState([snake1]);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      const mockAISnake = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]);
      generateNewSnakeMock.mockImplementation((id: string) => {
        if (id === AI_SNAKE_ID) return mockAISnake;
        if (id === 'p1') return snake1;
        return createMockSnake(id, [{ x: 9, y: 9 }]);
      });

      moveSnakeBodyMock.mockClear();

      getSpeedFactorMock.mockReturnValue(1);

      moveSnakeBodyMock.mockImplementation((snake: Snake) => {
        return {
          ...snake,
          body: [{ x: snake.body[0].x + 1, y: snake.body[0].y }, ...snake.body.slice(0, -1)]
        };
      });

      updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(moveSnakeBodyMock).toHaveBeenCalledTimes(2);
      expect(moveSnakeBodyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        GRID_SIZE
      );
      expect(moveSnakeBodyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: AI_SNAKE_ID }),
        GRID_SIZE
      );
    });

    it('should not move snake if SLOW powerup is active and sequence is even', () => {
      const snake = createMockSnake('p1', [{ x: 5, y: 5 }]);
      const aiSnake = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]);

      const slowPowerUp: ActivePowerUp = {
        type: PowerUpType.SLOW,
        playerId: 'p1',
        expiresAt: currentTime + 1000
      };

      const initialState = createInitialState([snake, aiSnake], [], [], [slowPowerUp]);
      initialState.sequence = 0;

      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      moveSnakeBodyMock.mockClear();
      generateNewSnakeMock.mockImplementation((id: string) => {
        if (id === AI_SNAKE_ID) return aiSnake;
        if (id === 'p1') return snake;
        return createMockSnake(id, [{ x: 9, y: 9 }]);
      });

      getSpeedFactorMock.mockImplementation((id: string, activePowerUps: ActivePowerUp[]) => {
        if (id === 'p1') return 0.5;
        return 1;
      });

      moveSnakeBodyMock.mockImplementation((snake: Snake) => {
        if (snake.id === 'p1') {
          return snake;
        }

        return {
          ...snake,
          body: [{ x: snake.body[0].x + 1, y: snake.body[0].y }, ...snake.body.slice(0, -1)]
        };
      });

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(getSpeedFactorMock).toHaveBeenCalledWith('p1', [slowPowerUp], currentTime);

      const p1Snake = nextState.snakes.find((s) => s.id === 'p1');
      expect(p1Snake.body[0].x).toBe(5);
      expect(p1Snake.body[0].y).toBe(5);

      const aiSnakeFinal = nextState.snakes.find((s) => s.id === AI_SNAKE_ID);
      expect(aiSnakeFinal.body[0].x).not.toBe(0);
    });

    it('should move snake if SLOW powerup is active and sequence is odd', () => {
      const snake1 = createMockSnake('p1', [{ x: 5, y: 5 }]);
      const aiSnake = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]);

      const slowPowerUp: ActivePowerUp = {
        type: PowerUpType.SLOW,
        playerId: 'p1',
        expiresAt: currentTime + 1000
      };

      const initialState = createInitialState([snake1, aiSnake], [], [], [slowPowerUp]);
      initialState.sequence = 1;

      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      moveSnakeBodyMock.mockClear();
      generateNewSnakeMock.mockImplementation((id: string) => {
        if (id === AI_SNAKE_ID) return aiSnake;
        if (id === 'p1') return snake1;
        return createMockSnake(id, [{ x: 9, y: 9 }]);
      });

      getSpeedFactorMock.mockImplementation((id: string, activePowerUps: ActivePowerUp[]) => {
        if (id === 'p1') return 0.5;
        return 1;
      });

      moveSnakeBodyMock.mockImplementation((snake: Snake) => {
        return {
          ...snake,
          body: [{ x: snake.body[0].x + 1, y: snake.body[0].y }, ...snake.body.slice(0, -1)]
        };
      });

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(getSpeedFactorMock).toHaveBeenCalledWith('p1', [slowPowerUp], currentTime);

      const p1Snake = nextState.snakes.find((s) => s.id === 'p1');
      expect(p1Snake.body[0].x).toBe(6);

      const aiSnakeFinal = nextState.snakes.find((s) => s.id === AI_SNAKE_ID);
      expect(aiSnakeFinal.body[0].x).toBe(1);
    });
  });

  describe('State Integrity', () => {
    it('should create playerStats entry if missing for an existing snake (line 284)', () => {
      const snake = createMockSnake('p1', [{ x: 3, y: 3 }], Direction.LEFT, 5);
      const playerStats: Record<string, PlayerStats> = {};
      const initialState = createInitialState([snake], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(nextState.playerStats['p1']).toBeDefined();
      expect(nextState.playerStats['p1']).toEqual({
        id: 'p1',
        name: 'Player_p1',
        color: snake.color,
        score: snake.score,
        deaths: 0,
        isConnected: true
      });
    });
  });

  describe('AI Snake Collisions', () => {
    it('should remove AI snake and increment its death counter when it collides with another snake', () => {
      const aiSnake = createMockSnake(AI_SNAKE_ID, [
        { x: 5, y: 5 },
        { x: 5, y: 6 }
      ]);
      const playerSnake = createMockSnake('player1', [
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ]);

      const initialState = createMinimalGameState();
      initialState.snakes = [aiSnake, playerSnake];
      initialState.playerStats = {
        [AI_SNAKE_ID]: { id: AI_SNAKE_ID, color: 'orange', score: 0, deaths: 0, isConnected: true },
        player1: { id: 'player1', color: 'blue', score: 0, deaths: 0, isConnected: true }
      };

      const hasCollidedWithSnakeMock = jest.spyOn(collision, 'hasCollidedWithSnake');
      hasCollidedWithSnakeMock.mockImplementation(
        (head: Point, snakes: Snake[], currentSnakeId: string) => {
          if (currentSnakeId === AI_SNAKE_ID) {
            return true;
          }
          return false;
        }
      );

      const inputs = new Map<string, Direction>();
      inputs.set(AI_SNAKE_ID, Direction.RIGHT);

      const playerIds = new Set(['player1']);
      const nextState = updateGame(initialState, inputs, Date.now(), playerIds);

      const aiSnakeAfter = nextState.snakes.find((s) => s.id === AI_SNAKE_ID);
      expect(aiSnakeAfter).toBeUndefined();

      expect(nextState.playerStats[AI_SNAKE_ID].deaths).toBe(1);

      hasCollidedWithSnakeMock.mockRestore();
    });

    it('should remove AI snake and increment its death counter when it collides with itself', () => {
      const aiSnake = createMockSnake(AI_SNAKE_ID, [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 7, y: 6 },
        { x: 6, y: 6 },
        { x: 5, y: 6 }
      ]);

      const initialState = createMinimalGameState();
      initialState.snakes = [aiSnake];
      initialState.playerStats = {
        [AI_SNAKE_ID]: { id: AI_SNAKE_ID, color: 'orange', score: 0, deaths: 0, isConnected: true }
      };

      const hasCollidedWithSnakeMock = jest.spyOn(collision, 'hasCollidedWithSnake');
      hasCollidedWithSnakeMock.mockImplementation(
        (head: Point, snakes: Snake[], currentSnakeId: string) => {
          if (currentSnakeId === AI_SNAKE_ID) {
            return true;
          }
          return false;
        }
      );

      const inputs = new Map<string, Direction>();
      inputs.set(AI_SNAKE_ID, Direction.DOWN);

      const playerIds = new Set(['player1']);
      const nextState = updateGame(initialState, inputs, Date.now(), playerIds);

      const aiSnakeAfter = nextState.snakes.find((s) => s.id === AI_SNAKE_ID);
      expect(aiSnakeAfter).toBeUndefined();

      expect(nextState.playerStats[AI_SNAKE_ID].deaths).toBe(1);

      hasCollidedWithSnakeMock.mockRestore();
    });
  });

  describe('AI Snake Respawn', () => {
    it('should respawn AI snake with its previous score and deaths after collision', () => {
      const initialAISnake = createMockSnake(AI_SNAKE_ID, [{ x: 5, y: 5 }], Direction.RIGHT, 50);
      const playerSnake = createMockSnake('p1', [{ x: 1, y: 1 }]);
      const initialState: GameState = createInitialState(
        [initialAISnake, playerSnake],
        [],
        [],
        [],
        {
          [AI_SNAKE_ID]: {
            id: AI_SNAKE_ID,
            color: 'orange',
            score: 50,
            deaths: 1,
            isConnected: true
          },
          p1: { id: 'p1', color: 'blue', score: 10, deaths: 0, isConnected: true }
        }
      );
      const currentPlayerIDs = new Set(['p1']);
      const inputs: PlayerInputs = new Map();
      const tick1Time = currentTime + 100;
      const tick2Time = tick1Time + 100;

      hasCollidedWithSnakeMock.mockClear();
      moveSnakeBodyMock.mockClear();
      isInvincibleMock.mockClear();
      generateNewSnakeMock.mockClear();

      hasCollidedWithSnakeMock.mockImplementation(
        (head: Point, snakes: Snake[], selfId: string) => selfId === AI_SNAKE_ID
      );
      isInvincibleMock.mockReturnValue(false);
      moveSnakeBodyMock.mockImplementation((s: Snake) => s);

      const stateAfterCollision = updateGame(initialState, inputs, tick1Time, currentPlayerIDs);

      expect(stateAfterCollision.snakes.find((s) => s.id === AI_SNAKE_ID)).toBeUndefined();
      expect(stateAfterCollision.playerStats[AI_SNAKE_ID]?.deaths).toBe(2);

      expect(stateAfterCollision.playerStats[AI_SNAKE_ID]?.score).toBe(50);
      expect(stateAfterCollision.playerStats[AI_SNAKE_ID]?.isConnected).toBe(true);

      hasCollidedWithSnakeMock.mockReset();
      generateNewSnakeMock.mockReset();

      const newAISnakeMock = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }], Direction.RIGHT, 50);
      generateNewSnakeMock.mockImplementation((id: string) => {
        if (id === AI_SNAKE_ID) return newAISnakeMock;
        return createMockSnake(id, [{ x: 9, y: 9 }]);
      });
      getOccupiedPositionsSpy.mockReturnValue([]);

      const stateAfterRespawn = updateGame(
        stateAfterCollision,
        inputs,
        tick2Time,
        currentPlayerIDs
      );

      expect(generateNewSnakeMock).toHaveBeenCalledWith(
        AI_SNAKE_ID,
        initialState.gridSize,
        expect.any(Array),
        expect.any(Function),
        '#FF5500'
      );

      const respawnedAISnake = stateAfterRespawn.snakes.find((s) => s.id === AI_SNAKE_ID);
      expect(respawnedAISnake).toBeDefined();

      expect(respawnedAISnake?.score).toBe(50);
      expect(stateAfterRespawn.playerStats[AI_SNAKE_ID]?.deaths).toBe(2);
      expect(stateAfterRespawn.playerStats[AI_SNAKE_ID]?.score).toBe(50);
      expect(stateAfterRespawn.playerStats[AI_SNAKE_ID]?.isConnected).toBe(true);
    });
  });
});
