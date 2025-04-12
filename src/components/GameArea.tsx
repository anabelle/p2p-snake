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
  isFullscreen: boolean;
}

const GameArea: React.FC<GameAreaProps> = ({
  gameContainerRef,
  canvasWidth,
  canvasHeight,
  isConnected,
  profileStatus,
  isProfileModalOpen,
  syncedGameState,
  isFullscreen
}) => {
  const showOverlay = !isConnected && profileStatus !== 'loaded' && !isProfileModalOpen;
  const overlayText = profileStatus === 'loading' ? 'Loading Profile...' : 'Connecting...';

  const showPlayerCount =
    isConnected && syncedGameState?.playerCount && syncedGameState.playerCount > 0;

  const containerStyle: React.CSSProperties = {
    ['--canvas-width' as string]: `${canvasWidth}px`
  };
  if (!isFullscreen) {
    containerStyle.width = canvasWidth;
    containerStyle.height = canvasHeight;
  }

  return (
    <div
      ref={gameContainerRef}
      id='game-canvas-container'
      data-testid='game-area-container'
      style={containerStyle}
    >
      {}
      {showOverlay && <div className='connecting-overlay'>{overlayText}</div>}

      {}
      {showPlayerCount && (
        <div className='player-count-badge'>Players: {syncedGameState?.playerCount}</div>
      )}

      {}
    </div>
  );
};

export default GameArea;
