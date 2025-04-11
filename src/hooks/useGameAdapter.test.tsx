import React from 'react';
import { renderHook } from '@testing-library/react';
import { useGameAdapter, UseGameAdapterProps } from './useGameAdapter'; // Import props type
import { NetplayAdapter } from '../game/network/NetplayAdapter'; // Mock this

// Mock the NetplayAdapter
jest.mock('../game/network/NetplayAdapter');
const MockNetplayAdapter = NetplayAdapter as jest.MockedClass<typeof NetplayAdapter>;

describe('useGameAdapter', () => {
  let mockCanvasRef: React.RefObject<HTMLCanvasElement>;

  beforeEach(() => {
    // Reset mocks before each test
    MockNetplayAdapter.mockClear();

    // Create a mock canvas element and ref
    const mockCanvas = document.createElement('canvas');
    mockCanvasRef = { current: mockCanvas };
  });

  it('should initialize with a null adapter ref', () => {
    const { result } = renderHook(() =>
      useGameAdapter({
        canvasRef: { current: null }, // Start with no canvas
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
        canvasRef: { current: null }, // Initially no canvas
        localPlayerId: null,
        isConnected: false,
        profileStatus: 'loading'
      }
    });

    // Initial state: no adapter
    expect(result.current.current).toBeNull();
    expect(MockNetplayAdapter).not.toHaveBeenCalled();

    // Rerender with conditions met
    rerender({
      canvasRef: mockCanvasRef,
      localPlayerId: playerId,
      isConnected: true,
      profileStatus: 'loaded'
    });

    // Adapter should be created
    expect(result.current.current).toBeInstanceOf(MockNetplayAdapter);
    expect(MockNetplayAdapter).toHaveBeenCalledTimes(1);
    expect(MockNetplayAdapter).toHaveBeenCalledWith(mockCanvasRef.current, playerId);
  });

  it('should not create adapter if canvas is missing', () => {
    renderHook(() =>
      useGameAdapter({
        canvasRef: { current: null }, // No canvas
        localPlayerId: 'player-1',
        isConnected: true,
        profileStatus: 'loaded'
      })
    );
    expect(MockNetplayAdapter).not.toHaveBeenCalled();
  });

  it('should not create adapter if not connected', () => {
    renderHook(() =>
      useGameAdapter({
        canvasRef: mockCanvasRef,
        localPlayerId: 'player-1',
        isConnected: false, // Not connected
        profileStatus: 'loaded'
      })
    );
    expect(MockNetplayAdapter).not.toHaveBeenCalled();
  });

  it('should not create adapter if profile not loaded', () => {
    renderHook(() =>
      useGameAdapter({
        canvasRef: mockCanvasRef,
        localPlayerId: 'player-1',
        isConnected: true,
        profileStatus: 'needed' // Profile not loaded
      })
    );
    expect(MockNetplayAdapter).not.toHaveBeenCalled();
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

    // Initial state: adapter created
    expect(result.current.current).toBeInstanceOf(MockNetplayAdapter);
    expect(MockNetplayAdapter).toHaveBeenCalledTimes(1);

    // Rerender with isConnected = false
    rerender({
      canvasRef: mockCanvasRef,
      localPlayerId: playerId,
      isConnected: false, // Condition changed
      profileStatus: 'loaded'
    });

    // Adapter should be nulled out
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

    expect(result.current.current).toBeInstanceOf(MockNetplayAdapter);

    // Rerender with localPlayerId = null
    rerender({
      canvasRef: mockCanvasRef,
      localPlayerId: null, // Condition changed
      isConnected: true,
      profileStatus: 'loaded'
    });

    expect(result.current.current).toBeNull();
  });

  // Add more tests as needed, e.g., checking adapter is not recreated unnecessarily
});
