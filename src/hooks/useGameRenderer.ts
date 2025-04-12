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

export const useGameRenderer = ({
  canvasRef,
  gameAdapterRef,
  gameStateRef,
  isConnected,
  profileStatus,
  localPlayerId
}: UseGameRendererProps): void => {
  const isGameLoopActive =
    isConnected &&
    profileStatus === 'loaded' &&
    !!canvasRef.current &&
    !!gameAdapterRef.current &&
    !!localPlayerId;

  const drawFrame = useCallback(() => {
    if (canvasRef.current && gameAdapterRef.current && gameStateRef.current) {
      try {
        gameAdapterRef.current.draw(canvasRef.current, gameStateRef.current);
      } catch (e) {
        console.error('Error during gameAdapter.draw:', e);
      }
    }
  }, [gameAdapterRef, gameStateRef, canvasRef]);

  useGameLoop(drawFrame, isGameLoopActive);
};
