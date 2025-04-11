import { GameManager } from './gameManager';
import { GameState, Direction, PlayerStats } from '../src/game/state/types';
import { AI_SNAKE_ID } from '../src/game/logic/aiSnake';
import { updateGame } from '../src/game/logic/gameRules'; // We might need to mock parts of this
import { GRID_SIZE } from '../src/game/constants';

// Mock performance.now() for consistent timestamps
jest.spyOn(performance, 'now').mockReturnValue(1000); // Start time at 1000ms

// Mock the core game logic function if needed for specific tests,
// or let it run for integration-style tests of the manager.
// For now, let's create a simple mock that just returns the state.
jest.mock('../src/game/logic/gameRules', () => ({
  updateGame: jest.fn((state, _inputs, _time, _playerIds) => {
    // Simple mock: Increment sequence and timestamp, return passed state
    return {
      ...state,
      sequence: state.sequence + 1,
      timestamp: performance.now() + 100, // Simulate time passing
      // Ensure playerStats exists if the real updateGame would create it
      playerStats: state.playerStats || {}
    };
  }),
}));

// Mock food generation for predictable initialization
jest.mock('../src/game/logic/foodLogic', () => ({
    generateFood: jest.fn().mockReturnValue({ position: { x: 5, y: 5 }, value: 1 }),
}));
jest.mock('../src/game/logic/prng', () => ({
    getOccupiedPositions: jest.fn().mockReturnValue([]),
    mulberry32: jest.fn().mockReturnValue(() => 0.5), // Mock RNG function
}));

