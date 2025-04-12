import { GameManager } from './gameManager';
import { Direction } from '../src/game/state/types';
import { AI_SNAKE_ID } from '../src/game/logic/aiSnake';
import { updateGame } from '../src/game/logic/gameRules';
import { GRID_SIZE } from '../src/game/constants';

jest.spyOn(performance, 'now').mockReturnValue(1000);

jest.mock('../src/game/logic/gameRules', () => ({
  updateGame: jest.fn((state, _inputs, _time, _playerIds) => {
    return {
      ...state,
      sequence: state.sequence + 1,
      timestamp: performance.now() + 100,

      playerStats: state.playerStats || {}
    };
  })
}));

jest.mock('../src/game/logic/foodLogic', () => ({
  generateFood: jest.fn().mockReturnValue({ position: { x: 5, y: 5 }, value: 1 })
}));
jest.mock('../src/game/logic/prng', () => ({
  getOccupiedPositions: jest.fn().mockReturnValue([]),
  mulberry32: jest.fn().mockReturnValue(() => 0.5)
}));

describe('GameManager', () => {
  let gameManager: GameManager;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(performance, 'now').mockClear().mockReturnValue(1000);

    gameManager = new GameManager();
  });

  it('should initialize the game state correctly', () => {
    const initialState = gameManager.getGameState();

    expect(initialState).toBeDefined();
    expect(initialState.gridSize).toEqual(GRID_SIZE);
    expect(initialState.snakes).toEqual([]);
    expect(initialState.food.length).toBeGreaterThan(0);
    expect(initialState.sequence).toBe(1);
    expect(initialState.timestamp).toBe(1100);
    expect(initialState.playerCount).toBe(0);
    expect(initialState.playerStats).toBeDefined();

    expect(initialState.playerStats[AI_SNAKE_ID]).toBeDefined();
    expect(initialState.playerStats[AI_SNAKE_ID].name).toBe('AI Snake');
    expect(initialState.playerStats[AI_SNAKE_ID].isConnected).toBe(true);

    expect(updateGame).toHaveBeenCalledTimes(1);

    expect(updateGame).toHaveBeenCalledWith(
      expect.objectContaining({ sequence: 0, timestamp: 1000 }),
      expect.any(Map),
      1000,
      expect.any(Set)
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
    gameManager.addPlayer('p1', 'Player 1', '#FF0000');
    let stats = gameManager.getPlayerStats();
    stats['p1'].score = 10;
    stats['p1'].deaths = 1;
    stats['p1'].isConnected = false;

    gameManager.addPlayer('p1', 'Player One', '#00FF00');
    stats = gameManager.getPlayerStats();

    expect(gameManager.getPlayerCount()).toBe(1);
    expect(stats['p1']).toBeDefined();
    expect(stats['p1'].name).toBe('Player One');
    expect(stats['p1'].color).toBe('#FF0000');
    expect(stats['p1'].score).toBe(10);
    expect(stats['p1'].deaths).toBe(1);
    expect(stats['p1'].isConnected).toBe(true);
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
    expect(stats['p1']).toBeDefined();
    expect(stats['p1'].isConnected).toBe(false);
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

    expect(() => gameManager.setPlayerInput('p1', input)).not.toThrow();

    expect(() => gameManager.setPlayerInput('p1', { dx: 1 } as any)).not.toThrow();

    expect(() => gameManager.setPlayerInput('p_nonexistent', input)).not.toThrow();
  });

  it('should queue and process valid profile updates in the next tick', () => {
    gameManager.addPlayer('p1', 'Player 1', '#FF0000');
    const updateData = { playerId: 'p1', name: 'New Name', color: '#112233' };

    gameManager.queueProfileUpdate(updateData);

    let stats = gameManager.getPlayerStats();
    expect(stats['p1'].name).toBe('Player 1');
    expect(stats['p1'].color).toBe('#FF0000');

    jest.spyOn(performance, 'now').mockReturnValue(1200);

    gameManager.runGameTick();

    stats = gameManager.getPlayerStats();
    expect(stats['p1'].name).toBe('New Name');
    expect(stats['p1'].color).toBe('#112233');

    expect(updateGame).toHaveBeenCalledTimes(2);
  });

  it('should ignore invalid profile updates', () => {
    gameManager.addPlayer('p1', 'Player 1', '#FF0000');

    gameManager.queueProfileUpdate({ playerId: 'p1', name: 'Valid Name', color: 'invalid-color' });

    gameManager.queueProfileUpdate({ playerId: 'p1', name: '', color: '#112233' });

    gameManager.queueProfileUpdate({ playerId: 'p_unknown', name: 'Name', color: '#112233' });

    jest.spyOn(performance, 'now').mockReturnValue(1200);
    gameManager.runGameTick();

    const stats = gameManager.getPlayerStats();
    expect(stats['p1'].name).toBe('Player 1');
    expect(stats['p1'].color).toBe('#FF0000');
  });

  it('should run game ticks and update state via updateGame', () => {
    gameManager.addPlayer('p1', 'Player 1', '#FF0000');
    gameManager.setPlayerInput('p1', { dx: 1, dy: 0 });

    const initialSequence = gameManager.getGameState().sequence;

    jest.spyOn(performance, 'now').mockReturnValue(1200);
    const newState = gameManager.runGameTick();

    expect(newState).toBeDefined();
    expect(newState!.sequence).toBe(initialSequence + 1);
    expect(newState!.timestamp).toBe(1200 + 100);

    expect(updateGame).toHaveBeenCalledTimes(2);

    expect(updateGame).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sequence: initialSequence }),
      expect.objectContaining(new Map([['p1', Direction.RIGHT]])),
      1200,
      expect.objectContaining(new Set(['p1']))
    );
  });

  it('should return null from runGameTick if no players are connected (excluding AI)', () => {
    const initialStats = gameManager.getPlayerStats();
    delete initialStats[AI_SNAKE_ID];

    expect(gameManager.getPlayerCount()).toBe(0);

    jest.spyOn(performance, 'now').mockReturnValue(1200);
    const newState = gameManager.runGameTick();

    expect(newState).toBeNull();
    expect(updateGame).toHaveBeenCalledTimes(1);
  });

  it('should still run game tick if only AI is present', () => {
    expect(gameManager.getPlayerCount()).toBe(0);

    expect(gameManager.getPlayerStats()[AI_SNAKE_ID]).toBeDefined();

    jest.spyOn(performance, 'now').mockReturnValue(1200);
    const newState = gameManager.runGameTick();

    expect(newState).not.toBeNull();
    expect(updateGame).toHaveBeenCalledTimes(2);
  });
});
