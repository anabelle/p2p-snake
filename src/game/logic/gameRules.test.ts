import { updateGame, PlayerInputs } from './gameRules';
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
import {
  GRID_SIZE,
  FOOD_VALUE,
  PLAYER_COLORS,
  POWER_UP_EFFECT_DURATION,
  POWERUP_SPAWN_CHANCE
} from '../constants';
import * as snakeLogic from './snakeLogic';
import * as foodLogic from './foodLogic';
import * as powerUpLogic from './powerUpLogic';
import * as collision from './collision';
import * as prng from './prng';
import { AI_SNAKE_ID } from './aiSnake';
import logger from '../../utils/logger';

jest.mock('./snakeLogic', () => ({
  ...jest.requireActual('./snakeLogic'),
  generateNewSnake: jest.fn(),
  moveSnakeBody: jest.fn((snake) => ({ ...snake, body: [...snake.body] })),
  growSnake: jest.fn((snake) => ({
    ...snake,
    body: [...snake.body, snake.body[snake.body.length - 1]]
  }))
}));
jest.mock('./foodLogic', () => ({
  ...jest.requireActual('./foodLogic'),
  generateFood: jest.fn()
}));
jest.mock('./powerUpLogic', () => ({
  ...jest.requireActual('./powerUpLogic'),
  generatePowerUp: jest.fn(),
  activatePowerUp: jest.fn(),
  cleanupExpiredActivePowerUps: jest.fn((arr) => arr),
  cleanupExpiredGridPowerUps: jest.fn((arr) => arr),
  getScoreMultiplier: jest.fn().mockReturnValue(1),
  getSpeedFactor: jest.fn().mockReturnValue(1),
  isInvincible: jest.fn().mockReturnValue(false)
}));
jest.mock('./collision', () => ({
  ...jest.requireActual('./collision'),
  checkFoodCollision: jest.fn().mockReturnValue(null),
  checkPowerUpCollision: jest.fn().mockReturnValue(null),
  hasCollidedWithSnake: jest.fn().mockReturnValue(false),
  hasCollidedWithWall: jest.fn().mockReturnValue(false)
}));

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
  const generatePowerUpMock = powerUpLogic.generatePowerUp as jest.Mock;
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
    generateNewSnakeMock.mockImplementation((id, gs, occ, rf, color) =>
      createMockSnake(id, [{ x: 0, y: 0 }])
    );
    moveSnakeBodyMock.mockImplementation((snake) => {
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
      (logger.debug as jest.Mock).mockRestore();
    }
    if (jest.isMockFunction(logger.error)) {
      (logger.error as jest.Mock).mockRestore();
    }

    (powerUpLogic.cleanupExpiredGridPowerUps as jest.Mock).mockImplementation((arr: PowerUp[]) =>
      arr.filter((p: PowerUp) => p.expiresAt > currentTime)
    );
    (powerUpLogic.cleanupExpiredActivePowerUps as jest.Mock).mockImplementation(
      (arr: ActivePowerUp[]) => arr.filter((p: ActivePowerUp) => p.expiresAt > currentTime)
    );
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
      moveSnakeBodyMock.mockImplementation((snake) => snake);
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

      generateNewSnakeMock.mockImplementation((id, gs, occ, rf, color) => {
        if (id === 'p1') return mockP1Snake;
        if (id === AI_SNAKE_ID) return mockAISnake;
        return createMockSnake(id, [{ x: 9, y: 9 }]);
      });

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

      generateNewSnakeMock.mockImplementation((id, gs, occ, rf, color) => {
        if (id === 'p1') {
          return { ...createMockSnake(id, [{ x: 1, y: 1 }]), color: color || PLAYER_COLORS[0] };
        }

        return createMockSnake(id, [{ x: 0, y: 0 }]);
      });
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

      moveSnakeBodyMock.mockImplementation((snake, gridSize) => ({
        ...snake,
        moved: true,
        grid: gridSize
      }));

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

      moveSnakeBodyMock.mockImplementation((snake) => snake);
      hasCollidedWithSnakeMock.mockReturnValue(false);
      isInvincibleMock.mockReturnValue(false);

      const mockAISnake = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]);
      generateNewSnakeMock.mockImplementation((id) => {
        if (id === AI_SNAKE_ID) return mockAISnake;

        if (id === 'p1') return { ...initialSnake1 };
        if (id === 'p2') return { ...initialSnake2 };
        return createMockSnake(id, [{ x: 9, y: 9 }]);
      });
    });

    it('should remove a snake if hasCollidedWithSnake returns true based on intended position', () => {
      const p1Start = { ...initialSnake1 };
      const p2Start = { ...initialSnake2 };
      const testState = createInitialState([p1Start, p2Start]);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1', 'p2']);

      const p1IntendedPos = snakeLogic.getNextHeadPosition(p1Start, GRID_SIZE);
      const p2IntendedPos = snakeLogic.getNextHeadPosition(p2Start, GRID_SIZE);
      const aiIntendedPos = snakeLogic.getNextHeadPosition(
        createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]),
        GRID_SIZE
      );

      hasCollidedWithSnakeMock.mockImplementation((intendedPos, allSnakes, selfId) => {
        if (
          selfId === 'p2' &&
          intendedPos.x === p2IntendedPos.x &&
          intendedPos.y === p2IntendedPos.y
        ) {
          const otherSnakes = allSnakes.filter((s: Snake) => s.id !== selfId);
          return otherSnakes.some((s: Snake) =>
            s.body.some((seg: Point) => seg.x === intendedPos.x && seg.y === intendedPos.y)
          );
        }
        return false;
      });
      isInvincibleMock.mockReturnValue(false);

      const nextState = updateGame(testState, inputs, currentTime, currentPlayerIDs);

      expect(hasCollidedWithSnakeMock).toHaveBeenCalledWith(
        p2IntendedPos,
        expect.arrayContaining([
          expect.objectContaining({ id: 'p1' }),
          expect.objectContaining({ id: AI_SNAKE_ID })
        ]),
        'p2'
      );

      expect(hasCollidedWithSnakeMock).toHaveBeenCalledWith(p1IntendedPos, expect.anything(), 'p1');
      expect(hasCollidedWithSnakeMock).toHaveBeenCalledWith(
        aiIntendedPos,
        expect.anything(),
        AI_SNAKE_ID
      );

      expect(isInvincibleMock).toHaveBeenCalledWith('p2', [], currentTime);

      expect(nextState.snakes).toHaveLength(2);
      expect(nextState.snakes.some((s) => s.id === 'p1')).toBe(true);
      expect(nextState.snakes.some((s) => s.id === AI_SNAKE_ID)).toBe(true);
      expect(nextState.snakes.some((s) => s.id === 'p2')).toBe(false);
      expect(nextState.playerStats['p2'].deaths).toBe(1);
    });

    it('should NOT remove a snake if it collides but is invincible', () => {
      const p1Start = { ...initialSnake1 };
      const p2Start = { ...initialSnake2 };
      const testState = createInitialState([p1Start, p2Start]);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1', 'p2']);

      const p1IntendedPos = snakeLogic.getNextHeadPosition(p1Start, GRID_SIZE);
      const p2IntendedPos = snakeLogic.getNextHeadPosition(p2Start, GRID_SIZE);
      const aiIntendedPos = snakeLogic.getNextHeadPosition(
        createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]),
        GRID_SIZE
      );

      hasCollidedWithSnakeMock.mockImplementation((intendedPos, allSnakes, selfId) => {
        if (
          selfId === 'p2' &&
          intendedPos.x === p2IntendedPos.x &&
          intendedPos.y === p2IntendedPos.y
        ) {
          const otherSnakes = allSnakes.filter((s: Snake) => s.id !== selfId);
          return otherSnakes.some((s: Snake) =>
            s.body.some((seg: Point) => seg.x === intendedPos.x && seg.y === intendedPos.y)
          );
        }
        return false;
      });
      isInvincibleMock.mockImplementation((playerId) => playerId === 'p2');

      const nextState = updateGame(testState, inputs, currentTime, currentPlayerIDs);

      expect(isInvincibleMock).toHaveBeenCalledWith('p2', [], currentTime);
      expect(hasCollidedWithSnakeMock).not.toHaveBeenCalledWith(
        p2IntendedPos,
        expect.anything(),
        'p2'
      );

      expect(hasCollidedWithSnakeMock).toHaveBeenCalledWith(p1IntendedPos, expect.anything(), 'p1');
      expect(hasCollidedWithSnakeMock).toHaveBeenCalledWith(
        aiIntendedPos,
        expect.anything(),
        AI_SNAKE_ID
      );

      expect(nextState.snakes.some((s) => s.id === 'p2')).toBe(true);
      expect(nextState.snakes).toHaveLength(3);
      expect(nextState.playerStats['p2'].deaths).toBe(0);
    });
  });

  describe('Food Handling', () => {
    const growSnakeMock = snakeLogic.growSnake as jest.Mock;
    const getScoreMultiplierMock = powerUpLogic.getScoreMultiplier as jest.Mock;
    const foodItem: Food = { position: { x: 6, y: 5 }, value: FOOD_VALUE };
    const snake = createMockSnake('p1', [
      { x: 5, y: 5 },
      { x: 4, y: 5 }
    ]);

    beforeEach(() => {
      baseState = createInitialState([snake], [foodItem], [], [], {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
      });
      moveSnakeBodyMock.mockImplementation((s) =>
        s.id === 'p1'
          ? {
              ...s,
              body: [
                { x: 6, y: 5 },
                { x: 5, y: 5 }
              ]
            }
          : s
      );
      growSnakeMock.mockImplementation((s) => ({
        ...s,
        body: [{ x: s.body[0].x, y: s.body[0].y }, ...s.body]
      }));
      checkFoodCollisionMock.mockImplementation((point, foodList) => {
        if (
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
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);
      const expectedHeadPos = { x: 6, y: 5 };

      const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      expect(checkFoodCollisionMock).toHaveBeenCalledWith(expectedHeadPos, [foodItem]);
      expect(growSnakeMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
      expect(getScoreMultiplierMock).toHaveBeenCalledWith('p1', [], currentTime);
      expect(nextState.snakes[0].score).toBe(FOOD_VALUE * 1);
      expect(nextState.snakes[0].body.length).toBe(3);
      expect(nextState.food).toHaveLength(0);
      expect(nextState.playerStats['p1'].score).toBe(FOOD_VALUE * 1);
    });

    it('should apply score multiplier when eating food', () => {
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);
      getScoreMultiplierMock.mockReturnValue(2);
      const expectedHeadPos = { x: 6, y: 5 };

      const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      expect(checkFoodCollisionMock).toHaveBeenCalledWith(expectedHeadPos, [foodItem]);
      expect(getScoreMultiplierMock).toHaveBeenCalledWith('p1', [], currentTime);
      expect(nextState.snakes[0].score).toBe(FOOD_VALUE * 2);
      expect(nextState.playerStats['p1'].score).toBe(FOOD_VALUE * 2);
    });

    it('should generate new food if below threshold', () => {
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
      const foodItem: Food = { position: { x: 6, y: 5 }, value: FOOD_VALUE };
      const snake = createMockSnake('p1', [
        { x: 5, y: 5 },
        { x: 4, y: 5 }
      ]);
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

      const expectedHeadPos = { x: 6, y: 5 };
      moveSnakeBodyMock.mockImplementation((s) =>
        s.id === 'p1' ? { ...s, body: [expectedHeadPos, { x: 5, y: 5 }] } : s
      );

      checkFoodCollisionMock.mockImplementation((point, foodList) => {
        if (
          point.x === foodItem.position.x &&
          point.y === foodItem.position.y &&
          foodList.includes(foodItem)
        ) {
          return foodItem;
        }
        return null;
      });

      const growSnakeMock = snakeLogic.growSnake as jest.Mock;
      growSnakeMock.mockImplementation((s) => ({
        ...s,
        body: [{ x: s.body[0].x, y: s.body[0].y }, ...s.body]
      }));

      const getScoreMultiplierMock = powerUpLogic.getScoreMultiplier as jest.Mock;
      getScoreMultiplierMock.mockReturnValue(1);

      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(getSpeedFactorMock).toHaveBeenCalledWith('p1', [slowPowerUp], currentTime);

      expect(checkFoodCollisionMock).toHaveBeenCalledWith(expectedHeadPos, [foodItem]);

      expect(growSnakeMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));

      expect(getScoreMultiplierMock).toHaveBeenCalledWith('p1', [slowPowerUp], currentTime);

      expect(nextState.food).toHaveLength(0);

      expect(nextState.snakes[0].score).toBe(FOOD_VALUE * 1);
      expect(nextState.playerStats['p1'].score).toBe(FOOD_VALUE * 1);

      expect(nextState.snakes[0].body.length).toBe(3);
    });
  });

  describe('PowerUp Handling', () => {
    const activatePowerUpMock = powerUpLogic.activatePowerUp as jest.Mock;
    const cleanupExpiredActivePowerUpsMock = powerUpLogic.cleanupExpiredActivePowerUps as jest.Mock;
    const cleanupExpiredGridPowerUpsMock = powerUpLogic.cleanupExpiredGridPowerUps as jest.Mock;

    const powerUpItem: PowerUp = {
      id: 'pu1',
      type: PowerUpType.SPEED,
      position: { x: 6, y: 5 },
      expiresAt: currentTime + 5000
    };
    const snake = createMockSnake('p1', [
      { x: 5, y: 5 },
      { x: 4, y: 5 }
    ]);
    const activePowerUp: ActivePowerUp = {
      type: PowerUpType.SPEED,
      playerId: 'p1',
      expiresAt: currentTime + POWER_UP_EFFECT_DURATION
    };

    beforeEach(() => {
      baseState = createInitialState([snake], [], [powerUpItem], [], {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
      });
      moveSnakeBodyMock.mockImplementation((s) =>
        s.id === 'p1'
          ? {
              ...s,
              body: [
                { x: 6, y: 5 },
                { x: 5, y: 5 }
              ]
            }
          : s
      );
      activatePowerUpMock.mockReturnValue(activePowerUp);
      checkPowerUpCollisionMock.mockImplementation((point, puList) => {
        if (
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
    });

    it('should remove grid powerup and add active powerup on collision', () => {
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);
      const expectedHeadPos = { x: 6, y: 5 };

      const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      expect(checkPowerUpCollisionMock).toHaveBeenCalledWith(expectedHeadPos, [powerUpItem]);
      expect(activatePowerUpMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        powerUpItem,
        currentTime
      );
      expect(nextState.powerUps).toHaveLength(0);
      expect(nextState.activePowerUps).toHaveLength(1);
      expect(nextState.activePowerUps[0]).toEqual(activePowerUp);
    });

    it('should call cleanup functions for expired powerups', () => {
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);
      updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      expect(cleanupExpiredGridPowerUpsMock).toHaveBeenCalledWith([powerUpItem], currentTime);
      expect(cleanupExpiredActivePowerUpsMock).toHaveBeenCalledWith([], currentTime);
    });

    it('should NOT generate new powerup if chance fails', () => {
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);
      const snake = createMockSnake('p1', [{ x: 5, y: 5 }]);
      const powerUpItem: PowerUp = {
        id: 'pu1',
        type: PowerUpType.SPEED,
        position: { x: 6, y: 5 },
        expiresAt: currentTime + 1000
      };
      const stateWithPowerup = createInitialState([snake], [], [powerUpItem], [], {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
      });
      checkPowerUpCollisionMock.mockReturnValue(null);

      const nextState = updateGame(stateWithPowerup, inputs, currentTime, currentPlayerIDs);

      expect(generateFoodMock).toHaveBeenCalled();

      expect(generatePowerUpMock).not.toHaveBeenCalled();
      expect(nextState.powerUps).toHaveLength(1);
      expect(nextState.powerUps[0]).toEqual(powerUpItem);

      expect(nextState.powerUpCounter).toBe(0);
    });

    it('should generate a power-up when conditions are met', () => {
      const initialState = createInitialState();

      const mulberrySpy = jest.spyOn(prng, 'mulberry32');
      const mockRandomGenerator = jest.fn();
      mulberrySpy.mockReturnValue(mockRandomGenerator);

      mockRandomGenerator.mockReturnValueOnce(0.5);

      mockRandomGenerator.mockReturnValueOnce(POWERUP_SPAWN_CHANCE / 2);

      mockRandomGenerator.mockReturnValue(0.5);

      const mockPowerUp: PowerUp = {
        id: 'newPU',
        type: PowerUpType.DOUBLE_SCORE,
        position: { x: 15, y: 15 },
        expiresAt: currentTime + 20000
      };

      generatePowerUpMock.mockReturnValue(mockPowerUp);

      const nextState = updateGame(initialState, new Map(), currentTime, new Set());

      expect(mulberrySpy).toHaveBeenCalledWith(initialState.rngSeed);
      expect(mockRandomGenerator).toHaveBeenCalled();

      expect(prng.getOccupiedPositions).toHaveBeenCalled();
      expect(generatePowerUpMock).toHaveBeenCalledTimes(1);
      expect(generatePowerUpMock).toHaveBeenCalledWith(
        initialState.gridSize,
        [],
        expect.any(Function),
        currentTime,
        initialState.powerUpCounter
      );
      expect(nextState.powerUps).toHaveLength(1);
      expect(nextState.powerUps[0]).toEqual(mockPowerUp);
      expect(nextState.powerUpCounter).toBe(initialState.powerUpCounter + 1);

      mulberrySpy.mockRestore();
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
      generateNewSnakeMock.mockImplementation((id) => {
        if (id === AI_SNAKE_ID) return mockAISnake;
        if (id === 'p1') return snake1;
        return createMockSnake(id, [{ x: 9, y: 9 }]);
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

      const slowPowerUp: ActivePowerUp = {
        type: PowerUpType.SLOW,
        playerId: 'p1',
        expiresAt: currentTime + 1000
      };
      const initialState = createInitialState([snake], [], [], [slowPowerUp]);
      initialState.sequence = 0;
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      getSpeedFactorMock.mockReturnValue(0.5);

      updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(getSpeedFactorMock).toHaveBeenCalledWith('p1', [slowPowerUp], currentTime);
      expect(moveSnakeBodyMock).not.toHaveBeenCalled();
    });

    it('should move snake if SLOW powerup is active and sequence is odd', () => {
      const snake1 = createMockSnake('p1', [{ x: 5, y: 5 }]);

      const slowPowerUp: ActivePowerUp = {
        type: PowerUpType.SLOW,
        playerId: 'p1',
        expiresAt: currentTime + 1000
      };

      const initialState = createInitialState([snake1], [], [], [slowPowerUp]);
      initialState.sequence = 1;
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      const mockAISnake = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]);
      generateNewSnakeMock.mockImplementation((id) => {
        if (id === AI_SNAKE_ID) return mockAISnake;
        if (id === 'p1') return snake1;
        return createMockSnake(id, [{ x: 9, y: 9 }]);
      });

      getSpeedFactorMock.mockReturnValue(0.5);

      updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(getSpeedFactorMock).toHaveBeenCalledWith('p1', [slowPowerUp], currentTime);

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
      hasCollidedWithSnakeMock.mockImplementation((head, snakes, currentSnakeId) => {
        if (currentSnakeId === AI_SNAKE_ID) {
          return true;
        }
        return false;
      });

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
      hasCollidedWithSnakeMock.mockImplementation((head, snakes, currentSnakeId) => {
        if (currentSnakeId === AI_SNAKE_ID) {
          return true;
        }
        return false;
      });

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
      const initialAISnake = createMockSnake(AI_SNAKE_ID, [{ x: 5, y: 5 }]);
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

      hasCollidedWithSnakeMock.mockImplementation((head, snakes, selfId) => selfId === AI_SNAKE_ID);
      isInvincibleMock.mockReturnValue(false);
      moveSnakeBodyMock.mockImplementation((s) => s);

      const stateAfterCollision = updateGame(initialState, inputs, tick1Time, currentPlayerIDs);

      expect(stateAfterCollision.snakes.find((s) => s.id === AI_SNAKE_ID)).toBeUndefined();
      expect(stateAfterCollision.playerStats[AI_SNAKE_ID]?.deaths).toBe(2);
      expect(stateAfterCollision.playerStats[AI_SNAKE_ID]?.score).toBe(50);

      expect(stateAfterCollision.playerStats[AI_SNAKE_ID]?.isConnected).toBe(true);

      hasCollidedWithSnakeMock.mockReset();
      generateNewSnakeMock.mockReset();
      const newAISnakeMock = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }], Direction.RIGHT, 0);
      generateNewSnakeMock.mockImplementation((id) => {
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
