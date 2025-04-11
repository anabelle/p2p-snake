import { renderHook } from '@testing-library/react';
import { useGameStateSync } from './useGameStateSync';
import { GameState } from '../game/state/types'; // Assuming GameState type path

// Mock GameState for testing
const mockGameState1: GameState = {
  snakes: [],
  food: [],
  gridSize: { width: 10, height: 10 },
  playerCount: 0,
  activePowerUps: [],
  timestamp: 1000,
  powerUps: [],
  sequence: 0,
  rngSeed: 123,
  powerUpCounter: 0,
  playerStats: {}
};
const mockGameState2: GameState = {
  ...mockGameState1,
  timestamp: 2000,
  playerCount: 1
};

describe('useGameStateSync', () => {
  it('should initialize with null state and ref', () => {
    const { result } = renderHook(() => useGameStateSync(null));

    expect(result.current.syncedGameState).toBeNull();
    expect(result.current.gameStateRef.current).toBeNull();
  });

  it('should update state and ref when latestGameState changes', () => {
    const { result, rerender } = renderHook(
      ({ latestGameState }) => useGameStateSync(latestGameState),
      { initialProps: { latestGameState: null as GameState | null } }
    );

    // Initial state check
    expect(result.current.syncedGameState).toBeNull();
    expect(result.current.gameStateRef.current).toBeNull();

    // Rerender with first game state
    rerender({ latestGameState: mockGameState1 });

    expect(result.current.syncedGameState).toEqual(mockGameState1);
    expect(result.current.gameStateRef.current).toEqual(mockGameState1);

    // Rerender with second game state
    rerender({ latestGameState: mockGameState2 });

    expect(result.current.syncedGameState).toEqual(mockGameState2);
    expect(result.current.gameStateRef.current).toEqual(mockGameState2);
  });

  // Define the props type for the hook in this test
  type TestPropsRevertToNull = { latestGameState: GameState | null };

  it('should handle reverting latestGameState back to null', () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useGameStateSync>,
      TestPropsRevertToNull
    >(
      ({ latestGameState }) => useGameStateSync(latestGameState),
      { initialProps: { latestGameState: mockGameState1 } } // Start with non-null
    );

    // Initial state with game state
    expect(result.current.syncedGameState).toEqual(mockGameState1);
    expect(result.current.gameStateRef.current).toEqual(mockGameState1);

    // Rerender with null - now type-safe due to explicit hook typing
    rerender({ latestGameState: null });

    expect(result.current.syncedGameState).toBeNull();
    expect(result.current.gameStateRef.current).toBeNull();
  });
});
