import React, { useEffect, useRef } from 'react';
import Modal from 'react-modal';

import {} from './game/state/types';
import { CANVAS } from './game/constants';
import ProfileModal from './components/ProfileModal';

import { useWebSocket } from './hooks/useWebSocket';
import { useUserProfile } from './hooks/useUserProfile';
import { useGameAdapter } from './hooks/useGameAdapter';
import { useGameStateSync } from './hooks/useGameStateSync';
import { useGameControls } from './hooks/useGameControls';
import { useGameRenderer } from './hooks/useGameRenderer';
import useCanvasElement from './hooks/useCanvasElement';
import { useFullscreen } from './hooks/useFullscreen';

import GameArea from './components/GameArea';
import InfoPanel from './components/InfoPanel';
import Footer from './components/Footer';
import FullscreenButton from './components/FullscreenButton';

import './styles/main.scss';

if (typeof window !== 'undefined') {
  Modal.setAppElement(document.getElementById('root') || document.body);
}

const App: React.FC = () => {
  const appRef = useRef<HTMLDivElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const canvasWidth = CANVAS.MAX_WIDTH;
  const canvasHeight = CANVAS.getHeight();

  const { canvasRef } = useCanvasElement({
    width: canvasWidth,
    height: canvasHeight,
    containerRef: gameContainerRef
  });

  const {
    isConnected,
    socket,
    latestGameState,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket
  } = useWebSocket();

  const {
    currentUserProfile,
    isProfileModalOpen,
    profileStatus,
    localPlayerId,
    openProfileModal,
    closeProfileModal,
    saveProfile
  } = useUserProfile({
    connectWebSocket,
    socket
  });

  const gameAdapterRef = useGameAdapter({
    canvasRef,
    localPlayerId,
    isConnected,
    profileStatus
  });

  const { syncedGameState, gameStateRef } = useGameStateSync(latestGameState);

  useGameControls(socket, isConnected, gameContainerRef);

  useGameRenderer({
    canvasRef,
    gameAdapterRef,
    gameStateRef,
    isConnected,
    profileStatus,
    localPlayerId
  });

  const { isFullscreen, toggleFullscreen, isFullscreenEnabled } = useFullscreen(
    appRef,
    canvasRef,
    canvasWidth,
    canvasHeight
  );

  useEffect(() => {
    if (profileStatus === 'needed') {
      openProfileModal();
    }

    if (profileStatus === 'error') {
      openProfileModal();
    }
  }, [profileStatus, openProfileModal]);

  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  return (
    <div className={`App ${isFullscreen ? 'App-fullscreen' : ''}`} ref={appRef}>
      <header role="banner">
        <h1>Multiplayer Snake Game</h1>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
      </header>
      <ProfileModal
        isOpen={isProfileModalOpen}
        onRequestClose={closeProfileModal}
        onSave={saveProfile}
        initialProfile={currentUserProfile}
      />
      
      <main id="main-content" role="main">
        <div className='game-area-wrapper'>
          <section aria-labelledby="game-area-heading">
            <h2 id="game-area-heading" className="visually-hidden">
              Game Area
            </h2>
            <GameArea
              gameContainerRef={gameContainerRef}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              isConnected={isConnected}
              profileStatus={profileStatus}
              isProfileModalOpen={isProfileModalOpen}
              syncedGameState={syncedGameState}
              isFullscreen={isFullscreen}
              localPlayerId={localPlayerId}
            />
            <FullscreenButton
              isFullscreen={isFullscreen}
              toggleFullscreen={toggleFullscreen}
              isFullscreenEnabled={isFullscreenEnabled}
            />
          </section>
        </div>
        <InfoPanel
          isConnected={isConnected}
          currentUserProfile={currentUserProfile}
          profileStatus={profileStatus}
          syncedGameState={syncedGameState}
          localPlayerId={localPlayerId}
          openProfileModal={openProfileModal}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default App;
