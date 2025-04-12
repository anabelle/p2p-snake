import React, { useEffect, useRef, useCallback } from 'react';
import { NetplayAdapter } from '../game/network/NetplayAdapter';
import logger from '../utils/logger';
// import { ProfileStatus } from './useUserProfile'; // Type is not exported

// Define the possible profile statuses directly
type ProfileStatus = 'loading' | 'loaded' | 'needed' | 'error';

// Define the props the hook will accept
export interface UseGameAdapterProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  localPlayerId: string | null;
  isConnected: boolean;
  profileStatus: ProfileStatus;
}

/**
 * Custom hook to manage the NetplayAdapter lifecycle.
 */
export const useGameAdapter = ({
  canvasRef,
  localPlayerId,
  isConnected,
  profileStatus
}: UseGameAdapterProps) => {
  const gameAdapterRef = useRef<NetplayAdapter | null>(null);

  // --- Actual Game Adapter Initialization Logic (Moved from App.tsx) ---
  const startGameAdapter = useCallback(
    (playerId: string | null) => {
      // If given a null id, clean up the ref and exit early
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
        gameAdapterRef.current = null; // Ensure ref is null on error
      }
    },
    [canvasRef] // Dependency: Only recreate this function if canvasRef changes
  );

  // --- Effect to Manage Game Adapter based on Conditions (Moved from App.tsx) ---
  useEffect(() => {
    const shouldHaveAdapter =
      isConnected && canvasRef.current && localPlayerId && profileStatus === 'loaded';

    if (shouldHaveAdapter) {
      // Conditions met, ensure adapter exists
      logger.debug(
        `useGameAdapter: Conditions met for player ${localPlayerId}. Ensuring game adapter.`
      );
      startGameAdapter(localPlayerId);
    } else {
      // Conditions not met, ensure adapter is cleaned up
      if (gameAdapterRef.current) {
        logger.debug(
          'useGameAdapter: Conditions no longer met (disconnected, no profile, etc). Cleaning up adapter.'
        );
        // Call with null to trigger cleanup logic inside startGameAdapter
        startGameAdapter(null);
      }
    }
    // Note: No cleanup function needed here because the logic inside the effect handles
    // the nullification of the ref when conditions change. The adapter instance itself
    // doesn't have global listeners/timers to clean up in this hook.
  }, [isConnected, canvasRef, localPlayerId, profileStatus, startGameAdapter]);

  // Return the ref for the component to use
  return gameAdapterRef;
};
