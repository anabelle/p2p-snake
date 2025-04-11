import React from 'react';
import { GameState } from '../game/state/types';

interface GameAreaProps {
  gameContainerRef: React.RefObject<HTMLDivElement>;
  canvasWidth: number;
  canvasHeight: number;
  isConnected: boolean;
  profileStatus: 'loading' | 'loaded' | 'needed' | 'error';
  isProfileModalOpen: boolean;
  syncedGameState: GameState | null;
}

const GameArea: React.FC<GameAreaProps> = ({
  gameContainerRef,
  canvasWidth,
  canvasHeight,
  isConnected,
  profileStatus,
  isProfileModalOpen,
  syncedGameState
}) => {
  // Determine overlay visibility
  const showOverlay = !isConnected && profileStatus !== 'loaded' && !isProfileModalOpen;
  const overlayText = profileStatus === 'loading' ? 'Loading Profile...' : 'Connecting...';

  // Determine player count badge visibility
  const showPlayerCount =
    isConnected && syncedGameState?.playerCount && syncedGameState.playerCount > 0;

  return (
    <div
      ref={gameContainerRef}
      id='game-canvas-container'
      data-testid='game-area-container'
      style={{
        width: canvasWidth,
        height: canvasHeight,
        ['--canvas-width' as string]: `${canvasWidth}px`
      }}
    >
      {/* Conditional Overlays */}
      {showOverlay && <div className='connecting-overlay'>{overlayText}</div>}

      {/* Conditional Player Count Badge */}
      {showPlayerCount && (
        <div className='player-count-badge'>Players: {syncedGameState?.playerCount}</div>
      )}

      {/* The canvas element itself is appended here by the useCanvasElement hook */}
    </div>
  );
};

export default GameArea;
