import { GameState, Direction } from '../state/types';
import { GRID_SIZE, CELL_SIZE } from '../constants';
// import { drawGame } from '../rendering/renderer'; // Import the function to be mocked
import { jest } from '@jest/globals';
import type { NetplayAdapter as NetplayAdapterType } from './NetplayAdapter'; // Import type separately

// Define the mock function outside the factory
const mockDrawGame = jest.fn();

// Mock the drawGame function from the renderer module
jest.doMock('../rendering/renderer', () => ({
  // Reference the externally defined mock function
  drawGame: mockDrawGame
}));

// Explicitly require the module *after* doMock to ensure the mocked version is loaded for the tests
const { NetplayAdapter } = require('./NetplayAdapter');

// Helper to create a mock Canvas element
const createMockCanvas = (): HTMLCanvasElement => {
  const mockCtx = {
    clearRect: jest.fn(),
    fillRect: jest.fn()
    // Add other context methods if needed by drawGame or future tests
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
  let adapter: NetplayAdapterType; // Use the imported type
  let mockGameState: GameState; // Define a simple game state for testing draw

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    mockCanvas = createMockCanvas();
    adapter = new NetplayAdapter(mockCanvas, localPlayerId);

    // Create a basic GameState for the draw test
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
      const mockCtx = mockCanvas.getContext('2d'); // Get the mock context
      adapter.draw(mockCanvas, mockGameState);

      // Check if the mocked drawGame was called correctly
      expect(mockDrawGame).toHaveBeenCalledTimes(1);
      expect(mockDrawGame).toHaveBeenCalledWith(mockCtx, mockGameState, localPlayerId);
    });

    it('should not call drawGame if context cannot be obtained', () => {
      // Arrange: Make getContext return null
      (mockCanvas.getContext as jest.Mock).mockReturnValueOnce(null);

      // Act
      adapter.draw(mockCanvas, mockGameState);

      // Assert: drawGame should not have been called
      expect(mockDrawGame).not.toHaveBeenCalled();
    });
  });
});
