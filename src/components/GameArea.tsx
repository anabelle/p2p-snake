import React, { useState, useEffect, useRef } from 'react';
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
  localPlayerId?: string | null;
}

const GameArea: React.FC<GameAreaProps> = ({
  gameContainerRef,
  canvasWidth,
  canvasHeight,
  isConnected,
  profileStatus,
  isProfileModalOpen,
  syncedGameState,
  isFullscreen,
  localPlayerId
}) => {
  const showOverlay = !isConnected && profileStatus !== 'loaded' && !isProfileModalOpen;
  const overlayText = profileStatus === 'loading' ? 'Loading Profile...' : 'Connecting...';
  const [scoreChanged, setScoreChanged] = useState(false);
  const previousScoreRef = useRef<number>(0);

  const showPlayerCount =
    isConnected && syncedGameState?.playerCount && syncedGameState.playerCount > 0;

  const getCurrentUserScore = () => {
    if (!syncedGameState?.playerStats || !localPlayerId) return 0;

    return syncedGameState.playerStats[localPlayerId]?.score || 0;
  };

  useEffect(() => {
    const currentScore = (() => {
      if (!syncedGameState?.playerStats || !localPlayerId) return 0;
      return syncedGameState.playerStats[localPlayerId]?.score || 0;
    })();

    if (previousScoreRef.current !== currentScore && previousScoreRef.current !== 0) {
      setScoreChanged(true);
      const timer = setTimeout(() => {
        setScoreChanged(false);
      }, 300);
      return () => clearTimeout(timer);
    }
    previousScoreRef.current = currentScore;
  }, [syncedGameState, localPlayerId]);

  const containerStyle: React.CSSProperties = {
    ['--canvas-width' as string]: `${canvasWidth}px`
  };

  
  

  return (
    <div
      ref={gameContainerRef}
      id='game-canvas-container'
      data-testid='game-area-container'
      style={containerStyle}
      className={isFullscreen ? 'fullscreen' : ''}
    >
      {showOverlay && <div className='connecting-overlay'>{overlayText}</div>}

      {showPlayerCount && (
        <div className='game-status-badges' data-testid='game-status-badges'>
          <div className='player-count-badge status-badge' data-testid='player-count-badge'>
            Players: {syncedGameState?.playerCount}
          </div>
          <div
            className={`score-badge status-badge ${scoreChanged ? 'score-changed' : ''}`}
            data-testid='score-badge'
          >
            Score: {getCurrentUserScore()}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameArea;
