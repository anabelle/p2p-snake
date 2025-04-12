import React from 'react';
import { renderHook } from '@testing-library/react';
import { useGameRenderer } from './useGameRenderer';
import { useGameLoop } from './useGameLoop';
import { NetplayAdapter } from '../game/network/NetplayAdapter';
import { GameState } from '../game/state/types';

jest.mock('./useGameLoop');
const mockUseGameLoop = useGameLoop as jest.Mock;

jest.mock('../game/network/NetplayAdapter', () => {
  return {
    NetplayAdapter: jest.fn().mockImplementation(() => ({
      draw: jest.fn()
    }))
  };
});

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  mockUseGameLoop.mockClear();
  mockConsoleError.mockClear();
});

afterAll(() => {
  mockConsoleError.mockRestore();
});

describe('useGameRenderer', () => {
  const mockCanvasRef: React.RefObject<HTMLCanvasElement> = {
    current: document.createElement('canvas')
  };
  const mockGameAdapter = new NetplayAdapter(mockCanvasRef.current!, 'player1');
  const mockGameAdapterRef: React.RefObject<NetplayAdapter> = {
    current: mockGameAdapter
  };
  const mockGameState: GameState = {
    snakes: [],
    food: [],
    powerUps: [],
    activePowerUps: [],
    gridSize: { width: 10, height: 10 },
    timestamp: 0,
    sequence: 0,
    rngSeed: 1,
    playerCount: 0,
    powerUpCounter: 0,
    playerStats: {}
  };
  const mockGameStateRef: React.RefObject<GameState> = {
    current: mockGameState
  };

  const defaultProps = {
    canvasRef: mockCanvasRef,
    gameAdapterRef: mockGameAdapterRef,
    gameStateRef: mockGameStateRef,
    isConnected: true,
    profileStatus: 'loaded' as const,
    localPlayerId: 'player1'
  };

  it('should activate game loop when conditions are met', () => {
    renderHook(() => useGameRenderer(defaultProps));

    expect(mockUseGameLoop).toHaveBeenCalledWith(expect.any(Function), true);
  });

  it('should NOT activate game loop if not connected', () => {
    renderHook(() => useGameRenderer({ ...defaultProps, isConnected: false }));
    expect(mockUseGameLoop).toHaveBeenCalledWith(expect.any(Function), false);
  });

  it('should NOT activate game loop if profile is not loaded', () => {
    renderHook(() => useGameRenderer({ ...defaultProps, profileStatus: 'loading' }));
    expect(mockUseGameLoop).toHaveBeenCalledWith(expect.any(Function), false);
    renderHook(() => useGameRenderer({ ...defaultProps, profileStatus: 'needed' }));
    expect(mockUseGameLoop).toHaveBeenCalledWith(expect.any(Function), false);
  });

  it('should NOT activate game loop if canvas ref is null', () => {
    renderHook(() => useGameRenderer({ ...defaultProps, canvasRef: { current: null } }));
    expect(mockUseGameLoop).toHaveBeenCalledWith(expect.any(Function), false);
  });

  it('should NOT activate game loop if game adapter ref is null', () => {
    renderHook(() => useGameRenderer({ ...defaultProps, gameAdapterRef: { current: null } }));
    expect(mockUseGameLoop).toHaveBeenCalledWith(expect.any(Function), false);
  });

  it('should NOT activate game loop if local player ID is null', () => {
    renderHook(() => useGameRenderer({ ...defaultProps, localPlayerId: null }));
    expect(mockUseGameLoop).toHaveBeenCalledWith(expect.any(Function), false);
  });

  it('should call gameAdapter.draw within drawFrame when refs are valid', () => {
    renderHook(() => useGameRenderer(defaultProps));

    const drawFrameCallback = mockUseGameLoop.mock.calls[0][0];
    drawFrameCallback();

    expect(mockGameAdapterRef.current?.draw).toHaveBeenCalledWith(
      mockCanvasRef.current,
      mockGameStateRef.current
    );
  });

  it('should NOT call gameAdapter.draw if canvasRef is null', () => {
    renderHook(() => useGameRenderer({ ...defaultProps, canvasRef: { current: null } }));
    const drawFrameCallback = mockUseGameLoop.mock.calls[0][0];
    drawFrameCallback();
    expect(mockGameAdapterRef.current?.draw).not.toHaveBeenCalled();
  });

  it('should NOT call gameAdapter.draw if gameAdapterRef is null', () => {
    renderHook(() => useGameRenderer({ ...defaultProps, gameAdapterRef: { current: null } }));
    const drawFrameCallback = mockUseGameLoop.mock.calls[0][0];
    drawFrameCallback();

    expect(mockGameAdapter.draw).not.toHaveBeenCalled();
  });

  it('should NOT call gameAdapter.draw if gameStateRef is null', () => {
    renderHook(() => useGameRenderer({ ...defaultProps, gameStateRef: { current: null } }));
    const drawFrameCallback = mockUseGameLoop.mock.calls[0][0];
    drawFrameCallback();
    expect(mockGameAdapterRef.current?.draw).not.toHaveBeenCalled();
  });

  it('should catch and log errors during gameAdapter.draw', () => {
    const error = new Error('Draw failed');

    (mockGameAdapterRef.current?.draw as jest.Mock).mockImplementationOnce(() => {
      throw error;
    });

    renderHook(() => useGameRenderer(defaultProps));
    const drawFrameCallback = mockUseGameLoop.mock.calls[0][0];

    expect(() => drawFrameCallback()).not.toThrow();

    expect(mockConsoleError).toHaveBeenCalledWith('Error during gameAdapter.draw:', error);
  });
});
