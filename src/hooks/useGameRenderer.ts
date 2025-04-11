import React, { useCallback } from 'react';
import { useGameLoop } from './useGameLoop';
import { GameState } from '../game/state/types';
import { NetplayAdapter } from '../game/network/NetplayAdapter';

interface UseGameRendererProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gameAdapterRef: React.RefObject<NetplayAdapter | null>;
  gameStateRef: React.RefObject<GameState | null>;
  isConnected: boolean;
  profileStatus: 'loading' | 'loaded' | 'needed' | 'error';
  localPlayerId: string | null;
}

/**
 * Hook responsible for managing the game rendering loop.
 * It determines when the loop should be active and executes the drawing logic.
 */
export const useGameRenderer = ({
  canvasRef,
  gameAdapterRef,
  gameStateRef,
  isConnected,
  profileStatus,
  localPlayerId
}: UseGameRendererProps): void => {
  // --- Determine if Game Loop Should Be Active (Logic from App.tsx) --- //
  const isGameLoopActive =
    isConnected &&
    profileStatus === 'loaded' &&
    !!canvasRef.current &&
    !!gameAdapterRef.current &&
    !!localPlayerId;

  // --- Draw Frame Callback (Logic from App.tsx) --- //
  const drawFrame = useCallback(() => {
    // Check if drawing is possible
    if (canvasRef.current && gameAdapterRef.current && gameStateRef.current) {
      try {
        gameAdapterRef.current.draw(canvasRef.current, gameStateRef.current);
      } catch (e) {
        console.error('Error during gameAdapter.draw:', e);
      }
    }
    // No need to request next frame here, useGameLoop handles it
  }, [gameAdapterRef, gameStateRef, canvasRef]); // Dependencies

  // --- Use the Game Loop Hook --- //
  useGameLoop(drawFrame, isGameLoopActive);
};
