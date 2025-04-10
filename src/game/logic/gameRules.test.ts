import {
  updateGame,
  PlayerInputs
} from './gameRules';
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
import { GRID_SIZE, FOOD_VALUE, PLAYER_COLORS, POWER_UP_EFFECT_DURATION, POWER_UP_GRID_DURATION } from '../constants';
import * as snakeLogic from './snakeLogic';
import * as foodLogic from './foodLogic';
import * as powerUpLogic from './powerUpLogic';
import * as collision from './collision';
import * as prng from './prng';
import { AI_SNAKE_ID } from "./aiSnake";

// --- Mocks ---
jest.mock('./prng', () => ({
  ...jest.requireActual('./prng'), // Keep mulberry32
  generateRandomPosition: jest.fn(),
  getOccupiedPositions: jest.fn(),
}));
jest.mock('./snakeLogic', () => ({
  ...jest.requireActual('./snakeLogic'),
  generateNewSnake: jest.fn(),
  moveSnakeBody: jest.fn((snake) => ({ ...snake, body: [...snake.body] })), // Simple mock, assumes movement happens
  growSnake: jest.fn((snake) => ({ ...snake, body: [...snake.body, snake.body[snake.body.length - 1]] })), // Simple mock growth
}));
jest.mock('./foodLogic', () => ({
  ...jest.requireActual('./foodLogic'),
  generateFood: jest.fn(),
}));
jest.mock('./powerUpLogic', () => ({
  ...jest.requireActual('./powerUpLogic'),
  generatePowerUp: jest.fn(),
  activatePowerUp: jest.fn(),
  cleanupExpiredActivePowerUps: jest.fn(arr => arr), // Pass through by default
  cleanupExpiredGridPowerUps: jest.fn(arr => arr), // Pass through by default
  getScoreMultiplier: jest.fn().mockReturnValue(1),
  getSpeedFactor: jest.fn().mockReturnValue(1),
  isInvincible: jest.fn().mockReturnValue(false),
}));
jest.mock('./collision', () => ({
  ...jest.requireActual('./collision'),
  checkFoodCollision: jest.fn().mockReturnValue(null),
  checkPowerUpCollision: jest.fn().mockReturnValue(null),
  hasCollidedWithSnake: jest.fn().mockReturnValue(false),
  hasCollidedWithWall: jest.fn().mockReturnValue(false), // Assuming wall collision is off/wrapped
}));

// --- Helper Functions ---
const createMockSnake = (id: string, body: Point[], direction = Direction.RIGHT, score = 0): Snake => ({
  id,
  body,
  direction,
  color: PLAYER_COLORS[0],
  score,
  activePowerUps: [],
});

