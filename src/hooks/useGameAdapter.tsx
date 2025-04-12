import React, { useEffect, useRef, useCallback } from 'react';
import { NetplayAdapter } from '../game/network/NetplayAdapter';
import logger from '../utils/logger';

type ProfileStatus = 'loading' | 'loaded' | 'needed' | 'error';

export interface UseGameAdapterProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  localPlayerId: string | null;
  isConnected: boolean;
  profileStatus: ProfileStatus;
}

export const useGameAdapter = ({
  canvasRef,
  localPlayerId,
  isConnected,
  profileStatus
}: UseGameAdapterProps) => {
  const gameAdapterRef = useRef<NetplayAdapter | null>(null);

  const startGameAdapter = useCallback(
    (playerId: string | null) => {
      if (!playerId) {
        gameAdapterRef.current = null;
        return;
      }

      try {
        if (!canvasRef.current) {
          logger.error('useGameAdapter: startGameAdapter called but canvasRef is null!');
          return;
        }
        logger.debug(`useGameAdapter: Creating NetplayAdapter for player ${playerId}...`);
        gameAdapterRef.current = new NetplayAdapter(canvasRef.current, playerId);
        logger.debug('useGameAdapter: NetplayAdapter created.');
      } catch (e) {
        logger.error('useGameAdapter: Error creating NetplayAdapter instance:', e);
        gameAdapterRef.current = null;
      }
    },
    [canvasRef]
  );

  useEffect(() => {
    const shouldHaveAdapter =
      isConnected && canvasRef.current && localPlayerId && profileStatus === 'loaded';

    if (shouldHaveAdapter) {
      logger.debug(
        `useGameAdapter: Conditions met for player ${localPlayerId}. Ensuring game adapter.`
      );
      startGameAdapter(localPlayerId);
    } else {
      if (gameAdapterRef.current) {
        logger.debug(
          'useGameAdapter: Conditions no longer met (disconnected, no profile, etc). Cleaning up adapter.'
        );

        startGameAdapter(null);
      }
    }
  }, [isConnected, canvasRef, localPlayerId, profileStatus, startGameAdapter]);

  return gameAdapterRef;
};
