import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameCanvas from './GameCanvas';
import { drawGame } from '../game/rendering/renderer';
import { GameState, Direction } from '../game/state/types';
import { GRID_SIZE, CELL_SIZE } from '../game/constants';

jest.mock('../game/rendering/renderer', () => ({
  drawGame: jest.fn()
}));

const createMockGameState = (playerId: string): GameState => ({
  snakes: [
    {
      id: playerId,
      body: [{ x: 1, y: 1 }],
      direction: Direction.RIGHT,
      color: '#ff0000',
      score: 0,
      activePowerUps: []
    },
    {
      id: 'other-player',
      body: [{ x: 5, y: 5 }],
      direction: Direction.LEFT,
      color: '#0000ff',
      score: 0,
      activePowerUps: []
    }
  ],
  food: [{ position: { x: 10, y: 10 }, value: 1 }],
  powerUps: [],
  activePowerUps: [],
  gridSize: GRID_SIZE,
  playerStats: {
    [playerId]: {
      id: playerId,
      name: 'Local Player',
      color: '#ff0000',
      score: 0,
      deaths: 0,
      isConnected: true
    },
    'other-player': {
      id: 'other-player',
      name: 'Opponent',
      color: '#0000ff',
      score: 0,
      deaths: 0,
      isConnected: true
    }
  },
  timestamp: Date.now(),
  sequence: 1,
  rngSeed: 123,
  playerCount: 2,
  powerUpCounter: 0
});

describe('GameCanvas Component', () => {
  const localPlayerId = 'player-1';
  let mockGameState: GameState;

  const mockContext = { mock: 'context' } as unknown as CanvasRenderingContext2D;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGameState = createMockGameState(localPlayerId);

    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation((contextId: string): CanvasRenderingContext2D | null => {
        if (contextId === '2d') {
          return mockContext;
        }
        return null;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render a canvas element with correct attributes', () => {
    render(<GameCanvas gameState={mockGameState} localPlayerId={localPlayerId} />);
    const canvas = screen.getByRole('img', { name: /snake game board/i });
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('width', String(GRID_SIZE.width * CELL_SIZE));
    expect(canvas).toHaveAttribute('height', String(GRID_SIZE.height * CELL_SIZE));
  });

  it('should get the 2D context and call drawGame on mount', () => {
    render(<GameCanvas gameState={mockGameState} localPlayerId={localPlayerId} />);

    expect(drawGame).toHaveBeenCalledTimes(1);
    expect(drawGame).toHaveBeenCalledWith(mockContext, mockGameState, localPlayerId);
  });

  it('should call drawGame again if gameState changes', () => {
    const { rerender } = render(
      <GameCanvas gameState={mockGameState} localPlayerId={localPlayerId} />
    );
    expect(drawGame).toHaveBeenCalledTimes(1);

    const updatedGameState = {
      ...mockGameState,
      sequence: mockGameState.sequence + 1
    };
    rerender(<GameCanvas gameState={updatedGameState} localPlayerId={localPlayerId} />);
    expect(drawGame).toHaveBeenCalledTimes(2);
    expect(drawGame).toHaveBeenLastCalledWith(mockContext, updatedGameState, localPlayerId);
  });

  it('should call drawGame again if localPlayerId changes', () => {
    const { rerender } = render(
      <GameCanvas gameState={mockGameState} localPlayerId={localPlayerId} />
    );
    expect(drawGame).toHaveBeenCalledTimes(1);

    const newPlayerId = 'player-2';
    rerender(<GameCanvas gameState={mockGameState} localPlayerId={newPlayerId} />);
    expect(drawGame).toHaveBeenCalledTimes(2);
    expect(drawGame).toHaveBeenLastCalledWith(mockContext, mockGameState, newPlayerId);
  });

  it('should not call drawGame if canvas context cannot be obtained', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    render(<GameCanvas gameState={mockGameState} localPlayerId={localPlayerId} />);

    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    expect(drawGame).not.toHaveBeenCalled();
  });
});
