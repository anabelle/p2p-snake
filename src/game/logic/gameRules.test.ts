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

// --- Mocks ---
jest.mock('./snakeLogic', () => ({
  ...jest.requireActual('./snakeLogic'),
  generateNewSnake: jest.fn(),
  moveSnakeBody: jest.fn((snake) => ({ ...snake, body: [...snake.body] })), // Simple mock, assumes movement happens
  growSnake: jest.fn((snake) => ({
    ...snake,
    body: [...snake.body, snake.body[snake.body.length - 1]]
  })) // Simple mock growth
}));
jest.mock('./foodLogic', () => ({
  ...jest.requireActual('./foodLogic'),
  generateFood: jest.fn()
}));
jest.mock('./powerUpLogic', () => ({
  ...jest.requireActual('./powerUpLogic'),
  generatePowerUp: jest.fn(),
  activatePowerUp: jest.fn(),
  cleanupExpiredActivePowerUps: jest.fn((arr) => arr), // Pass through by default
  cleanupExpiredGridPowerUps: jest.fn((arr) => arr), // Pass through by default
  getScoreMultiplier: jest.fn().mockReturnValue(1),
  getSpeedFactor: jest.fn().mockReturnValue(1),
  isInvincible: jest.fn().mockReturnValue(false)
}));
jest.mock('./collision', () => ({
  ...jest.requireActual('./collision'),
  checkFoodCollision: jest.fn().mockReturnValue(null),
  checkPowerUpCollision: jest.fn().mockReturnValue(null),
  hasCollidedWithSnake: jest.fn().mockReturnValue(false),
  hasCollidedWithWall: jest.fn().mockReturnValue(false) // Assuming wall collision is off/wrapped
}));

// --- Helper Functions ---
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
  rngSeed: 12345, // Fixed seed for tests unless overridden
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

