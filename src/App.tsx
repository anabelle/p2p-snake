import React, { useEffect, useRef /* useState, */ } from 'react';
import Modal from 'react-modal'; // Import Modal
// import { NetplayAdapter } from './game/network/NetplayAdapter';
// Types might still be needed for state-sync
import {} from /* GameState, */ /* Direction */ './game/state/types'; // Removed unused Direction
import { GRID_SIZE, CELL_SIZE } from './game/constants';
import ProfileModal from './components/ProfileModal'; // Import the modal component
// import { useGameInput } from './hooks/useGameInput'; // Removed
import { useWebSocket } from './hooks/useWebSocket'; // Import the WebSocket hook
import { useUserProfile } from './hooks/useUserProfile'; // Import the new profile hook
import { useGameAdapter } from './hooks/useGameAdapter'; // Import the game adapter hook
import { useGameStateSync } from './hooks/useGameStateSync'; // Import the new state sync hook
import { useGameControls } from './hooks/useGameControls'; // Import the new controls hook
import { useGameRenderer } from './hooks/useGameRenderer'; // Import the new renderer hook
import useCanvasElement from './hooks/useCanvasElement'; // Import the new hook
import { useFullscreen } from './hooks/useFullscreen'; // Import the fullscreen hook
// import UserInfoSection from './components/UserInfoSection'; // No longer needed here
// import PlayerRankings from './components/PlayerRankings'; // No longer needed here
// import PowerUpLegend from './components/PowerUpLegend'; // No longer needed here
import GameArea from './components/GameArea'; // Import the game area component
import InfoPanel from './components/InfoPanel'; // Import the info panel component
import Footer from './components/Footer'; // Import the Footer component

import './App.css'; // Import the CSS file

// Bind modal to app element (important for accessibility)
if (typeof window !== 'undefined') {
  Modal.setAppElement(document.getElementById('root') || document.body);
}

const App: React.FC = () => {
  const appRef = useRef<HTMLDivElement>(null); // Ref for the main App div
  const gameContainerRef = useRef<HTMLDivElement>(null); // Ref for touch events and canvas container
  // const canvasRef = useRef<HTMLCanvasElement | null>(null); // Removed: Now managed by useCanvasElement

  // --- Calculate Canvas Size from Constants ---
  const canvasWidth = GRID_SIZE.width * CELL_SIZE;
  const canvasHeight = GRID_SIZE.height * CELL_SIZE;

  // --- Use the new Canvas Element Hook ---
  const { canvasRef } = useCanvasElement({
    width: canvasWidth,
    height: canvasHeight,
    containerRef: gameContainerRef // Pass the container ref
  });

  // --- WebSocket Hook Integration ---
  const {
    isConnected,
    socket, // Use this from the hook
    latestGameState,
    connect: connectWebSocket, // Use this function from the hook
    disconnect: disconnectWebSocket // Use this function from the hook
  } = useWebSocket();

  // --- Use User Profile Hook ---
  const {
    currentUserProfile, // State from hook
    isProfileModalOpen, // State from hook
    profileStatus, // State from hook ('loading', 'loaded', 'needed', 'error')
    localPlayerId, // Value from hook
    openProfileModal, // Function from hook
    closeProfileModal, // Function from hook
    saveProfile // Function from hook
  } = useUserProfile({
    connectWebSocket, // Pass the connect function from useWebSocket
    socket // Pass the socket instance from useWebSocket
    // Pass latestGameState later for server sync
    // latestGameState,
  });

  // --- Use Game Adapter Hook ---
  const gameAdapterRef = useGameAdapter({
    canvasRef, // Pass the ref from useCanvasElement
    localPlayerId,
    isConnected,
    profileStatus
  });

  // --- Game State Synchronization (New Hook) ---
  const { syncedGameState, gameStateRef } = useGameStateSync(latestGameState);

  // --- React State ---
  // const [localGameState, setLocalGameState] = useState<GameState | null>(null); // Removed
  // const gameStateRef = useRef<GameState | null>(localGameState); // Removed

  // --- Input Handling (New Hook) ---
  useGameControls(socket, isConnected, gameContainerRef);

  // --- Use the new Game Renderer Hook ---
  useGameRenderer({
    canvasRef,
    gameAdapterRef,
    gameStateRef,
    isConnected,
    profileStatus,
    localPlayerId
  });

  // --- Use Fullscreen Hook ---
  const { isFullscreen, toggleFullscreen, isFullscreenEnabled } = useFullscreen(
    appRef,
    canvasRef, // Pass the ref to the canvas element
    canvasWidth, // Pass original width
    canvasHeight // Pass original height
  );

  // --- Effect to handle profile status changes (e.g., open modal) ---
  useEffect(() => {
    if (profileStatus === 'needed') {
      console.log("Profile status is 'needed', opening profile modal.");
      openProfileModal();
    }
    // Handle 'error' status if needed (e.g., show an error message)
    if (profileStatus === 'error') {
      console.error("Profile status is 'error'. Could not load or parse profile.");
      // Potentially show a persistent error message to the user here
      // For now, we still open the modal to allow creating a new one.
      openProfileModal();
    }
  }, [profileStatus, openProfileModal]);

  // --- New Simple Effect for WebSocket Cleanup ---
  useEffect(() => {
    // Return the disconnect function directly for cleanup
    return () => {
      console.log('App unmounting, ensuring WebSocket disconnects...');
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]); // Only depends on the disconnect function

  // --- Render function ---
  return (
    <div className={`App ${isFullscreen ? 'App-fullscreen' : ''}`} ref={appRef}>
      <h1>Multiplayer Snake Game</h1> {/* Render unconditionally */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onRequestClose={closeProfileModal}
        onSave={saveProfile}
        initialProfile={currentUserProfile}
      />{' '}
      {/* Render unconditionally */}
      {/* Container for Game Area and Fullscreen Button */}
      <div className='game-area-wrapper'>
        <GameArea
          gameContainerRef={gameContainerRef}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          isConnected={isConnected}
          profileStatus={profileStatus}
          isProfileModalOpen={isProfileModalOpen}
          syncedGameState={syncedGameState}
          isFullscreen={isFullscreen} // Keep passing prop
        />
        {isFullscreenEnabled && (
          <button
            className='fullscreen-button'
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        )}
      </div>
      <InfoPanel
        isConnected={isConnected}
        currentUserProfile={currentUserProfile}
        profileStatus={profileStatus}
        syncedGameState={syncedGameState}
        localPlayerId={localPlayerId}
        openProfileModal={openProfileModal}
      />{' '}
      {/* Render unconditionally */}
      <Footer /> {/* Render unconditionally */}
    </div>
  );
};

export default App;
