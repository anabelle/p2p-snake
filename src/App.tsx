import React, { useEffect, useRef, /* useState, */ useCallback } from 'react';
import Modal from 'react-modal'; // Import Modal
// import { NetplayAdapter } from './game/network/NetplayAdapter';
// Types might still be needed for state-sync
import {} from /* GameState, */ /* Direction */ './game/state/types'; // Removed unused Direction
import { GRID_SIZE, CELL_SIZE } from './game/constants';
import ProfileModal from './components/ProfileModal'; // Import the modal component
// import { useGameInput } from './hooks/useGameInput'; // Removed
import { useWebSocket } from './hooks/useWebSocket'; // Import the WebSocket hook
import { useUserProfile } from './hooks/useUserProfile'; // Import the new profile hook
import { useGameLoop } from './hooks/useGameLoop'; // Import the game loop hook
import { useGameAdapter } from './hooks/useGameAdapter'; // Import the game adapter hook
import { useGameStateSync } from './hooks/useGameStateSync'; // Import the new state sync hook
import { useGameControls } from './hooks/useGameControls'; // Import the new controls hook
import useCanvasElement from './hooks/useCanvasElement'; // Import the new hook
import UserInfoSection from './components/UserInfoSection'; // Import the new component
import PlayerRankings from './components/PlayerRankings'; // Import the new component

import './App.css'; // Import the CSS file

// Bind modal to app element (important for accessibility)
if (typeof window !== 'undefined') {
  Modal.setAppElement(document.getElementById('root') || document.body);
}

const App: React.FC = () => {
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

  // --- Determine if Game Loop Should Be Active (Update to use hook's ref) ---
  const isGameLoopActive =
    isConnected &&
    profileStatus === 'loaded' &&
    !!canvasRef.current &&
    !!gameAdapterRef.current && // Use the ref from useGameAdapter
    !!localPlayerId;

  // --- Draw Frame Callback for Game Loop ---
  const drawFrame = useCallback(() => {
    // Check if drawing is possible (refs exist) - redundant check if isGameLoopActive is correct
    if (canvasRef.current && gameAdapterRef.current && gameStateRef.current) {
      try {
        gameAdapterRef.current.draw(canvasRef.current, gameStateRef.current);
      } catch (e) {
        console.error('Error during gameAdapter.draw:', e);
      }
    }
    // No need to request next frame here, the hook handles it
  }, [gameAdapterRef, gameStateRef, canvasRef]); // Added canvasRef dependency

  // --- Use the Game Loop Hook ---
  useGameLoop(drawFrame, isGameLoopActive);

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

  // --- Render function (Structure remains the same as original) ---
  return (
    <div className='App'>
      <h1>Multiplayer Snake Game</h1>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onRequestClose={closeProfileModal}
        onSave={saveProfile}
        initialProfile={currentUserProfile}
      />

      <div
        ref={gameContainerRef}
        id='game-canvas-container'
        style={{
          width: canvasWidth,
          height: canvasHeight,
          ['--canvas-width' as string]: `${canvasWidth}px`
        }}
      >
        {!isConnected && profileStatus !== 'loaded' && !isProfileModalOpen && (
          <div className='connecting-overlay'>
            {profileStatus === 'loading' ? 'Loading Profile...' : 'Connecting...'}
          </div>
        )}
        {isConnected && syncedGameState?.playerCount && syncedGameState.playerCount > 0 && (
          <div className='player-count-badge'>Players: {syncedGameState.playerCount}</div>
        )}
      </div>

      {isConnected && currentUserProfile && profileStatus === 'loaded' && (
        <div className='info-sections-wrapper'>
          <UserInfoSection
            currentUserProfile={currentUserProfile}
            syncedGameState={syncedGameState}
            localPlayerId={localPlayerId}
            openProfileModal={openProfileModal}
          />

          <PlayerRankings
            syncedGameState={syncedGameState}
            localPlayerId={localPlayerId}
            isConnected={isConnected}
          />

          <div className='info-section' id='powerup-legend'>
            <h3>Power-Up Legend</h3>
            <ul>
              <li>
                <span className='powerup-symbol speed'>S</span> - Speed Boost
              </li>
              <li>
                <span className='powerup-symbol slow'>W</span> - Slow Down
              </li>
              <li>
                <span className='powerup-symbol invincibility'>I</span> - Invincibility
              </li>
              <li>
                <span className='powerup-symbol double-score'>2x</span> - Double Score
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
