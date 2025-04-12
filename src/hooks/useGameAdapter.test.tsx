import React from 'react';
import { renderHook } from '@testing-library/react';
import { useGameAdapter, UseGameAdapterProps } from './useGameAdapter';
import { NetplayAdapter } from '../game/network/NetplayAdapter';

jest.mock('../game/network/NetplayAdapter');
const MockedNetplayAdapter = NetplayAdapter as any;

describe('useGameAdapter', () => {
  let mockCanvasRef: React.RefObject<HTMLCanvasElement>;

  beforeEach(() => {
    MockedNetplayAdapter.mockClear();

    const mockCanvas = document.createElement('canvas');
    mockCanvasRef = { current: mockCanvas };
  });

  it('should initialize with a null adapter ref', () => {
    const { result } = renderHook(() =>
      useGameAdapter({
        canvasRef: { current: null },
        localPlayerId: null,
        isConnected: false,
        profileStatus: 'loading'
      })
    );
    expect(result.current.current).toBeNull();
  });

  it('should create a NetplayAdapter when conditions are met', () => {
    const playerId = 'player-123';
    const { result, rerender } = renderHook<
      React.RefObject<NetplayAdapter | null>,
      UseGameAdapterProps
    >((props) => useGameAdapter(props), {
      initialProps: {
        canvasRef: { current: null },
        localPlayerId: null,
        isConnected: false,
        profileStatus: 'loading'
      }
    });

    expect(result.current.current).toBeNull();
    expect(MockedNetplayAdapter).not.toHaveBeenCalled();

    rerender({
      canvasRef: mockCanvasRef,
      localPlayerId: playerId,
      isConnected: true,
      profileStatus: 'loaded'
    });

    expect(result.current.current).toBeInstanceOf(MockedNetplayAdapter);
    expect(MockedNetplayAdapter).toHaveBeenCalledTimes(1);
    expect(MockedNetplayAdapter).toHaveBeenCalledWith(mockCanvasRef.current, playerId);
  });

  it('should not create adapter if canvas is missing', () => {
    renderHook(() =>
      useGameAdapter({
        canvasRef: { current: null },
        localPlayerId: 'player-1',
        isConnected: true,
        profileStatus: 'loaded'
      })
    );
    expect(MockedNetplayAdapter).not.toHaveBeenCalled();
  });

  it('should not create adapter if not connected', () => {
    renderHook(() =>
      useGameAdapter({
        canvasRef: mockCanvasRef,
        localPlayerId: 'player-1',
        isConnected: false,
        profileStatus: 'loaded'
      })
    );
    expect(MockedNetplayAdapter).not.toHaveBeenCalled();
  });

  it('should not create adapter if profile not loaded', () => {
    renderHook(() =>
      useGameAdapter({
        canvasRef: mockCanvasRef,
        localPlayerId: 'player-1',
        isConnected: true,
        profileStatus: 'needed'
      })
    );
    expect(MockedNetplayAdapter).not.toHaveBeenCalled();
  });

  it('should clear the adapter ref when conditions are no longer met', () => {
    const playerId = 'player-123';
    const { result, rerender } = renderHook<
      React.RefObject<NetplayAdapter | null>,
      UseGameAdapterProps
    >((props) => useGameAdapter(props), {
      initialProps: {
        canvasRef: mockCanvasRef,
        localPlayerId: playerId,
        isConnected: true,
        profileStatus: 'loaded'
      }
    });

    expect(result.current.current).toBeInstanceOf(MockedNetplayAdapter);
    expect(MockedNetplayAdapter).toHaveBeenCalledTimes(1);

    rerender({
      canvasRef: mockCanvasRef,
      localPlayerId: playerId,
      isConnected: false,
      profileStatus: 'loaded'
    });

    expect(result.current.current).toBeNull();
  });

  it('should clear the adapter ref when player ID becomes null', () => {
    const playerId = 'player-123';
    const { result, rerender } = renderHook<
      React.RefObject<NetplayAdapter | null>,
      UseGameAdapterProps
    >((props) => useGameAdapter(props), {
      initialProps: {
        canvasRef: mockCanvasRef,
        localPlayerId: playerId,
        isConnected: true,
        profileStatus: 'loaded'
      }
    });

    expect(result.current.current).toBeInstanceOf(MockedNetplayAdapter);

    rerender({
      canvasRef: mockCanvasRef,
      localPlayerId: null,
      isConnected: true,
      profileStatus: 'loaded'
    });

    expect(result.current.current).toBeNull();
  });
});