describe('GameManager', () => {
  let gameManager: GameManager;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Reset performance.now mock if needed (e.g., different start times)
    jest.spyOn(performance, 'now').mockClear().mockReturnValue(1000);

    // Create a new instance before each test
    gameManager = new GameManager();
  });

  it('should initialize the game state correctly', () => {
    const initialState = gameManager.getGameState();

    expect(initialState).toBeDefined();
    expect(initialState.gridSize).toEqual(GRID_SIZE);
    expect(initialState.snakes).toEqual([]); // Initially empty
    expect(initialState.food.length).toBeGreaterThan(0); // Food should be generated
    expect(initialState.sequence).toBe(1); // Incremented by the mocked initial updateGame call
    expect(initialState.timestamp).toBe(1100); // Initial performance.now + 100 from mock update
    expect(initialState.playerCount).toBe(0);
    expect(initialState.playerStats).toBeDefined();
    // Check if AI snake stats are initialized
    expect(initialState.playerStats[AI_SNAKE_ID]).toBeDefined();
    expect(initialState.playerStats[AI_SNAKE_ID].name).toBe('AI Snake');
    expect(initialState.playerStats[AI_SNAKE_ID].isConnected).toBe(true);

    // Check if the initial updateGame was called during construction
    expect(updateGame).toHaveBeenCalledTimes(1);
    // Check the arguments passed to the initial updateGame call
    expect(updateGame).toHaveBeenCalledWith(
        expect.objectContaining({ sequence: 0, timestamp: 1000 }), // Initial state before update
        expect.any(Map), // Empty inputs map
        1000, // Initial timestamp
        expect.any(Set) // Empty player set
    );
  });

  it('should add a player correctly', () => {
    gameManager.addPlayer('p1', 'Player 1', '#FF0000');
    const state = gameManager.getGameState();
    const stats = gameManager.getPlayerStats();

    expect(gameManager.getPlayerCount()).toBe(1);
    expect(state.playerCount).toBe(1);
    expect(stats['p1']).toBeDefined();
    expect(stats['p1'].name).toBe('Player 1');
    expect(stats['p1'].color).toBe('#FF0000');
    expect(stats['p1'].score).toBe(0);
    expect(stats['p1'].deaths).toBe(0);
    expect(stats['p1'].isConnected).toBe(true);
  });

  it('should handle reconnecting players', () => {
      // Initial connection
      gameManager.addPlayer('p1', 'Player 1', '#FF0000');
      let stats = gameManager.getPlayerStats();
      stats['p1'].score = 10; // Simulate gaining score
      stats['p1'].deaths = 1;
      stats['p1'].isConnected = false; // Simulate disconnect

      // Reconnect with potentially new details
      gameManager.addPlayer('p1', 'Player One', '#00FF00'); // Name changed, color changed
      stats = gameManager.getPlayerStats();

      expect(gameManager.getPlayerCount()).toBe(1);
      expect(stats['p1']).toBeDefined();
      expect(stats['p1'].name).toBe('Player One'); // Name should update
      expect(stats['p1'].color).toBe('#FF0000'); // Color preference should NOT change on basic reconnect
      expect(stats['p1'].score).toBe(10); // Score should persist
      expect(stats['p1'].deaths).toBe(1); // Deaths should persist
      expect(stats['p1'].isConnected).toBe(true); // Should be marked connected
  });


  it('should remove a player correctly', () => {
    gameManager.addPlayer('p1', 'Player 1', '#FF0000');
    gameManager.addPlayer('p2', 'Player 2', '#0000FF');
    expect(gameManager.getPlayerCount()).toBe(2);

    gameManager.removePlayer('p1');
    let state = gameManager.getGameState();
    let stats = gameManager.getPlayerStats();

    expect(gameManager.getPlayerCount()).toBe(1);
    expect(state.playerCount).toBe(1);
    expect(stats['p1']).toBeDefined(); // Stats are kept
    expect(stats['p1'].isConnected).toBe(false); // Marked as disconnected
    expect(stats['p2']).toBeDefined();
    expect(stats['p2'].isConnected).toBe(true);

    gameManager.removePlayer('p2');
    state = gameManager.getGameState();
    stats = gameManager.getPlayerStats();
    expect(gameManager.getPlayerCount()).toBe(0);
    expect(state.playerCount).toBe(0);
    expect(stats['p2']).toBeDefined();
    expect(stats['p2'].isConnected).toBe(false);
  });

  it('should set player input', () => {
      gameManager.addPlayer('p1', 'Player 1', '#FF0000');
      const input = { dx: 1, dy: 0 };
      gameManager.setPlayerInput('p1', input);

      // Need to access internal state or run a tick to verify fully,
      // but we can check if the method runs without error.
      // For a more thorough test, we'd inspect the `playerInputs` map,
      // potentially making it protected or adding a getter for testing.
      expect(() => gameManager.setPlayerInput('p1', input)).not.toThrow();

      // Test invalid input doesn't throw (it should just ignore)
      expect(() => gameManager.setPlayerInput('p1', { dx: 1 } as any)).not.toThrow();
      // Test input for non-existent player doesn't throw
      expect(() => gameManager.setPlayerInput('p_nonexistent', input)).not.toThrow();
  });

  it('should queue and process valid profile updates in the next tick', () => {
    gameManager.addPlayer('p1', 'Player 1', '#FF0000');
    const updateData = { playerId: 'p1', name: 'New Name', color: '#112233' };

    // Queue the update
    gameManager.queueProfileUpdate(updateData);

    // Verify stats haven't changed yet
    let stats = gameManager.getPlayerStats();
    expect(stats['p1'].name).toBe('Player 1');
    expect(stats['p1'].color).toBe('#FF0000');

    // Simulate time passing for the tick
    jest.spyOn(performance, 'now').mockReturnValue(1200);

    // Run a game tick - this should process the queue
    gameManager.runGameTick();

    // Verify the update was applied (by the processProfileUpdates called within runGameTick)
    stats = gameManager.getPlayerStats();
    expect(stats['p1'].name).toBe('New Name');
    expect(stats['p1'].color).toBe('#112233');

    // Verify updateGame was called after the profile update logic
    expect(updateGame).toHaveBeenCalledTimes(2); // Initial + this tick
    // We could add more specific checks here that the state passed to the second
    // updateGame call includes the updated name/color if the mock was more sophisticated.
  });

  it('should ignore invalid profile updates', () => {
      gameManager.addPlayer('p1', 'Player 1', '#FF0000');

      // Invalid color
      gameManager.queueProfileUpdate({ playerId: 'p1', name: 'Valid Name', color: 'invalid-color' });
      // Missing name
      gameManager.queueProfileUpdate({ playerId: 'p1', name: '', color: '#112233' });
      // Update for unknown player
      gameManager.queueProfileUpdate({ playerId: 'p_unknown', name: 'Name', color: '#112233' });

      // Run tick
      jest.spyOn(performance, 'now').mockReturnValue(1200);
      gameManager.runGameTick();

      // Verify stats did not change
      const stats = gameManager.getPlayerStats();
      expect(stats['p1'].name).toBe('Player 1');
      expect(stats['p1'].color).toBe('#FF0000');
  });

    it('should run game ticks and update state via updateGame', () => {
        gameManager.addPlayer('p1', 'Player 1', '#FF0000');
        gameManager.setPlayerInput('p1', { dx: 1, dy: 0 }); // Right

        const initialSequence = gameManager.getGameState().sequence;

        // Simulate time passing
        jest.spyOn(performance, 'now').mockReturnValue(1200);
        const newState = gameManager.runGameTick();

        expect(newState).toBeDefined();
        expect(newState!.sequence).toBe(initialSequence + 1);
        expect(newState!.timestamp).toBe(1200 + 100); // performance.now + mock updateGame delta

        expect(updateGame).toHaveBeenCalledTimes(2); // Initial + this tick
        // Check arguments of the second call
        expect(updateGame).toHaveBeenNthCalledWith(2,
            expect.objectContaining({ sequence: initialSequence }), // State before tick
            expect.objectContaining(new Map([['p1', Direction.RIGHT]])), // Inputs map
            1200, // Logical time for the tick
            expect.objectContaining(new Set(['p1'])) // Connected player IDs
        );
    });

     it('should return null from runGameTick if no players are connected (excluding AI)', () => {
        // Remove AI snake from stats to test the condition properly
        const initialStats = gameManager.getPlayerStats();
        delete initialStats[AI_SNAKE_ID];
        // We might need to re-initialize or modify the GameManager directly if stats aren't easily mutable
        // For this test, assume AI was somehow removed or didn't initialize.
        // A better approach might be to mock AI_SNAKE_ID or modify the check.

        // Ensure no human players
        expect(gameManager.getPlayerCount()).toBe(0);

        // Simulate time passing
        jest.spyOn(performance, 'now').mockReturnValue(1200);
        const newState = gameManager.runGameTick();

        expect(newState).toBeNull();
        expect(updateGame).toHaveBeenCalledTimes(1); // Only the initial call
    });

    it('should still run game tick if only AI is present', () => {
        // Ensure no human players
        expect(gameManager.getPlayerCount()).toBe(0);
        // Ensure AI is present (it is by default after initialization)
        expect(gameManager.getPlayerStats()[AI_SNAKE_ID]).toBeDefined();

         // Simulate time passing
        jest.spyOn(performance, 'now').mockReturnValue(1200);
        const newState = gameManager.runGameTick();

        expect(newState).not.toBeNull();
        expect(updateGame).toHaveBeenCalledTimes(2); // Initial + tick for AI
    });
}); 