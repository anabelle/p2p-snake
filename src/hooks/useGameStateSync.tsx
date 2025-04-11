import { useState, useEffect, useRef } from 'react';
import { GameState } from '../game/state/types';

/**
 * Hook to synchronize the game state from a potentially rapidly changing source
 * (like WebSocket) into both a stable React state for rendering and a ref
 * for immediate access in callbacks (like the game loop) without triggering re-renders.
 *
 * @param latestGameState The most recent GameState received (e.g., from WebSocket).
 * @returns An object containing:
 *  - syncedGameState: The GameState to use for rendering.
 *  - gameStateRef: A ref object whose .current property always holds the latest GameState.
 */
export const useGameStateSync = (latestGameState: GameState | null) => {
  const [syncedGameState, setSyncedGameState] = useState<GameState | null>(latestGameState);
  const gameStateRef = useRef<GameState | null>(latestGameState);

  useEffect(() => {
    // Update both the state and the ref whenever the input changes
    gameStateRef.current = latestGameState;
    setSyncedGameState(latestGameState);
  }, [latestGameState]);

  return { syncedGameState, gameStateRef };
};
