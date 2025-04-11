import React, { useEffect, useRef, useState, useCallback } from 'react';
import Modal from 'react-modal'; // Import Modal
import { NetplayAdapter } from './game/network/NetplayAdapter';
// Types might still be needed for state-sync
import { GameState, Direction } from './game/state/types';
import { UserProfile } from './types'; // Import UserProfile type
import { v4 as uuidv4 } from 'uuid';
import { GRID_SIZE, CELL_SIZE } from './game/constants';
import ProfileModal from './components/ProfileModal'; // Import the modal component
import { useGameInput } from './hooks/useGameInput'; // Import the new hook
import { useWebSocket } from './hooks/useWebSocket'; // Import the WebSocket hook

import './App.css'; // Import the CSS file

// Bind modal to app element (important for accessibility)
if (typeof window !== 'undefined') {
  Modal.setAppElement(document.getElementById('root') || document.body);
}

const App: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null); // Ref for touch events and canvas container
  const localPlayerIdRef = useRef<string>('');
  const gameAdapterRef = useRef<NetplayAdapter | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();

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

  // --- React State ---
  const [localGameState, setLocalGameState] = useState<GameState | null>(null); // Initialize as null
  const gameStateRef = useRef<GameState | null>(localGameState); // Ref for game loop

  // --- Profile State ---
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // --- Update localGameState Ref whenever WebSocket state changes ---
  useEffect(() => {
    gameStateRef.current = latestGameState; // Update ref for game loop
    setLocalGameState(latestGameState); // Update state for rendering
  }, [latestGameState]);

  // --- Sync User Profile with Server State ---
  useEffect(() => {
    if (latestGameState && localPlayerIdRef.current && currentUserProfile) {
      const playerStatsFromServer = latestGameState.playerStats?.[localPlayerIdRef.current];
      if (
        playerStatsFromServer &&
        (playerStatsFromServer.name !== currentUserProfile.name ||
          playerStatsFromServer.color !== currentUserProfile.color)
      ) {
        const updatedProfile = {
          id: localPlayerIdRef.current,
          name: playerStatsFromServer.name ?? '',
          color: playerStatsFromServer.color
        };
        console.log('Updating local profile from server state:', updatedProfile);
        localStorage.setItem('snakeUserProfile', JSON.stringify(updatedProfile));
        setCurrentUserProfile(updatedProfile);
      }
    }
  }, [latestGameState, currentUserProfile]);

  // --- Input Handling (Updated to use hook's socket) ---
  const handleDirectionChange = useCallback(
    (direction: Direction) => {
      if (socket && isConnected) {
        let inputToSend: { dx: number; dy: number } | null = null;
        switch (direction) {
          case Direction.UP:
            inputToSend = { dx: 0, dy: 1 };
            break;
          case Direction.DOWN:
            inputToSend = { dx: 0, dy: -1 };
            break;
          case Direction.LEFT:
            inputToSend = { dx: -1, dy: 0 };
            break;
          case Direction.RIGHT:
            inputToSend = { dx: 1, dy: 0 };
            break;
        }
        if (inputToSend) {
          socket.emit('input', inputToSend);
        }
      }
    },
    [socket, isConnected]
  );
  useGameInput(gameContainerRef, handleDirectionChange);

  // --- Game Loop ---
  const gameLoop = useCallback(() => {
    // Check if drawing is possible (refs exist)
    if (canvasRef.current && gameAdapterRef.current) {
      // Only attempt to draw if state is also available
      if (gameStateRef.current) {
        try {
          gameAdapterRef.current.draw(canvasRef.current, gameStateRef.current);
        } catch (e) {
          console.error('Error during gameAdapter.draw:', e);
          // Optional: Decide if loop should stop on draw error
        }
      } else {
        // State not yet available, clear canvas? Or just wait?
        // console.log("Waiting for game state to draw...");
        // Optionally clear the canvas to avoid showing stale frame
        // const ctx = canvasRef.current.getContext('2d');
        // ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      // Keep requesting frames as long as the adapter exists
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      // If adapter or canvas disappears, stop the loop
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
      console.log('Game loop stopping: Adapter or Canvas ref missing.');
    }
  }, []); // No dependencies needed

  // --- Game Adapter Initialization ---
  const startGameAdapter = useCallback(
    (playerId: string) => {
      // Check if adapter already exists OR if playerId is missing
      if (gameAdapterRef.current || !playerId) {
        // If adapter exists, ensure loop is running
        if (gameAdapterRef.current && !animationFrameRef.current) {
          console.log('Adapter exists, ensuring game loop is running.');
          gameLoop();
        }
        // If no playerId, log warning
        if (!playerId) {
          console.warn('startGameAdapter called without a valid playerId.');
        }
        return; // Don't proceed if adapter exists or playerId is missing
      }

      // Proceed with adapter creation if it doesn't exist and playerId is provided
      try {
        // Belt-and-suspenders check for canvas before creating adapter
        if (!canvasRef.current) {
          console.error('startGameAdapter called but canvasRef is null!');
          return;
        }
        console.log(`Creating NetplayAdapter for player ${playerId}...`);
        gameAdapterRef.current = new NetplayAdapter(canvasRef.current, playerId);
        console.log('NetplayAdapter created. Starting client game loop...');
        // Ensure loop starts if not already running
        if (!animationFrameRef.current) {
          gameLoop();
        }
      } catch (e) {
        console.error('Error creating NetplayAdapter instance:', e);
      }
    },
    [gameLoop]
  );

  // --- Effect to Manage Game Adapter based on Connection Status ---
  useEffect(() => {
    if (isConnected && canvasRef.current && currentUserProfile?.id) {
      console.log(
        `Conditions met for player ${currentUserProfile.id}. Ensuring game adapter & loop.`
      );
      startGameAdapter(currentUserProfile.id);
    } else if (!isConnected) {
      console.log('Socket disconnected, cleaning up adapter and loop.');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      gameAdapterRef.current = null;
    }
    // Dependencies simplified
  }, [isConnected, startGameAdapter, currentUserProfile]);

  // --- Centralized Setup Effect (Handles profile load, initial canvas, main cleanup) ---
  useEffect(() => {
    // --- Load Profile or Trigger Modal ---
    const loadAndInitialize = () => {
      const storedProfile = localStorage.getItem('snakeUserProfile');
      if (storedProfile) {
        try {
          const profile: UserProfile = JSON.parse(storedProfile);
          if (profile.id && profile.name && profile.color) {
            console.log('Loaded profile, setting state and connecting:', profile);
            localPlayerIdRef.current = profile.id;
            setCurrentUserProfile(profile); // Set state first
            connectWebSocket(profile); // THEN connect with the hook's function
          } else {
            handleInvalidProfile('Invalid profile structure');
          }
        } catch (e) {
          handleInvalidProfile(`Error parsing profile: ${e}`);
        }
      } else {
        console.log('No profile found, opening modal.');
        setIsProfileModalOpen(true);
      }
    };

    const handleInvalidProfile = (message: string) => {
      console.error(message);
      localStorage.removeItem('snakeUserProfile');
      setIsProfileModalOpen(true);
    };

    // --- Canvas Creation (Ensure it exists initially if possible) ---
    let canvasElementCreated = false;
    if (!canvasRef.current && gameContainerRef.current) {
      console.log('Creating initial canvas element on mount...');
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      gameContainerRef.current.appendChild(canvas);
      canvasRef.current = canvas;
      canvasElementCreated = true;
    }

    // --- Start Initial Load/Connection ---
    loadAndInitialize();

    // --- Cleanup function for this main setup effect ---
    return () => {
      console.log('Main App effect cleanup (unmount)');
      disconnectWebSocket();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      gameAdapterRef.current = null;
      const gameContainer = gameContainerRef.current;
      if (canvasElementCreated && canvasRef.current && gameContainer?.contains(canvasRef.current)) {
        console.log('Removing initial canvas element on unmount.');
        try {
          gameContainer.removeChild(canvasRef.current);
        } catch (error) {
          console.error('Error removing canvas during unmount cleanup:', error);
        }
        canvasRef.current = null;
      }
    };
  }, [connectWebSocket, disconnectWebSocket, canvasHeight, canvasWidth]);

  // --- Profile Modal Handlers (No changes needed) ---
  const handleOpenProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  // --- handleSaveProfile (Updated to use hook's connect/socket) ---
  const handleSaveProfile = (profileData: UserProfile) => {
    const isNewUser = !currentUserProfile || !profileData.id;
    const profileToSave: UserProfile = {
      ...profileData,
      id: isNewUser ? uuidv4() : profileData.id
    };

    console.log(isNewUser ? 'Saving NEW profile:' : 'Saving UPDATED profile:', profileToSave);
    localStorage.setItem('snakeUserProfile', JSON.stringify(profileToSave));
    localPlayerIdRef.current = profileToSave.id;
    setCurrentUserProfile(profileToSave);
    setIsProfileModalOpen(false);

    if (isNewUser) {
      console.log('Connecting WebSocket for new user...');
      connectWebSocket(profileToSave);
    } else if (socket?.connected) {
      const updatePayload = { name: profileToSave.name, color: profileToSave.color };
      console.log('Emitting profile update to server:', updatePayload);
      socket.emit('updateProfile', updatePayload);
    } else {
      console.warn(
        'Profile updated, but socket not connected. Update will be sent on next connection.'
      );
    }
  };

  // --- Render function (Structure remains the same as original) ---
  return (
    <div className='App'>
      <h1>Multiplayer Snake Game</h1>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onRequestClose={handleCloseProfileModal}
        onSave={handleSaveProfile}
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
        {!isConnected && !isProfileModalOpen && (
          <div className='connecting-overlay'>Connecting...</div>
        )}
        {isConnected && localGameState?.playerCount && localGameState.playerCount > 0 && (
          <div className='player-count-badge'>Players: {localGameState.playerCount}</div>
        )}
      </div>

      {isConnected && currentUserProfile && (
        <div className='info-sections-wrapper'>
          <div className='info-section' id='your-snake-info'>
            <h3>Your Snake</h3>
            <div
              className='editable-profile-item'
              onClick={handleOpenProfileModal}
              title='Click to edit profile'
            >
              <span>
                <strong>Name:</strong> {currentUserProfile.name}
              </span>
            </div>
            <div
              className='editable-profile-item'
              onClick={handleOpenProfileModal}
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
                if (!localGameState?.activePowerUps || !localGameState.timestamp) {
                  return <span style={{ fontStyle: 'italic', opacity: 0.7 }}> None</span>;
                }
                const serverTime = localGameState.timestamp;
                const active = localGameState.activePowerUps.filter(
                  (ap) => ap.playerId === localPlayerIdRef.current && ap.expiresAt > serverTime
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
                    const playerStats = localGameState?.playerStats || {};
                    const players = Object.values(playerStats).sort(
                      (a, b) => (b.score ?? 0) - (a.score ?? 0)
                    );
                    if (players.length > 0) {
                      return players.map((player) => (
                        <tr
                          key={player.id}
                          className={player.id === localPlayerIdRef.current ? 'highlight-row' : ''}
                        >
                          <td>
                            <div>
                              <span
                                className='player-color-swatch'
                                style={{ backgroundColor: player.color }}
                              />
                              {player.name || player.id.substring(0, 6)}
                              {player.id === localPlayerIdRef.current ? ' (You)' : ''}
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
                      return (
                        <tr>
                          <td colSpan={4}>
                            {isConnected ? 'Waiting for players...' : 'Connecting...'}
                          </td>
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
