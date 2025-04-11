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

import './App.css'; // Import the CSS file

// Bind modal to app element (important for accessibility)
if (typeof window !== 'undefined') {
  Modal.setAppElement(document.getElementById('root') || document.body);
}

const App: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null); // Ref for touch events and canvas container
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- Calculate Canvas Size from Constants ---
  const canvasWidth = GRID_SIZE.width * CELL_SIZE;
  const canvasHeight = GRID_SIZE.height * CELL_SIZE;

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
    canvasRef,
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
  }, [gameAdapterRef, gameStateRef]); // Added gameStateRef dependency

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

  // --- Centralized Setup Effect (Simplified: mainly for canvas and cleanup) ---
  useEffect(() => {
    // --- Canvas Creation (Remains the same) ---
    let canvasElementCreated = false;
    const container = gameContainerRef.current; // Capture ref value here

    if (!canvasRef.current && container) {
      // Use captured value
      console.log('Creating initial canvas element on mount...');
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      container.appendChild(canvas); // Use captured value
      canvasRef.current = canvas;
      canvasElementCreated = true;
    }

    // --- Cleanup function for this main setup effect (Simplified) ---
    return () => {
      console.log('Main App effect cleanup (unmount)');
      disconnectWebSocket(); // Still disconnect WebSocket

      // Use the captured container variable in cleanup
      if (canvasElementCreated && canvasRef.current && container?.contains(canvasRef.current)) {
        console.log('Removing initial canvas element on unmount.');
        try {
          container.removeChild(canvasRef.current); // Use captured value
        } catch (error) {
          console.error('Error removing canvas during unmount cleanup:', error);
        }
        canvasRef.current = null;
      }
    };
  }, [disconnectWebSocket, canvasHeight, canvasWidth]); // Removed connectWebSocket dependency

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
          <div className='info-section' id='your-snake-info'>
            <h3>Your Snake</h3>
            <div
              className='editable-profile-item'
              onClick={openProfileModal}
              title='Click to edit profile'
            >
              <span>
                <strong>Name:</strong> {currentUserProfile.name}
              </span>
            </div>
            <div
              className='editable-profile-item'
              onClick={openProfileModal}
              title='Click to edit profile'
            >
              <span>
                <strong>Color: </strong>
                <span
                  className='player-color-swatch'
                  style={{ backgroundColor: currentUserProfile.color }}
                />
              </span>
            </div>
            <div id='active-powerups'>
              <strong>Active Effects:</strong>
              {(() => {
                if (!syncedGameState?.activePowerUps || !syncedGameState.timestamp) {
                  return <span style={{ fontStyle: 'italic', opacity: 0.7 }}> None</span>;
                }
                const serverTime = syncedGameState.timestamp;
                const active = syncedGameState.activePowerUps.filter(
                  (ap) => ap.playerId === localPlayerId && ap.expiresAt > serverTime
                );
                if (active.length === 0) {
                  return <span style={{ fontStyle: 'italic', opacity: 0.7 }}> None</span>;
                }
                const descriptions: Record<string, string> = {
                  SPEED: 'Speed Boost',
                  SLOW: 'Slow Down',
                  INVINCIBILITY: 'Invincibility',
                  DOUBLE_SCORE: 'Double Score'
                };
                return active.map((ap) => {
                  const expiresIn = Math.max(0, Math.round((ap.expiresAt - serverTime) / 1000));
                  const description = descriptions[ap.type] || ap.type;
                  const title = `${description} (~${expiresIn}s)`;
                  return (
                    <div key={`${ap.playerId}-${ap.type}-${ap.expiresAt}`} title={title}>
                      <span>
                        {description} (~{expiresIn}s)
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className='info-section' id='player-rankings'>
            <h3>Player Rankings</h3>
            <div className='table-scroll-wrapper'>
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Deaths</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const playerStats = syncedGameState?.playerStats || {};
                    const players = Object.values(playerStats).sort(
                      (a, b) => (b.score ?? 0) - (a.score ?? 0)
                    );

                    if (players.length > 0) {
                      return players.map((player) => (
                        <tr
                          key={player.id}
                          // Use localPlayerId from hook
                          className={player.id === localPlayerId ? 'highlight-row' : ''}
                        >
                          <td>
                            <div>
                              <span
                                className='player-color-swatch'
                                style={{ backgroundColor: player.color }}
                              />
                              {player.name || player.id.substring(0, 6)}
                              {/* Use localPlayerId from hook */}
                              {player.id === localPlayerId ? ' (You)' : ''}
                            </div>
                          </td>
                          <td>{player.score ?? 0}</td>
                          <td>{player.deaths ?? 0}</td>
                          <td className={player.isConnected ? 'status-online' : 'status-offline'}>
                            {player.isConnected ? 'Online' : 'Offline'}
                          </td>
                        </tr>
                      ));
                    } else {
                      // Handle the "no players" case
                      // Since we are inside the block conditional on profileStatus === 'loaded',
                      // we only need to check the connection status.
                      const statusMessage = isConnected
                        ? 'Waiting for players...'
                        : 'Connecting...';
                      return (
                        <tr>
                          <td colSpan={4}>{statusMessage}</td>
                        </tr>
                      );
                    }
                  })()}
                </tbody>
              </table>
            </div>
          </div>

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