// --- Tests ---
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
  let getOccupiedPositionsSpy: jest.SpyInstance; // Declare spy variable

  beforeEach(() => {
    jest.clearAllMocks();
    baseState = createInitialState();
    // Default mock implementations
    // Use spyOn for getOccupiedPositions
    getOccupiedPositionsSpy = jest.spyOn(prng, 'getOccupiedPositions').mockReturnValue([]);
    generateNewSnakeMock.mockImplementation((id, gs, occ, rf, color) =>
      createMockSnake(id, [{ x: 0, y: 0 }])
    );
    moveSnakeBodyMock.mockImplementation((snake) => {
      // Basic mock move right for simplicity in setup
      const nextHead = { ...snake.body[0] };
      nextHead.x = (nextHead.x + 1 + GRID_SIZE.width) % GRID_SIZE.width;
      return { ...snake, body: [nextHead, ...snake.body.slice(0, -1)] };
    });
    isInvincibleMock.mockReturnValue(false);
    hasCollidedWithSnakeMock.mockReturnValue(false);
    checkFoodCollisionMock.mockReturnValue(null);
    checkPowerUpCollisionMock.mockReturnValue(null);
    getSpeedFactorMock.mockReturnValue(1);
    if (jest.isMockFunction(console.log)) {
      (console.log as jest.Mock).mockRestore();
    }
    if (jest.isMockFunction(console.error)) {
      (console.error as jest.Mock).mockRestore();
    }
    // Ensure cleanup mock is consistently applied
    (powerUpLogic.cleanupExpiredGridPowerUps as jest.Mock).mockImplementation((arr: PowerUp[]) =>
      arr.filter((p: PowerUp) => p.expiresAt > currentTime)
    );
    (powerUpLogic.cleanupExpiredActivePowerUps as jest.Mock).mockImplementation(
      (arr: ActivePowerUp[]) => arr.filter((p: ActivePowerUp) => p.expiresAt > currentTime)
    );
  });

  afterEach(() => {
    // Restore any globally spied-on functions after each test
    jest.restoreAllMocks();
    // Explicitly restore our spy if it exists
    if (getOccupiedPositionsSpy) {
      getOccupiedPositionsSpy.mockRestore();
    }
  });

  // --- Player Joining/Leaving ---
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
      const currentPlayerIDs = new Set(['p1']); // p2 left

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
        p1: { id: 'p1', color: 'red', score: 10, deaths: 1, isConnected: false } // Previously disconnected
      };
      const initialState = createInitialState([], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']); // p1 rejoins
      // Mock snake generated for p1 - AI snake will also be generated
      const mockP1Snake = createMockSnake('p1', [{ x: 1, y: 1 }], Direction.RIGHT, 0);
      // Mock AI snake (assuming default generation)
      const mockAISnake = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]);

      generateNewSnakeMock.mockImplementation((id, gs, occ, rf, color) => {
        if (id === 'p1') return mockP1Snake;
        if (id === AI_SNAKE_ID) return mockAISnake;
        return createMockSnake(id, [{ x: 9, y: 9 }]); // Default fallback shouldn't be hit
      });

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(nextState.snakes).toHaveLength(2);
      const p1Snake = nextState.snakes.find((s) => s.id === 'p1');
      expect(p1Snake).toBeDefined();
      expect(p1Snake?.score).toBe(10); // Score should be restored
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
      // Restore original mock implementation (remove debug check)
      generateNewSnakeMock.mockImplementation((id, gs, occ, rf, color) => {
        if (id === 'p1') {
          // Create mock specifically for p1, respecting the passed color (or default if undefined)
          return { ...createMockSnake(id, [{ x: 1, y: 1 }]), color: color || PLAYER_COLORS[0] };
        }
        // Default AI snake generation (game logic passes a hardcoded color)
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
      ); // Corrected color

      const aiSnake = nextState.snakes.find((s) => s.id === AI_SNAKE_ID);
      expect(aiSnake?.color).toBeDefined();
    });

    it('should sync score if snake score and playerStats score diverge (stats higher)', () => {
      const snake1 = createMockSnake('p1', [{ x: 0, y: 0 }], Direction.RIGHT, 5); // Snake score = 5
      const playerStats: Record<string, PlayerStats> = {
        p1: { id: 'p1', color: 'red', score: 10, deaths: 0, isConnected: true } // Stats score = 10
      };
      // AI snake will be added because p1 is connected
      const initialState = createInitialState([snake1], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(logSpy).toHaveBeenCalledWith('Syncing score for p1: Snake=5, Stats=10');
      // Find p1 snake to check its score
      const p1Snake = nextState.snakes.find((s) => s.id === 'p1');
      expect(p1Snake?.score).toBe(10); // Synced to higher score
      expect(nextState.playerStats['p1'].score).toBe(10); // Synced to higher score
      expect(nextState.snakes.length).toBe(2); // p1 + AI
      logSpy.mockRestore();
    });

    it('should sync score if snake score and playerStats score diverge (snake higher)', () => {
      const snake1 = createMockSnake('p1', [{ x: 0, y: 0 }], Direction.RIGHT, 15); // Snake score = 15
      const playerStats: Record<string, PlayerStats> = {
        p1: { id: 'p1', color: 'red', score: 10, deaths: 0, isConnected: true } // Stats score = 10
      };
      // AI snake will be added
      const initialState = createInitialState([snake1], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(logSpy).toHaveBeenCalledWith('Syncing score for p1: Snake=15, Stats=10');
      // Find p1 snake
      const p1Snake = nextState.snakes.find((s) => s.id === 'p1');
      expect(p1Snake?.score).toBe(15); // Synced to higher score
      expect(nextState.playerStats['p1'].score).toBe(15); // Synced to higher score
      expect(nextState.snakes.length).toBe(2); // p1 + AI
      logSpy.mockRestore();
    });

    it('should update isConnected to false in playerStats if player leaves', () => {
      const snake1 = createMockSnake('p1', [{ x: 0, y: 0 }]);
      const playerStats: Record<string, PlayerStats> = {
        p1: { id: 'p1', color: snake1.color, score: 0, deaths: 0, isConnected: true }
      };
      const initialState = createInitialState([snake1], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set<string>(); // p1 leaves

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      // Check line 144 is hit implicitly by checking the outcome
      expect(nextState.playerStats['p1']).toBeDefined();
      expect(nextState.playerStats['p1'].isConnected).toBe(false);
    });

    it('should keep isConnected as false in playerStats if player remains disconnected', () => {
      const playerStats: Record<string, PlayerStats> = {
        p1: { id: 'p1', color: 'red', score: 5, deaths: 1, isConnected: false } // Already disconnected
      };
      const initialState = createInitialState([], [], [], [], playerStats); // No snake
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set<string>(); // p1 still not connected

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      // Check line 144 condition is false, status remains false
      expect(nextState.playerStats['p1']).toBeDefined();
      expect(nextState.playerStats['p1'].isConnected).toBe(false);
    });

    it('should update isConnected to true in playerStats if player rejoins', () => {
      const playerStats: Record<string, PlayerStats> = {
        p1: { id: 'p1', color: 'blue', score: 5, deaths: 1, isConnected: false } // Disconnected
      };
      const initialState = createInitialState([], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set<string>(['p1']); // p1 rejoins
      generateNewSnakeMock.mockReturnValue(createMockSnake('p1', [{ x: 1, y: 1 }]));

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      // Check line 144 is hit implicitly by checking the outcome
      expect(nextState.playerStats['p1']).toBeDefined();
      expect(nextState.playerStats['p1'].isConnected).toBe(true);
    });
  });

  // --- Snake Movement & Direction ---
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
      const baseState = createInitialState([snake1, snake2]); // AI snake will be added
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1', 'p2']);

      // Mock moveSnakeBody to return a uniquely identifiable object per snake
      moveSnakeBodyMock.mockImplementation((snake, gridSize) => ({
        ...snake,
        moved: true,
        grid: gridSize
      }));

      updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      // Expect 3 calls: p1, p2, and AI snake
      expect(moveSnakeBodyMock).toHaveBeenCalledTimes(3);
      expect(moveSnakeBodyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        GRID_SIZE
      );
      expect(moveSnakeBodyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p2' }),
        GRID_SIZE
      );
      // Check for AI snake call (assuming default mock generation creates AI snake)
      expect(moveSnakeBodyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: AI_SNAKE_ID }),
        GRID_SIZE
      );
    });
  });

  // --- Collision Handling ---
  describe('Collision Handling', () => {
    // Define snakes for shared use
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
    ); // p2 intends to move to 5,5

    beforeEach(() => {
      // Base state setup uses clones of initial snakes to avoid cross-test mutation
      baseState = createInitialState([{ ...initialSnake1 }, { ...initialSnake2 }], [], [], [], {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true },
        p2: { id: 'p2', color: 'blue', score: 0, deaths: 0, isConnected: true }
      });
      // Default mocks for collision tests
      moveSnakeBodyMock.mockImplementation((snake) => snake); // Assume no actual move for simplicity
      hasCollidedWithSnakeMock.mockReturnValue(false);
      isInvincibleMock.mockReturnValue(false);
      // Mock AI snake generation
      const mockAISnake = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]);
      generateNewSnakeMock.mockImplementation((id) => {
        if (id === AI_SNAKE_ID) return mockAISnake;
        // Return clones for the specific test cases if needed, or default mocks
        if (id === 'p1') return { ...initialSnake1 };
        if (id === 'p2') return { ...initialSnake2 };
        return createMockSnake(id, [{ x: 9, y: 9 }]);
      });
    });

    it('should remove a snake if hasCollidedWithSnake returns true based on intended position', () => {
      // Scenario: p2 intends to move RIGHT from {4,5} to {5,5}, colliding with p1's head.
      const p1Start = { ...initialSnake1 }; // Head {5,5}
      const p2Start = { ...initialSnake2 }; // Head {4,5}, Dir RIGHT
      const testState = createInitialState([p1Start, p2Start]); // AI snake will be added
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1', 'p2']);

      // Calculate expected intended positions BEFORE calling updateGame
      const p1IntendedPos = snakeLogic.getNextHeadPosition(p1Start, GRID_SIZE); // {6,5}
      const p2IntendedPos = snakeLogic.getNextHeadPosition(p2Start, GRID_SIZE); // {5,5}
      const aiIntendedPos = snakeLogic.getNextHeadPosition(
        createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]),
        GRID_SIZE
      ); // {1,0}

      // Mock collision check to return true only for p2 intending to move into p1's current head
      hasCollidedWithSnakeMock.mockImplementation((intendedPos, allSnakes, selfId) => {
        if (
          selfId === 'p2' &&
          intendedPos.x === p2IntendedPos.x &&
          intendedPos.y === p2IntendedPos.y
        ) {
          // Check if p2's intended position {5,5} matches any part of other snakes (p1's head)
          const otherSnakes = allSnakes.filter((s: Snake) => s.id !== selfId);
          return otherSnakes.some((s: Snake) =>
            s.body.some((seg: Point) => seg.x === intendedPos.x && seg.y === intendedPos.y)
          );
        }
        return false;
      });
      isInvincibleMock.mockReturnValue(false); // Ensure not invincible

      const nextState = updateGame(testState, inputs, currentTime, currentPlayerIDs);

      // Verify the collision check was called with p2's *intended* position
      expect(hasCollidedWithSnakeMock).toHaveBeenCalledWith(
        p2IntendedPos,
        expect.arrayContaining([
          expect.objectContaining({ id: 'p1' }),
          expect.objectContaining({ id: AI_SNAKE_ID })
        ]),
        'p2'
      );

      // Verify checks for others were also called with their intended positions
      expect(hasCollidedWithSnakeMock).toHaveBeenCalledWith(p1IntendedPos, expect.anything(), 'p1');
      expect(hasCollidedWithSnakeMock).toHaveBeenCalledWith(
        aiIntendedPos,
        expect.anything(),
        AI_SNAKE_ID
      );

      expect(isInvincibleMock).toHaveBeenCalledWith('p2', [], currentTime);

      // Expect p1 and AI snake to remain, p2 removed
      expect(nextState.snakes).toHaveLength(2);
      expect(nextState.snakes.some((s) => s.id === 'p1')).toBe(true);
      expect(nextState.snakes.some((s) => s.id === AI_SNAKE_ID)).toBe(true);
      expect(nextState.snakes.some((s) => s.id === 'p2')).toBe(false);
      expect(nextState.playerStats['p2'].deaths).toBe(1);
    });

    it('should NOT remove a snake if it collides but is invincible', () => {
      // Scenario: p2 intends to move RIGHT from {4,5} to {5,5}, colliding with p1's head, but p2 is invincible.
      const p1Start = { ...initialSnake1 }; // Head {5,5}
      const p2Start = { ...initialSnake2 }; // Head {4,5}, Dir RIGHT
      const testState = createInitialState([p1Start, p2Start]); // AI snake added
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1', 'p2']);

      // Calculate expected intended positions
      const p1IntendedPos = snakeLogic.getNextHeadPosition(p1Start, GRID_SIZE); // {6,5}
      const p2IntendedPos = snakeLogic.getNextHeadPosition(p2Start, GRID_SIZE); // {5,5}
      const aiIntendedPos = snakeLogic.getNextHeadPosition(
        createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]),
        GRID_SIZE
      ); // {1,0}

      // Mock collision check to return true if p2's intended move hits anything
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
        return false; // No other collisions simulated
      });
      isInvincibleMock.mockImplementation((playerId) => playerId === 'p2'); // p2 is invincible

      const nextState = updateGame(testState, inputs, currentTime, currentPlayerIDs);

      // Verify collision check for p2 was skipped because invincible check comes first
      expect(isInvincibleMock).toHaveBeenCalledWith('p2', [], currentTime);
      expect(hasCollidedWithSnakeMock).not.toHaveBeenCalledWith(
        p2IntendedPos,
        expect.anything(),
        'p2'
      );

      // Verify collision checks for others still happened with their intended positions
      expect(hasCollidedWithSnakeMock).toHaveBeenCalledWith(p1IntendedPos, expect.anything(), 'p1');
      expect(hasCollidedWithSnakeMock).toHaveBeenCalledWith(
        aiIntendedPos,
        expect.anything(),
        AI_SNAKE_ID
      );

      // Check snake p2 still exists
      expect(nextState.snakes.some((s) => s.id === 'p2')).toBe(true);
      expect(nextState.snakes).toHaveLength(3);
      expect(nextState.playerStats['p2'].deaths).toBe(0);
    });
  });

  // --- Food Handling ---
  describe('Food Handling', () => {
    const growSnakeMock = snakeLogic.growSnake as jest.Mock;
    const getScoreMultiplierMock = powerUpLogic.getScoreMultiplier as jest.Mock;
    const foodItem: Food = { position: { x: 6, y: 5 }, value: FOOD_VALUE }; // Food at destination
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

    // --- Test for Slow Powerup Food Bug ---
    it('should eat food correctly even if SLOW powerup prevents movement in the current tick', () => {
      const foodItem: Food = { position: { x: 6, y: 5 }, value: FOOD_VALUE }; // Food at destination
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
      initialState.sequence = 0; // Even sequence, snake should NOT move this tick

      // Mock speed factor to be slow
      getSpeedFactorMock.mockReturnValue(0.5);

      // Mock moveSnakeBody to simulate head moving to food (even though body won't update due to slow)
      // This reflects that the intended position IS the food location
      const expectedHeadPos = { x: 6, y: 5 };
      moveSnakeBodyMock.mockImplementation(
        (s) => (s.id === 'p1' ? { ...s, body: [expectedHeadPos, { x: 5, y: 5 }] } : s) // Simulates head moving
      );

      // Mock food collision detection
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

      // Mock growSnake
      const growSnakeMock = snakeLogic.growSnake as jest.Mock;
      growSnakeMock.mockImplementation((s) => ({
        ...s,
        body: [{ x: s.body[0].x, y: s.body[0].y }, ...s.body]
      }));

      // Mock score multiplier (default 1)
      const getScoreMultiplierMock = powerUpLogic.getScoreMultiplier as jest.Mock;
      getScoreMultiplierMock.mockReturnValue(1);

      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      // --- Act ---
      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      // --- Assert ---
      // 1. Speed factor was checked
      expect(getSpeedFactorMock).toHaveBeenCalledWith('p1', [slowPowerUp], currentTime);

      // 2. Calculate Intended Position: The logic now calculates intended position internally.
      //    We don't need to directly assert moveSnakeBody was called in the same way.
      //    Instead, we focus on the *outcomes* based on the intended position.

      // 3. Food collision was checked with the *intended* head position
      expect(checkFoodCollisionMock).toHaveBeenCalledWith(expectedHeadPos, [foodItem]);

      // 4. Snake GREW based on collision at intended position (THIS IS THE CORE FIX)
      expect(growSnakeMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));

      // 5. Score multiplier was checked
      expect(getScoreMultiplierMock).toHaveBeenCalledWith('p1', [slowPowerUp], currentTime);

      // 6. Food was removed
      expect(nextState.food).toHaveLength(0);

      // 7. Snake score increased
      expect(nextState.snakes[0].score).toBe(FOOD_VALUE * 1);
      expect(nextState.playerStats['p1'].score).toBe(FOOD_VALUE * 1);

      // 8. Snake length increased
      expect(nextState.snakes[0].body.length).toBe(3); // Original 2 + 1 from growth
    });
    // --- End Test for Slow Powerup Food Bug ---
  });

  // --- PowerUp Handling ---
  describe('PowerUp Handling', () => {
    const activatePowerUpMock = powerUpLogic.activatePowerUp as jest.Mock;
    const cleanupExpiredActivePowerUpsMock = powerUpLogic.cleanupExpiredActivePowerUps as jest.Mock;
    const cleanupExpiredGridPowerUpsMock = powerUpLogic.cleanupExpiredGridPowerUps as jest.Mock;

    const powerUpItem: PowerUp = {
      id: 'pu1',
      type: PowerUpType.SPEED,
      position: { x: 6, y: 5 },
      expiresAt: currentTime + 5000
    }; // Powerup at destination
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
      const snake = createMockSnake('p1', [{ x: 5, y: 5 }]); // Add snake definition
      const powerUpItem: PowerUp = {
        id: 'pu1',
        type: PowerUpType.SPEED,
        position: { x: 6, y: 5 },
        expiresAt: currentTime + 1000
      }; // Existing PU
      const stateWithPowerup = createInitialState(
        [snake],
        [],
        [powerUpItem], // Start with one powerup
        [],
        { p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true } }
      );
      checkPowerUpCollisionMock.mockReturnValue(null);
      // getOccupiedPositionsSpy is setup in beforeEach

      const nextState = updateGame(stateWithPowerup, inputs, currentTime, currentPlayerIDs);

      expect(generateFoodMock).toHaveBeenCalled(); // Still called

      // Check powerup was NOT generated (chance fails with default seed)
      expect(generatePowerUpMock).not.toHaveBeenCalled();
      expect(nextState.powerUps).toHaveLength(1); // Should only contain the initial one
      expect(nextState.powerUps[0]).toEqual(powerUpItem);
      // Counter only increments on successful spawn, so it stays 0 here.
      expect(nextState.powerUpCounter).toBe(0);
    });

    it('should generate a power-up when conditions are met', () => {
      // Arrange
      const initialState = createInitialState(); // Start with no powerups

      // Spy on mulberry32 and make it return a controllable mock generator
      const mulberrySpy = jest.spyOn(prng, 'mulberry32');
      const mockRandomGenerator = jest.fn();
      mulberrySpy.mockReturnValue(mockRandomGenerator);

      // Control the sequence of numbers returned by the mock generator
      // First call inside updateGame (line 36: seed update) return default
      mockRandomGenerator.mockReturnValueOnce(0.5);
      // Second call (line 441: spawn check) should trigger spawn
      mockRandomGenerator.mockReturnValueOnce(POWERUP_SPAWN_CHANCE / 2);
      // Subsequent calls (e.g., line 459 seed update, food/powerup placement) return default
      mockRandomGenerator.mockReturnValue(0.5);

      const mockPowerUp: PowerUp = {
        id: 'newPU',
        type: PowerUpType.DOUBLE_SCORE,
        position: { x: 15, y: 15 },
        expiresAt: currentTime + 20000
      };

      generatePowerUpMock.mockReturnValue(mockPowerUp);
      // We still need getOccupiedPositions mocked as it's called before generatePowerUp - Handled by beforeEach

      // Act
      const nextState = updateGame(initialState, new Map(), currentTime, new Set());

      // Assert
      expect(mulberrySpy).toHaveBeenCalledWith(initialState.rngSeed); // Was the generator created with the right seed?
      expect(mockRandomGenerator).toHaveBeenCalled(); // Was the generator function called?
      // Use prng.getOccupiedPositions directly, as it's spied on in beforeEach
      expect(prng.getOccupiedPositions).toHaveBeenCalled();
      expect(generatePowerUpMock).toHaveBeenCalledTimes(1);
      expect(generatePowerUpMock).toHaveBeenCalledWith(
        initialState.gridSize,
        [], // Result from getOccupiedPositions spy
        expect.any(Function), // The actual mockRandomGenerator instance
        currentTime,
        initialState.powerUpCounter // Initial counter value (0)
      );
      expect(nextState.powerUps).toHaveLength(1);
      expect(nextState.powerUps[0]).toEqual(mockPowerUp);
      expect(nextState.powerUpCounter).toBe(initialState.powerUpCounter + 1);

      // Restore spies
      mulberrySpy.mockRestore();
    });

    // Test power-up cleanup
  });

  // --- State & RNG ---
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
      // AI snake will be added
      const initialState = createInitialState([snake1]);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      // Mock AI snake generation
      const mockAISnake = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]);
      generateNewSnakeMock.mockImplementation((id) => {
        if (id === AI_SNAKE_ID) return mockAISnake;
        if (id === 'p1') return snake1;
        return createMockSnake(id, [{ x: 9, y: 9 }]);
      });

      updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      // Expect 2 calls: p1 and AI snake
      expect(moveSnakeBodyMock).toHaveBeenCalledTimes(2); // Corrected count
      expect(moveSnakeBodyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        GRID_SIZE
      );
      expect(moveSnakeBodyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: AI_SNAKE_ID }),
        GRID_SIZE
      ); // Added AI check
    });

    it('should not move snake if SLOW powerup is active and sequence is even', () => {
      const snake = createMockSnake('p1', [{ x: 5, y: 5 }]);
      // Corrected ActivePowerUp definition (no id, uses playerId)
      const slowPowerUp: ActivePowerUp = {
        type: PowerUpType.SLOW,
        playerId: 'p1',
        expiresAt: currentTime + 1000
      };
      const initialState = createInitialState([snake], [], [], [slowPowerUp]);
      initialState.sequence = 0; // Even sequence number
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      getSpeedFactorMock.mockReturnValue(0.5); // Slow speed

      updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      // Verify lines 196-197 were hit by checking mock calls
      expect(getSpeedFactorMock).toHaveBeenCalledWith('p1', [slowPowerUp], currentTime);
      expect(moveSnakeBodyMock).not.toHaveBeenCalled();
    });

    it('should move snake if SLOW powerup is active and sequence is odd', () => {
      const snake1 = createMockSnake('p1', [{ x: 5, y: 5 }]);
      // Corrected ActivePowerUp definition (removed startedAt)
      const slowPowerUp: ActivePowerUp = {
        type: PowerUpType.SLOW,
        playerId: 'p1',
        expiresAt: currentTime + 1000
      };
      // AI snake will be added
      const initialState = createInitialState([snake1], [], [], [slowPowerUp]);
      initialState.sequence = 1; // Odd sequence number
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      // Mock AI snake generation
      const mockAISnake = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }]);
      generateNewSnakeMock.mockImplementation((id) => {
        if (id === AI_SNAKE_ID) return mockAISnake;
        if (id === 'p1') return snake1;
        return createMockSnake(id, [{ x: 9, y: 9 }]);
      });

      getSpeedFactorMock.mockReturnValue(0.5); // Simulate SLOW effect

      updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(getSpeedFactorMock).toHaveBeenCalledWith('p1', [slowPowerUp], currentTime);
      // Expect 2 calls: p1 (moved due to odd seq) and AI (moved normally)
      expect(moveSnakeBodyMock).toHaveBeenCalledTimes(2); // Corrected count
      expect(moveSnakeBodyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        GRID_SIZE
      );
      expect(moveSnakeBodyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: AI_SNAKE_ID }),
        GRID_SIZE
      ); // Added AI check
    });

    // ... other collision/movement tests ...
  });

  describe('State Integrity', () => {
    it('should create playerStats entry if missing for an existing snake (line 284)', () => {
      const snake = createMockSnake('p1', [{ x: 3, y: 3 }], Direction.LEFT, 5); // Snake exists
      const playerStats: Record<string, PlayerStats> = {
        /* 'p1' is missing */
      };
      const initialState = createInitialState([snake], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(nextState.playerStats['p1']).toBeDefined();
      expect(nextState.playerStats['p1']).toEqual({
        id: 'p1',
        name: 'Player_p1', // Add expected default name
        color: snake.color,
        score: snake.score,
        deaths: 0,
        isConnected: true
      });
    });

    // ... other state integrity tests ...
  });

  describe('AI Snake Collisions', () => {
    it('should remove AI snake and increment its death counter when it collides with another snake', () => {
      // Mock snakes
      const aiSnake = createMockSnake(AI_SNAKE_ID, [
        { x: 5, y: 5 },
        { x: 5, y: 6 }
      ]);
      const playerSnake = createMockSnake('player1', [
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ]);

      // Create state with AI snake about to move into player snake
      const initialState = createMinimalGameState();
      initialState.snakes = [aiSnake, playerSnake];
      initialState.playerStats = {
        [AI_SNAKE_ID]: { id: AI_SNAKE_ID, color: 'orange', score: 0, deaths: 0, isConnected: true },
        player1: { id: 'player1', color: 'blue', score: 0, deaths: 0, isConnected: true }
      };

      // Mock collision detection to simulate AI snake colliding with player
      const hasCollidedWithSnakeMock = jest.spyOn(collision, 'hasCollidedWithSnake');
      hasCollidedWithSnakeMock.mockImplementation((head, snakes, currentSnakeId) => {
        if (currentSnakeId === AI_SNAKE_ID) {
          return true; // Simulate AI snake collision
        }
        return false;
      });

      // Set up inputs to make AI snake move
      const inputs = new Map<string, Direction>();
      inputs.set(AI_SNAKE_ID, Direction.RIGHT);

      // Execute update
      const playerIds = new Set(['player1']);
      const nextState = updateGame(initialState, inputs, Date.now(), playerIds);

      // Verify AI snake was removed
      const aiSnakeAfter = nextState.snakes.find((s) => s.id === AI_SNAKE_ID);
      expect(aiSnakeAfter).toBeUndefined();

      // Verify death counter was incremented
      expect(nextState.playerStats[AI_SNAKE_ID].deaths).toBe(1);

      // Clean up mock
      hasCollidedWithSnakeMock.mockRestore();
    });

    it('should remove AI snake and increment its death counter when it collides with itself', () => {
      // Mock AI snake with a longer body (to test self-collision)
      const aiSnake = createMockSnake(AI_SNAKE_ID, [
        { x: 5, y: 5 }, // head
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 7, y: 6 },
        { x: 6, y: 6 },
        { x: 5, y: 6 } // this segment is adjacent to head, could cause collision
      ]);

      // Create state with just the AI snake
      const initialState = createMinimalGameState();
      initialState.snakes = [aiSnake];
      initialState.playerStats = {
        [AI_SNAKE_ID]: { id: AI_SNAKE_ID, color: 'orange', score: 0, deaths: 0, isConnected: true }
      };

      // Mock collision detection to simulate AI snake colliding with itself
      const hasCollidedWithSnakeMock = jest.spyOn(collision, 'hasCollidedWithSnake');
      hasCollidedWithSnakeMock.mockImplementation((head, snakes, currentSnakeId) => {
        if (currentSnakeId === AI_SNAKE_ID) {
          return true; // Simulate AI snake self-collision
        }
        return false;
      });

      // Set up inputs to make AI snake move
      const inputs = new Map<string, Direction>();
      inputs.set(AI_SNAKE_ID, Direction.DOWN);

      // Execute update
      const playerIds = new Set(['player1']); // Need at least one player for AI to exist
      const nextState = updateGame(initialState, inputs, Date.now(), playerIds);

      // Verify AI snake was removed
      const aiSnakeAfter = nextState.snakes.find((s) => s.id === AI_SNAKE_ID);
      expect(aiSnakeAfter).toBeUndefined();

      // Verify death counter was incremented
      expect(nextState.playerStats[AI_SNAKE_ID].deaths).toBe(1);

      // Clean up mock
      hasCollidedWithSnakeMock.mockRestore();
    });
  });

  describe('AI Snake Respawn', () => {
    it('should respawn AI snake with its previous score and deaths after collision', () => {
      // Initial state: AI snake exists, player exists
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

      // Mock collision for AI snake in the first tick
      hasCollidedWithSnakeMock.mockImplementation((head, snakes, selfId) => selfId === AI_SNAKE_ID);
      isInvincibleMock.mockReturnValue(false); // Ensure AI is not invincible
      moveSnakeBodyMock.mockImplementation((s) => s); // Prevent movement interfering

      // --- Tick 1: AI Snake Collides ---
      const stateAfterCollision = updateGame(initialState, inputs, tick1Time, currentPlayerIDs);

      // Verify AI snake was removed and stats updated
      expect(stateAfterCollision.snakes.find((s) => s.id === AI_SNAKE_ID)).toBeUndefined();
      expect(stateAfterCollision.playerStats[AI_SNAKE_ID]?.deaths).toBe(2); // Deaths incremented
      expect(stateAfterCollision.playerStats[AI_SNAKE_ID]?.score).toBe(50); // Score preserved in stats
      // AI remains "connected" in stats as long as other players are present
      expect(stateAfterCollision.playerStats[AI_SNAKE_ID]?.isConnected).toBe(true); // Corrected assertion

      // Reset mocks for the next tick
      hasCollidedWithSnakeMock.mockReset(); // Reset collision mock
      generateNewSnakeMock.mockReset(); // Reset generation mock
      const newAISnakeMock = createMockSnake(AI_SNAKE_ID, [{ x: 0, y: 0 }], Direction.RIGHT, 0); // Generated with 0 score
      generateNewSnakeMock.mockImplementation((id) => {
        if (id === AI_SNAKE_ID) return newAISnakeMock;
        return createMockSnake(id, [{ x: 9, y: 9 }]);
      });
      getOccupiedPositionsSpy.mockReturnValue([]); // Clear occupied positions for respawn

      // --- Tick 2: AI Snake Respawns ---
      const stateAfterRespawn = updateGame(
        stateAfterCollision,
        inputs,
        tick2Time,
        currentPlayerIDs
      );

      // Verify generateNewSnake was called for AI
      expect(generateNewSnakeMock).toHaveBeenCalledWith(
        AI_SNAKE_ID,
        initialState.gridSize,
        expect.any(Array),
        expect.any(Function),
        '#FF5500' // Expect the hardcoded color
      );

      // Verify AI snake is back in the state
      const respawnedAISnake = stateAfterRespawn.snakes.find((s) => s.id === AI_SNAKE_ID);
      expect(respawnedAISnake).toBeDefined();

      // Verify score was restored to the snake object (Lines 71, 80-81)
      expect(respawnedAISnake?.score).toBe(50);

      // Verify stats are correct
      expect(stateAfterRespawn.playerStats[AI_SNAKE_ID]?.deaths).toBe(2); // Deaths remain incremented
      expect(stateAfterRespawn.playerStats[AI_SNAKE_ID]?.score).toBe(50); // Score remains in stats
      expect(stateAfterRespawn.playerStats[AI_SNAKE_ID]?.isConnected).toBe(true); // Marked as connected again
    });
  });
});
