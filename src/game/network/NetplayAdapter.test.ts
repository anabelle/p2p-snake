import { GameState, Direction } from '../state/types';
import { GRID_SIZE, CELL_SIZE } from '../constants';

import { jest } from '@jest/globals';
import type { NetplayAdapter as NetplayAdapterType } from './NetplayAdapter';

const mockDrawGame = jest.fn();

jest.doMock('../rendering/renderer', () => ({
  drawGame: mockDrawGame
}));

const { NetplayAdapter } = require('./NetplayAdapter');

const createMockCanvas = (): HTMLCanvasElement => {
  const mockCtx = {
    clearRect: jest.fn(),
    fillRect: jest.fn()
  } as unknown as CanvasRenderingContext2D;

  const mockCanvas = {
    getContext: jest.fn().mockReturnValue(mockCtx),
    width: GRID_SIZE.width * CELL_SIZE,
    height: GRID_SIZE.height * CELL_SIZE
  } as unknown as HTMLCanvasElement;

  return mockCanvas;
};

describe('NetplayAdapter (Client Helper)', () => {
  let mockCanvas: HTMLCanvasElement;
  const localPlayerId = 'player-local';
  let adapter: NetplayAdapterType;
  let mockGameState: GameState;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCanvas = createMockCanvas();
    adapter = new NetplayAdapter(mockCanvas, localPlayerId);

    mockGameState = {
      snakes: [
        {
          id: localPlayerId,
          body: [{ x: 1, y: 1 }],
          direction: Direction.RIGHT,
          color: '#f00',
          score: 0,
          activePowerUps: []
        }
      ],
      food: [],
      powerUps: [],
      activePowerUps: [],
      gridSize: GRID_SIZE,
      playerStats: {
        [localPlayerId]: {
          id: localPlayerId,
          color: '#f00',
          score: 0,
          deaths: 0,
          isConnected: true
        }
      },
      timestamp: Date.now(),
      sequence: 0,
      rngSeed: 123,
      playerCount: 1,
      powerUpCounter: 0
    };
  });

  it('should store the localPlayerId on construction', () => {
    expect(adapter.localPlayerId).toBe(localPlayerId);
  });

  describe('draw method', () => {
    it('should get the 2D rendering context from the canvas', () => {
      adapter.draw(mockCanvas, mockGameState);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('should call drawGame with the context, state, and localPlayerId', () => {
      const mockCtx = mockCanvas.getContext('2d');
      adapter.draw(mockCanvas, mockGameState);

      expect(mockDrawGame).toHaveBeenCalledTimes(1);
      expect(mockDrawGame).toHaveBeenCalledWith(mockCtx, mockGameState, localPlayerId);
    });

    it('should not call drawGame if context cannot be obtained', () => {
      (mockCanvas.getContext as jest.Mock).mockReturnValueOnce(null);

      adapter.draw(mockCanvas, mockGameState);

      expect(mockDrawGame).not.toHaveBeenCalled();
    });
  });
});