const createInitialState = (snakes: Snake[] = [], food: Food[] = [], powerUps: PowerUp[] = [], activePowerUps: ActivePowerUp[] = [], playerStats: Record<string, PlayerStats> = {}): GameState => ({
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
  playerStats,
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
  const getOccupiedPositionsMock = prng.getOccupiedPositions as jest.Mock;
  const generateFoodMock = foodLogic.generateFood as jest.Mock;
  const generatePowerUpMock = powerUpLogic.generatePowerUp as jest.Mock;
  const isInvincibleMock = powerUpLogic.isInvincible as jest.Mock;
  const hasCollidedWithSnakeMock = collision.hasCollidedWithSnake as jest.Mock;
  const checkFoodCollisionMock = collision.checkFoodCollision as jest.Mock;
  const checkPowerUpCollisionMock = collision.checkPowerUpCollision as jest.Mock;
  const getSpeedFactorMock = powerUpLogic.getSpeedFactor as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    baseState = createInitialState();
    // Default mock implementations
    getOccupiedPositionsMock.mockReturnValue([]);
    generateNewSnakeMock.mockImplementation((id, gs, occ, rf, color) => 
        createMockSnake(id, [{x: 0, y: 0}])
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
    (powerUpLogic.cleanupExpiredActivePowerUps as jest.Mock).mockImplementation((arr: ActivePowerUp[]) => 
        arr.filter((p: ActivePowerUp) => p.expiresAt > currentTime)
    );
  });

  afterEach(() => {
    // Restore any globally spied-on functions after each test
    jest.restoreAllMocks();
  });

  // --- Player Joining/Leaving --- 
  describe('Player Management', () => {
     it('should add a new snake for a new player ID', () => {
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);
      moveSnakeBodyMock.mockImplementation(snake => snake);
      const mockNewSnake = createMockSnake('p1', [{x:1, y:1}]);
      generateNewSnakeMock.mockReturnValue(mockNewSnake);
      getOccupiedPositionsMock.mockReturnValue([]);

      const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);
      
      expect(getOccupiedPositionsMock).toHaveBeenCalled();
      expect(generateNewSnakeMock).toHaveBeenCalledTimes(1);
      expect(generateNewSnakeMock).toHaveBeenCalledWith('p1', GRID_SIZE, expect.any(Array), expect.any(Function), undefined);
      expect(nextState.snakes).toHaveLength(1);
      expect(nextState.snakes[0]).toEqual(mockNewSnake);
      expect(nextState.playerCount).toBe(1);
      expect(nextState.playerStats['p1']).toBeDefined();
      expect(nextState.playerStats['p1'].isConnected).toBe(true);
      expect(nextState.playerStats['p1'].color).toBe(mockNewSnake.color);
    });

     it('should remove snakes for players who have left', () => {
      const snake1 = createMockSnake('p1', [{ x: 0, y: 0 }]);
      const snake2 = createMockSnake('p2', [{ x: 1, y: 1 }]);
      const initialState = createInitialState([snake1, snake2], [], [], [], { 
          'p1': { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true },
          'p2': { id: 'p2', color: 'blue', score: 0, deaths: 0, isConnected: true }
      });
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']); // p2 left

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

      expect(nextState.snakes).toHaveLength(1);
      expect(nextState.snakes[0].id).toBe('p1');
      expect(nextState.playerCount).toBe(1);
      expect(nextState.playerStats['p1'].isConnected).toBe(true);
      expect(nextState.playerStats['p2']).toBeDefined(); // Stats should be kept
      expect(nextState.playerStats['p2'].isConnected).toBe(false);
    });
    
    it('should preserve score for disconnected player and restore on rejoin', () => {
        const playerStats: Record<string, PlayerStats> = {
            'p1': { id: 'p1', color: 'red', score: 10, deaths: 1, isConnected: false } // Previously disconnected
        };
        const initialState = createInitialState([], [], [], [], playerStats);
        const inputs: PlayerInputs = new Map();
        const currentPlayerIDs = new Set(['p1']); // p1 rejoins
        const mockNewSnake = createMockSnake('p1', [{ x: 1, y: 1 }], Direction.RIGHT, 0); // Generated with 0 score initially
        generateNewSnakeMock.mockReturnValue(mockNewSnake);
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

        expect(nextState.snakes).toHaveLength(1);
        expect(nextState.snakes[0].id).toBe('p1');
        expect(nextState.snakes[0].score).toBe(10); // Score should be restored
        expect(nextState.playerStats['p1']).toBeDefined();
        expect(nextState.playerStats['p1'].score).toBe(10);
        expect(nextState.playerStats['p1'].deaths).toBe(1);
        expect(nextState.playerStats['p1'].isConnected).toBe(true);
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Restoring score for returning player p1: 10'));
        logSpy.mockRestore();
    });
    
     it('should use preferred color from playerStats when adding new snake', () => {
      const playerStats: Record<string, PlayerStats> = {
          'p1': { id: 'p1', color: '#ABCDEF', score: 0, deaths: 0, isConnected: false }
      };
      const initialState = createInitialState([], [], [], [], playerStats);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1']);
      const mockNewSnake = createMockSnake('p1', [{x:1, y:1}]);
      getOccupiedPositionsMock.mockReturnValue([]);

      const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);
      
      expect(getOccupiedPositionsMock).toHaveBeenCalled();
      expect(generateNewSnakeMock).toHaveBeenCalledTimes(1);
      expect(generateNewSnakeMock).toHaveBeenCalledWith('p1', GRID_SIZE, expect.any(Array), expect.any(Function), '#ABCDEF');
    });

    it('should sync score if snake score and playerStats score diverge (stats higher)', () => {
        const snake1 = createMockSnake('p1', [{ x: 0, y: 0 }], Direction.RIGHT, 5); // Snake score = 5
        const playerStats: Record<string, PlayerStats> = {
            'p1': { id: 'p1', color: 'red', score: 10, deaths: 0, isConnected: true } // Stats score = 10
        };
        const initialState = createInitialState([snake1], [], [], [], playerStats);
        const inputs: PlayerInputs = new Map();
        const currentPlayerIDs = new Set(['p1']);
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

        expect(logSpy).toHaveBeenCalledWith('Syncing score for p1: Snake=5, Stats=10');
        expect(nextState.snakes[0].score).toBe(10); // Synced to higher score
        expect(nextState.playerStats['p1'].score).toBe(10); // Synced to higher score
        logSpy.mockRestore();
    });

    it('should sync score if snake score and playerStats score diverge (snake higher)', () => {
        const snake1 = createMockSnake('p1', [{ x: 0, y: 0 }], Direction.RIGHT, 15); // Snake score = 15
        const playerStats: Record<string, PlayerStats> = {
            'p1': { id: 'p1', color: 'red', score: 10, deaths: 0, isConnected: true } // Stats score = 10
        };
        const initialState = createInitialState([snake1], [], [], [], playerStats);
        const inputs: PlayerInputs = new Map();
        const currentPlayerIDs = new Set(['p1']);
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

        expect(logSpy).toHaveBeenCalledWith('Syncing score for p1: Snake=15, Stats=10');
        expect(nextState.snakes[0].score).toBe(15); // Synced to higher score
        expect(nextState.playerStats['p1'].score).toBe(15); // Synced to higher score
        logSpy.mockRestore();
    });

     it('should update isConnected to false in playerStats if player leaves', () => {
        const snake1 = createMockSnake('p1', [{ x: 0, y: 0 }]);
        const playerStats: Record<string, PlayerStats> = {
            'p1': { id: 'p1', color: snake1.color, score: 0, deaths: 0, isConnected: true }
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
            'p1': { id: 'p1', color: 'red', score: 5, deaths: 1, isConnected: false } // Already disconnected
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
            'p1': { id: 'p1', color: 'blue', score: 5, deaths: 1, isConnected: false } // Disconnected
        };
        const initialState = createInitialState([], [], [], [], playerStats);
        const inputs: PlayerInputs = new Map();
        const currentPlayerIDs = new Set<string>(['p1']); // p1 rejoins
        generateNewSnakeMock.mockReturnValue(createMockSnake('p1', [{x:1,y:1}]));

        const nextState = updateGame(initialState, inputs, currentTime, currentPlayerIDs);

        // Check line 144 is hit implicitly by checking the outcome
        expect(nextState.playerStats['p1']).toBeDefined();
        expect(nextState.playerStats['p1'].isConnected).toBe(true);
     });
  });

  // --- Snake Movement & Direction --- 
  describe('Snake Movement and Direction', () => {
     it('should update snake direction based on input if not opposite', () => {
      const snake = createMockSnake('p1', [{ x: 5, y: 5 }], Direction.RIGHT);
      baseState = createInitialState([snake]);
      const inputs: PlayerInputs = new Map([['p1', Direction.UP]]);
      const currentPlayerIDs = new Set(['p1']);

      const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      expect(nextState.snakes[0].direction).toBe(Direction.UP);
    });

     it('should NOT update snake direction if input is opposite', () => {
      const snake = createMockSnake('p1', [{ x: 5, y: 5 }, { x: 4, y: 5 }], Direction.RIGHT);
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
      const snake1 = createMockSnake('p1', [{ x: 1, y: 1 }]);
      const snake2 = createMockSnake('p2', [{ x: 8, y: 8 }]);
      baseState = createInitialState([snake1, snake2]);
      const inputs: PlayerInputs = new Map();
      const currentPlayerIDs = new Set(['p1', 'p2']);

      updateGame(baseState, inputs, currentTime, currentPlayerIDs);

      expect(moveSnakeBodyMock).toHaveBeenCalledTimes(2);
      expect(moveSnakeBodyMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), GRID_SIZE);
      expect(moveSnakeBodyMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'p2' }), GRID_SIZE);
    });
  });

   // --- Collision Handling ---
   describe('Collision Handling', () => {
        const snake1 = createMockSnake('p1', [{ x: 5, y: 5 }, { x: 4, y: 5 }]);
        const snake2 = createMockSnake('p2', [{ x: 5, y: 5 }, { x: 5, y: 6 }]); // Head collision
        
        beforeEach(() => {
             baseState = createInitialState([snake1, snake2], [], [], [], {
                 'p1': { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true },
                 'p2': { id: 'p2', color: 'blue', score: 0, deaths: 0, isConnected: true }
             });
             moveSnakeBodyMock.mockImplementation((snake) => snake);
             hasCollidedWithSnakeMock.mockReturnValue(false);
             isInvincibleMock.mockReturnValue(false);
        });

        it('should remove a snake if hasCollidedWithSnake returns true', () => {
            const inputs: PlayerInputs = new Map();
            const currentPlayerIDs = new Set(['p1', 'p2']);
            const p2Head = { x: 4, y: 5 };
            moveSnakeBodyMock.mockImplementation((snake) => {
                if (snake.id === 'p2') return { ...snake, body: [p2Head, { x: 5, y: 5 }] };
                return snake;
            });
            hasCollidedWithSnakeMock.mockImplementation((point, snakes, currentSnakeId) => {
                return currentSnakeId === 'p2' && point.x === p2Head.x && point.y === p2Head.y;
            });
            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);

            expect(hasCollidedWithSnakeMock).toHaveBeenCalledWith(p2Head, [snake1, snake2], 'p2');
            expect(isInvincibleMock).toHaveBeenCalledWith('p2', [], currentTime);
            expect(nextState.snakes).toHaveLength(1);
            expect(nextState.snakes[0].id).toBe('p1');
            expect(nextState.playerStats['p2'].deaths).toBe(1);
            expect(logSpy).toHaveBeenCalledWith('Snake p2 collided!');
            logSpy.mockRestore();
        });
        
        it('should NOT remove a snake if it collides but is invincible', () => {
            const inputs: PlayerInputs = new Map();
            const currentPlayerIDs = new Set(['p1', 'p2']);
            const p1Head = { x: 5, y: 5 }; // p1 doesn't move effectively
            const p2Head = { x: 4, y: 5 }; // p2 moves here
            
            moveSnakeBodyMock.mockImplementation((snake) => {
                if (snake.id === 'p1') return { ...snake, body: [p1Head, { x: 4, y: 5 }] }; // Keep p1 head for check
                if (snake.id === 'p2') return { ...snake, body: [p2Head, { x: 5, y: 5 }] }; // p2 moves
                return snake;
            });
            // Mock collision for p2 hitting p1's original segment
            hasCollidedWithSnakeMock.mockImplementation((point: Point, snakes: Snake[], currentSnakeId?: string) => {
                 // Check if p2's head hits any segment of p1
                if (currentSnakeId === 'p2' && point.x === p2Head.x && point.y === p2Head.y) {
                    const p1 = snakes.find((s: Snake) => s.id === 'p1'); // Add type for s
                    return p1?.body.some((seg: Point) => seg.x === point.x && seg.y === point.y) ?? false; // Add type for seg
                }
                return false;
            });
            isInvincibleMock.mockImplementation((snakeId) => snakeId === 'p2'); 

            const nextState = updateGame(baseState, inputs, currentTime, currentPlayerIDs);

            // FIX: Focus assertion on invincibility check and final state
            expect(isInvincibleMock).toHaveBeenCalledWith('p2', [], currentTime); // Check invincibility was checked for p2
            expect(nextState.snakes.some(s => s.id === 'p2')).toBe(true); // Verify p2 exists
            expect(nextState.snakes).toHaveLength(2); 
            expect(nextState.playerStats['p2'].deaths).toBe(0);
        });
   });
   
    // --- Food Handling ---
    describe('Food Handling', () => {
        const growSnakeMock = snakeLogic.growSnake as jest.Mock;
        const getScoreMultiplierMock = powerUpLogic.getScoreMultiplier as jest.Mock;
        const foodItem: Food = { position: { x: 6, y: 5 }, value: FOOD_VALUE }; // Food at destination
        const snake = createMockSnake('p1', [{ x: 5, y: 5 }, { x: 4, y: 5 }]);

        beforeEach(() => {
            baseState = createInitialState([snake], [foodItem], [], [], {
                'p1': { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
            });
            moveSnakeBodyMock.mockImplementation(s => 
                s.id === 'p1' ? { ...s, body: [{ x: 6, y: 5 }, { x: 5, y: 5 }] } : s
            );
            growSnakeMock.mockImplementation(s => ({ ...s, body: [{x: s.body[0].x, y: s.body[0].y}, ...s.body] }));
            checkFoodCollisionMock.mockImplementation((point, foodList) => {
                if (point.x === foodItem.position.x && point.y === foodItem.position.y && foodList.includes(foodItem)) {
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
                'p1': { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
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
    });
    
    // --- PowerUp Handling ---
    describe('PowerUp Handling', () => {
        const activatePowerUpMock = powerUpLogic.activatePowerUp as jest.Mock;
        const cleanupExpiredActivePowerUpsMock = powerUpLogic.cleanupExpiredActivePowerUps as jest.Mock;
        const cleanupExpiredGridPowerUpsMock = powerUpLogic.cleanupExpiredGridPowerUps as jest.Mock;
        
        const powerUpItem: PowerUp = { id: 'pu1', type: PowerUpType.SPEED, position: { x: 6, y: 5 }, expiresAt: currentTime + 5000 }; // Powerup at destination
        const snake = createMockSnake('p1', [{ x: 5, y: 5 }, { x: 4, y: 5 }]);
        const activePowerUp: ActivePowerUp = { type: PowerUpType.SPEED, playerId: 'p1', expiresAt: currentTime + POWER_UP_EFFECT_DURATION };

        beforeEach(() => {
            baseState = createInitialState([snake], [], [powerUpItem], [], {
                'p1': { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true }
            });
            moveSnakeBodyMock.mockImplementation(s => 
                 s.id === 'p1' ? { ...s, body: [{ x: 6, y: 5 }, { x: 5, y: 5 }] } : s
            );
            activatePowerUpMock.mockReturnValue(activePowerUp);
            checkPowerUpCollisionMock.mockImplementation((point, puList) => {
                if (point.x === powerUpItem.position.x && point.y === powerUpItem.position.y && puList.includes(powerUpItem)) {
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
            expect(activatePowerUpMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), powerUpItem, currentTime);
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
            // Find the correct snake reference - likely defined in a higher scope like 'snake1'
            // Let's assume it's 'snake' for now, defined in the describe block setup.
            // If 'snake' is not defined, this test will fail to compile/run.
             // Ensure 'snake' is defined, e.g., const snake = createMockSnake('p1', [{ x: 5, y: 5 }]);
            const snake = createMockSnake('p1', [{ x: 5, y: 5 }]); // Add snake definition
            const powerUpItem: PowerUp = { id: 'pu1', type: PowerUpType.SPEED, position: { x: 6, y: 5 }, expiresAt: currentTime + 1000 }; // Existing PU
            const stateWithPowerup = createInitialState(
                [snake],
                [],
                [powerUpItem], // Start with one powerup
                [],
                { 'p1': { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true } }
            );
            checkPowerUpCollisionMock.mockReturnValue(null);
            // getOccupiedPositionsMock is setup in beforeEach

             const nextState = updateGame(stateWithPowerup, inputs, currentTime, currentPlayerIDs);

             expect(generateFoodMock).toHaveBeenCalled(); // Still called

            // Check powerup was NOT generated (chance fails with default seed)
            expect(generatePowerUpMock).not.toHaveBeenCalled();
            expect(nextState.powerUps).toHaveLength(1); // Should only contain the initial one
            expect(nextState.powerUps[0]).toEqual(powerUpItem);
            // Counter only increments on successful spawn, so it stays 0 here.
            expect(nextState.powerUpCounter).toBe(0);
         });
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
          const snake = createMockSnake('p1', [{ x: 5, y: 5 }]);
          const initialState = createInitialState([snake]);
          const inputs: PlayerInputs = new Map();
          const currentPlayerIDs = new Set(['p1']);

          getSpeedFactorMock.mockReturnValue(1); // Default speed

          updateGame(initialState, inputs, currentTime, currentPlayerIDs);

          expect(moveSnakeBodyMock).toHaveBeenCalledTimes(1);
          expect(moveSnakeBodyMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), GRID_SIZE);
      });

       it('should NOT move snake if SLOW powerup is active and sequence is even', () => {
          const snake = createMockSnake('p1', [{ x: 5, y: 5 }]);
          // Corrected ActivePowerUp definition (no id, uses playerId)
          const slowPowerUp: ActivePowerUp = { type: PowerUpType.SLOW, playerId: 'p1', expiresAt: currentTime + 1000 };
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
          const snake = createMockSnake('p1', [{ x: 5, y: 5 }]);
          // Corrected ActivePowerUp definition (no id, uses playerId)
          const slowPowerUp: ActivePowerUp = { type: PowerUpType.SLOW, playerId: 'p1', expiresAt: currentTime + 1000 };
          const initialState = createInitialState([snake], [], [], [slowPowerUp]);
          initialState.sequence = 1; // Odd sequence number
          const inputs: PlayerInputs = new Map();
          const currentPlayerIDs = new Set(['p1']);

          getSpeedFactorMock.mockReturnValue(0.5); // Slow speed

          updateGame(initialState, inputs, currentTime, currentPlayerIDs);

          expect(getSpeedFactorMock).toHaveBeenCalledWith('p1', [slowPowerUp], currentTime);
          expect(moveSnakeBodyMock).toHaveBeenCalledTimes(1);
          expect(moveSnakeBodyMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), GRID_SIZE);
      });

      // ... other collision/movement tests ...
    });

    describe('State Integrity', () => {
       it('should create playerStats entry if missing for an existing snake (line 284)', () => {
          const snake = createMockSnake('p1', [{ x: 3, y: 3 }], Direction.LEFT, 5); // Snake exists
          const playerStats: Record<string, PlayerStats> = { /* 'p1' is missing */ };
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
        const aiSnake = createMockSnake(AI_SNAKE_ID, [{ x: 5, y: 5 }, { x: 5, y: 6 }]);
        const playerSnake = createMockSnake('player1', [{ x: 6, y: 5 }, { x: 7, y: 5 }]);
        
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
        const aiSnakeAfter = nextState.snakes.find(s => s.id === AI_SNAKE_ID);
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
        const aiSnakeAfter = nextState.snakes.find(s => s.id === AI_SNAKE_ID);
        expect(aiSnakeAfter).toBeUndefined();
        
        // Verify death counter was incremented
        expect(nextState.playerStats[AI_SNAKE_ID].deaths).toBe(1);
        
        // Clean up mock
        hasCollidedWithSnakeMock.mockRestore();
      });
    });
}); 