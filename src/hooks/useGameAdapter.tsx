import React, { useEffect, useRef, useCallback } from 'react';
import { NetplayAdapter } from '../game/network/NetplayAdapter';
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
      // --- Cleanup Logic ---
      if (!playerId) {
        if (gameAdapterRef.current) {
          console.warn('useGameAdapter: Cleaning up NetplayAdapter due to missing playerId.');
          // Potentially add adapter.dispose() or similar cleanup if needed in the future
          gameAdapterRef.current = null;
        }
        return;
      }

      // --- Creation Logic ---
      // Avoid recreating if adapter already exists for this player
      // (Note: NetplayAdapter constructor might handle internal state reuse if called again)
      if (gameAdapterRef.current) {
        // console.log('useGameAdapter: Adapter already exists.');
        return;
      }

      try {
        if (!canvasRef.current) {
          console.error('useGameAdapter: startGameAdapter called but canvasRef is null!');
          return;
        }
        console.log(`useGameAdapter: Creating NetplayAdapter for player ${playerId}...`);
        gameAdapterRef.current = new NetplayAdapter(canvasRef.current, playerId);
        console.log('useGameAdapter: NetplayAdapter created.');
      } catch (e) {
        console.error('useGameAdapter: Error creating NetplayAdapter instance:', e);
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
      console.log(
        `useGameAdapter: Conditions met for player ${localPlayerId}. Ensuring game adapter.`
      );
      startGameAdapter(localPlayerId);
    } else {
      // Conditions not met, ensure adapter is cleaned up
      if (gameAdapterRef.current) {
        console.log(
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
