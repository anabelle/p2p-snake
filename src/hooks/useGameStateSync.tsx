import { useState, useEffect, useRef } from 'react';
import { GameState } from '../game/state/types';

export const useGameStateSync = (latestGameState: GameState | null) => {
  const [syncedGameState, setSyncedGameState] = useState<GameState | null>(latestGameState);
  const gameStateRef = useRef<GameState | null>(latestGameState);

  useEffect(() => {
    gameStateRef.current = latestGameState;
    setSyncedGameState(latestGameState);
  }, [latestGameState]);

  return { syncedGameState, gameStateRef };
};
