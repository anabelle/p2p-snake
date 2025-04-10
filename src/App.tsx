import React, { useEffect, useRef, useState, useCallback } from 'react';
import Modal from 'react-modal'; // Import Modal
import { NetplayAdapter } from './game/network/NetplayAdapter';
// Types might still be needed for state-sync
import { GameState } from './game/state/types';
import { UserProfile } from './types'; // Import UserProfile type
import io, { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { GRID_SIZE, CELL_SIZE } from './game/constants';
import ProfileModal from './components/ProfileModal'; // Import the modal component

import './App.css'; // Import the CSS file

// Bind modal to app element (important for accessibility)
if (typeof window !== 'undefined') {
    Modal.setAppElement(document.getElementById('root') || document.body);
}

const App: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  // Core component refs
  const socketRef = useRef<Socket | null>(null);
  // localPlayerIdRef is now set *after* profile is confirmed
  const localPlayerIdRef = useRef<string>('');
  // userProfileRef is deprecated, use state instead
  // const userProfileRef = useRef<UserProfile | null>(null);
  const gameAdapterRef = useRef<NetplayAdapter | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();

  // --- Calculate Canvas Size from Constants ---
  const canvasWidth = GRID_SIZE.width * CELL_SIZE;
  const canvasHeight = GRID_SIZE.height * CELL_SIZE;

  // --- React State ---
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState>({ // Initialize game state
      snakes: [],
      food: [],
      powerUps: [],
      activePowerUps: [],
      gridSize: GRID_SIZE,
      timestamp: 0,
      sequence: 0,
      rngSeed: 0,
      playerCount: 0,
      powerUpCounter: 0,
      playerStats: {}
  });
  const gameStateRef = useRef<GameState>(gameState); // Ref to hold current game state

  // --- Profile State ---
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Input State (remains the same)
  // const localInputStateRef = useRef({ dx: 0, dy: 0 }); // No longer needed for direction
  // const pressedKeysRef = useRef<Set<string>>(new Set()); // No longer needed for direction
  // State for touch controls
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);

  // Input Event Listeners
  useEffect(() => {
    // --- Keyboard Listeners ---
    const handleKeyDown = (event: KeyboardEvent) => {
      // console.log(`KEYDOWN Event: key=${event.key}`);
      let direction: { dx: number; dy: number } | null = null;
      let isArrowKey = false;

      switch (event.key) {
        case 'ArrowUp':    direction = { dx: 0, dy: 1 }; isArrowKey = true; break;
        case 'ArrowDown':  direction = { dx: 0, dy: -1 }; isArrowKey = true; break;
        case 'ArrowLeft':  direction = { dx: -1, dy: 0 }; isArrowKey = true; break;
        case 'ArrowRight': direction = { dx: 1, dy: 0 }; isArrowKey = true; break;
      }

      if (direction && socketRef.current && socketRef.current.connected) {
        // Send input directly to the server
        socketRef.current.emit('input', direction);
        // console.log("KEYDOWN - Sent input:", direction);
      }

      // Prevent default scrolling behavior for arrow keys
      if (isArrowKey) {
        event.preventDefault();
      }
    };

    // KeyUp is no longer needed for directional control
    // const handleKeyUp = (event: KeyboardEvent) => { ... };

    window.addEventListener('keydown', handleKeyDown);
    // window.addEventListener('keyup', handleKeyUp); // Remove KeyUp listener

    // --- Touch Listeners for Swipe Controls ---
    const gameArea = gameContainerRef.current; // Capture ref value

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) { // Only handle single touch swipes
        touchStartPos.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        // Prevent default scroll/zoom behavior triggered by touchstart
        // event.preventDefault(); // May prevent clicking UI elements inside? Test this.
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
        // Prevent scrolling while dragging finger
        event.preventDefault();
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchStartPos.current || event.changedTouches.length === 0) return;

      const touchEndPos = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
      const dx = touchEndPos.x - touchStartPos.current.x;
      const dy = touchEndPos.y - touchStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const swipeThreshold = 30; // Minimum distance for a swipe

      if (distance > swipeThreshold) { // Check if swipe distance is significant
        const angle = Math.atan2(dy, dx) * 180 / Math.PI; // Angle in degrees
        let detectedDirection: { dx: number, dy: number } | null = null;

        // Determine direction based on angle ranges (adjust ranges as needed)
        if (angle >= -45 && angle < 45) {
          detectedDirection = { dx: 1, dy: 0 }; // Right
        } else if (angle >= 45 && angle < 135) {
          detectedDirection = { dx: 0, dy: -1 }; // Down (screen coordinates are Y-down)
        } else if (angle >= 135 || angle < -135) {
          detectedDirection = { dx: -1, dy: 0 }; // Left
        } else if (angle >= -135 && angle < -45) {
          detectedDirection = { dx: 0, dy: 1 }; // Up (screen coordinates are Y-down)
        }

        // Send swipe input directly if valid and connected
        if (detectedDirection && socketRef.current && socketRef.current.connected) {
            // // Original logic to prevent reversing - maybe let server handle this?
            // // const currentInput = localInputStateRef.current;
            // // const isOpposite =
            // //       (detectedDirection.dx !== 0 && detectedDirection.dx === -currentInput.dx) ||
            // //       (detectedDirection.dy !== 0 && detectedDirection.dy === -currentInput.dy);
            // // if (!isOpposite) {
            // //     socketRef.current.emit('input', detectedDirection);
            // //     console.log("SWIPE Detected & Sent - Angle:", angle, " Direction:", detectedDirection);
            // // } else {
            // //     console.log("SWIPE Ignored - Opposite direction");
            // // }

            // Send directly, let server validate/handle opposite direction logic
            socketRef.current.emit('input', detectedDirection);
            // console.log("SWIPE Detected & Sent - Angle:", angle, " Direction:", detectedDirection);

        } else if (!detectedDirection) {
             console.log("SWIPE Ignored - Angle not in defined range:", angle);
        }
      }

      touchStartPos.current = null; // Reset start position
    };

    if (gameArea) {
        console.log("Attaching touch listeners...");
        // Use { passive: false } to allow preventDefault inside listeners
        gameArea.addEventListener('touchstart', handleTouchStart, { passive: false });
        gameArea.addEventListener('touchmove', handleTouchMove, { passive: false });
        gameArea.addEventListener('touchend', handleTouchEnd, { passive: true }); // touchend doesn't need preventDefault usually
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // window.removeEventListener('keyup', handleKeyUp); // Ensure KeyUp listener removal is also removed
      if (gameArea) {
        console.log("Removing touch listeners...");
        gameArea.removeEventListener('touchstart', handleTouchStart);
        gameArea.removeEventListener('touchmove', handleTouchMove);
        gameArea.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [canvasHeight, canvasWidth]); // Re-run if canvas size changes to re-attach listeners

  // --- Game Loop (Moved outside useEffect, wrapped in useCallback) ---
  const gameLoop = useCallback(() => {
    // Ensure loop stops if component unmounts or disconnects
    if (!gameAdapterRef.current || !canvasRef.current || !socketRef.current?.connected) {
        // console.log("Game loop stopping: Adapter, canvas, or socket missing/disconnected.");
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); // Stop any pending frame
        animationFrameRef.current = undefined; // Clear ref
        return;
    }

    // 1. Send Local Input State to SERVER - REMOVED
    // const currentLocalInput = localInputStateRef.current;
    // if (socketRef.current) { // Check if socket exists before emitting
    //   socketRef.current.emit('input', currentLocalInput); // Send { dx, dy }
    // }

    // 2. Client does NOT tick the simulation.

    // 3. Draw the current state (updated by state-sync messages)
    // Read gameState from the ref for the most up-to-date value
    try {
      if(gameAdapterRef.current && canvasRef.current) { // Ensure refs are valid
        gameAdapterRef.current.draw(canvasRef.current, gameStateRef.current);
      }
    } catch (e) {
      console.error("Error during gameAdapter.draw:", e); // Keep console.error
      // Stop loop on draw error
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
      return;
    }

    // Request next frame
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  // Dependencies: gameStateRef (though it's a ref, changes won't trigger re-render/re-memoization directly)
  // Include things used inside that might change, like socketRef status indirectly via check?
  // Refs themselves don't usually go in deps, but we read their .current properties.
  // Add gameState? No, drawing reads from ref. Maybe localInputStateRef?
  // Let's keep it simple, assuming refs are stable containers.
  }, []);

  // --- Game Adapter Initialization (Moved outside useEffect, wrapped in useCallback) ---
  const startGameAdapter = useCallback(() => {
    // console.log(`startGameAdapter called. gameContainerRef.current: ${!!gameContainerRef.current}, canvasRef.current: ${!!canvasRef.current}`);
    if (!gameAdapterRef.current && gameContainerRef.current && canvasRef.current) {
      // console.log("Initializing Client NetplayAdapter...");
      try {
        // Ensure localPlayerIdRef.current has a value before creating adapter
        if (!localPlayerIdRef.current) {
            console.error("Cannot start adapter: localPlayerId is not set.");
            return;
        }
        gameAdapterRef.current = new NetplayAdapter(canvasRef.current, localPlayerIdRef.current);
        // console.log(`Client NetplayAdapter instance created.`);

        // Start the game loop
        console.log("Starting client game loop...");
        gameLoop(); // Call the memoized gameLoop

      } catch (e) {
        console.error("Error creating NetplayAdapter instance:", e);
        return;
      }
    } else {
      // console.log(`startGameAdapter did not proceed. Adapter: ${!!gameAdapterRef.current}, Container: ${!!gameContainerRef.current}, Canvas: ${!!canvasRef.current}`);
    }
  // Dependencies: gameLoop needs to be included as it's called.
  // localPlayerIdRef is read, but refs don't usually go in deps.
  }, [gameLoop]);

  // --- WebSocket Connection Function ---
  const connectWebSocket = useCallback((profile: UserProfile) => {
    if (socketRef.current) {
        console.log('WebSocket already connected or connecting.');
        return; // Avoid reconnecting if already connected
    }

    console.log(`Connecting to WebSocket with Profile: ID=${profile.id}, Name=${profile.name}, Color=${profile.color}`);
    
    // Update to use Heroku URL
    const SIGNALING_SERVER_URI = 'https://snake-api-974c0cc98060.herokuapp.com';
    
    socketRef.current = io(SIGNALING_SERVER_URI, {
        query: {
            id: profile.id,
            name: profile.name,
            color: profile.color
        },
        reconnectionAttempts: 3 // Optional: limit reconnection attempts
    });
    const socket = socketRef.current;

    socket.on('connect', () => {
        console.log('Connected to signaling server');
        setIsConnected(true);
        // Now startGameAdapter is stable and defined in the component scope
        if (!gameAdapterRef.current) {
            startGameAdapter(); // Call the memoized startGameAdapter
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('Disconnected from signaling server:', reason);
        setIsConnected(false);
        // Stop the game loop on disconnect
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = undefined;
        }
        // Clear adapter/canvas refs on disconnect?
        gameAdapterRef.current = null;
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasWidth, canvasHeight);
        }
        socketRef.current = null; // Clear socket ref after disconnect handling
    });

    socket.on('connect_error', (err) => {
        console.error('Signaling connection error:', err);
        setIsConnected(false);
        socketRef.current = null; // Clear ref on connection error
    });

    // --- Listener for State Sync from Server ---
    socket.on('state-sync', (serverState: GameState) => {
        // We don't need the adapter to deserialize anymore
        // Process the received state directly

        // Debug check - log player stats if empty but players exist
        if (serverState.snakes.length > 0 &&
            (!serverState.playerStats || Object.keys(serverState.playerStats).length === 0)) {
            console.warn("Received state with snakes but empty playerStats", {
                snakeCount: serverState.snakes.length,
                playerStats: serverState.playerStats
            });

            // Create playerStats if missing from snakes as a fallback (MUTATES serverState copy)
            if (!serverState.playerStats) {
                serverState.playerStats = {};
            }

            // Populate from snakes if needed (MUTATES serverState copy)
            serverState.snakes.forEach(snake => {
                if (!serverState.playerStats[snake.id]) {
                    // console.log(`Client: Adding missing stats for snake ${snake.id} from sync`);
                    serverState.playerStats[snake.id] = {
                        id: snake.id,
                        color: snake.color,
                        score: snake.score,
                        deaths: 0, // Assume 0 deaths if initializing here
                        isConnected: true // Assume connected if they have a snake
                    };
                }
            });
        } else if (serverState.playerStats) {
            // Ensure all snakes have a corresponding playerStat entry if playerStats exists
            serverState.snakes.forEach(snake => {
                 if (!serverState.playerStats[snake.id]) {
                    // console.log(`Client: Adding missing stats for snake ${snake.id} (stats existed)`);
                    serverState.playerStats[snake.id] = {
                        id: snake.id,
                        color: snake.color,
                        score: snake.score,
                        deaths: 0, // Assume 0 deaths
                        isConnected: true
                    };
                 } else {
                     // Ensure existing playerStats has correct 'isConnected' status if snake is present
                     serverState.playerStats[snake.id].isConnected = true;
                 }
            });
            // Ensure playerStats reflects disconnected players (those in stats but not snakes)
            Object.keys(serverState.playerStats).forEach(pId => {
                if (!serverState.snakes.some(s => s.id === pId)) {
                    if (serverState.playerStats[pId].isConnected) {
                         // console.log(`Client: Marking player ${pId} as disconnected (not in snakes)`);
                        serverState.playerStats[pId].isConnected = false;
                    }
                }
            });
        }

        // Update main game state for rendering snakes, food, etc.
        setGameState(serverState);

        // --- Refined Profile Sync Logic --- 
        // Always check server state for the authoritative profile info after connect/update
        const playerStatsFromServer = serverState.playerStats?.[localPlayerIdRef.current];
        
        setCurrentUserProfile(currentProfile => {
            // Only proceed if we have both local profile and server stats for this player
            if (playerStatsFromServer && currentProfile) {
                const serverName = playerStatsFromServer.name; // Could be string | undefined
                const serverColor = playerStatsFromServer.color; // Is string
                let changed = false;
                let updatedProfile = { ...currentProfile };

                // Check if name needs updating from server
                if (serverName !== currentProfile.name) { // Comparison handles undefined correctly
                    console.log(`Server name (${serverName}) differs from local (${currentProfile.name}). Updating local profile.`);
                    // Use nullish coalescing to provide default empty string if serverName is undefined
                    updatedProfile.name = serverName ?? ''; 
                    changed = true;
                }

                // Check if color needs updating from server (color is non-optional)
                if (serverColor !== currentProfile.color) {
                    console.log(`Server color (${serverColor}) differs from local (${currentProfile.color}). Updating local profile.`);
                    updatedProfile.color = serverColor;
                    changed = true;
                }

                // If any changes were detected, update localStorage and return the new profile state
                if (changed) {
                    localStorage.setItem('snakeUserProfile', JSON.stringify(updatedProfile));
                    return updatedProfile;
                }
            }
            // If no server stats, no local profile, or no changes needed, return the current profile
            return currentProfile; 
        });
    });
  // Dependencies updated to include the stable startGameAdapter
  }, [setCurrentUserProfile, canvasWidth, canvasHeight, startGameAdapter]);

  // --- Centralized Setup Effect (Handles profile load, WebSocket connection, canvas) ---
  useEffect(() => {
    // --- Load Profile or Trigger Modal --- 
    const loadAndInitialize = () => {
        const storedProfile = localStorage.getItem('snakeUserProfile');
        let profile: UserProfile | null = null;
        if (storedProfile) {
            try {
                const parsed = JSON.parse(storedProfile);
                // Basic validation
                if (parsed.id && parsed.name && parsed.color) {
                    profile = parsed;
                    console.log('Loaded user profile from localStorage:', profile);
                } else {
                    console.warn('Invalid profile structure in localStorage. Clearing.');
                    localStorage.removeItem('snakeUserProfile');
                }
            } catch (e) {
                console.error('Failed to parse user profile from localStorage:', e);
                localStorage.removeItem('snakeUserProfile'); // Clear invalid data
            }
        }

        if (profile) {
            // Profile exists, set state and connect
            localPlayerIdRef.current = profile.id;
            setCurrentUserProfile(profile);
            connectWebSocket(profile); // Call the memoized function
        } else {
            // No valid profile, open modal
            console.log('No valid user profile found. Opening creation modal...');
            setIsProfileModalOpen(true);
        }
    };

    // --- Canvas Creation --- (Moved from separate effect to ensure order)
    let canvasCreated = false;
    if (!canvasRef.current && gameContainerRef.current) {
         console.log("Creating canvas element...");
         const canvas = document.createElement('canvas');
         canvas.width = canvasWidth;
         canvas.height = canvasHeight;
         gameContainerRef.current.appendChild(canvas);
         canvasRef.current = canvas;
         canvasCreated = true;
         console.log("Canvas element created and appended.");
    }

    // --- Start Initial Load/Connection ---
    loadAndInitialize();

    // --- Game Loop is now started by startGameAdapter triggered by connectWebSocket ---

    // --- Cleanup function for this effect ---
    return () => {
      console.log('Clean up main effect');
      // First, cancel current animation frame if active
      if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = undefined;
      }
      // Disconnect WebSocket
      socketRef.current?.disconnect();
      socketRef.current = null;
      // Clear adapter ref
      gameAdapterRef.current = null;
      // Remove canvas if it was created by this effect instance
      /* eslint-disable react-hooks/exhaustive-deps */
      const gameContainer = gameContainerRef.current; // Copy the ref value
      if (canvasCreated && canvasRef.current && gameContainer?.contains(canvasRef.current)) {
          console.log("Removing canvas element.");
          gameContainer.removeChild(canvasRef.current);
          canvasRef.current = null;
      }
    };
  // Dependencies: connectWebSocket (stable), canvas dimensions
  }, [canvasHeight, canvasWidth, connectWebSocket]);

  // Effect to keep gameStateRef updated with the latest gameState
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // --- Profile Modal Handlers ---
  const handleOpenProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const handleSaveProfile = (profileData: UserProfile) => {
    let profileToSave: UserProfile;
    const isNewUser = !currentUserProfile; // Check if we are creating a new profile

    if (isNewUser) {
        // Creating a new profile
        const newId = uuidv4();
        profileToSave = { ...profileData, id: newId };
        console.log('Saving new profile:', profileToSave);
    } else {
        // Updating existing profile
        profileToSave = { ...currentUserProfile!, ...profileData }; // Merge changes, keep existing ID
        console.log('Updating existing profile:', profileToSave);
    }

    // Save to localStorage
    localStorage.setItem('snakeUserProfile', JSON.stringify(profileToSave));

    // Update state IMMEDIATELY for local responsiveness
    // Note: state-sync might overwrite this shortly if server hasn't processed yet, but it should eventually converge
    setCurrentUserProfile(profileToSave);
    localPlayerIdRef.current = profileToSave.id; // Ensure ref has the ID

    // Close the modal
    setIsProfileModalOpen(false);

    // Connect or Update Server
    if (isNewUser) {
        // If it was a new user, establish the WebSocket connection now
        connectWebSocket(profileToSave);
    } else if (socketRef.current?.connected) {
        // If updating and connected, notify the server
        const updatePayload = { name: profileToSave.name, color: profileToSave.color };
        console.log('Emitting profile update to server:', updatePayload);
        socketRef.current.emit('updateProfile', updatePayload);
    } else {
        console.warn('Profile updated, but socket is not connected. Update will be sent on next connection (if implemented)');
    }
  };

  // Render function
  return (
    <div className="game-container">
      <h1>Multiplayer Snake Game</h1>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onRequestClose={handleCloseProfileModal}
        onSave={handleSaveProfile}
        initialProfile={currentUserProfile} // Pass current profile for editing, or null for creation
      />

      <div ref={gameContainerRef} id="game-canvas-container" style={{
          width: canvasWidth,
          height: canvasHeight,
          ['--canvas-width' as string]: `${canvasWidth}px` 
        }}>
         {isConnected && gameState.playerCount > 0 && (
           <div className="player-count-badge">
              Players: {gameState.playerCount}
           </div>
         )}
         {!isConnected && 
            <div className="connecting-overlay">
                Connecting...
            </div>
         }
      </div>
      
      {isConnected && gameAdapterRef.current && currentUserProfile && ( // Ensure profile is loaded
        <div className="info-sections-wrapper">
          <div className="info-section" id="your-snake-info">
            <h3>Your Snake</h3>
            {/* Make Name and Color clickable */}
            <div className="editable-profile-item" onClick={handleOpenProfileModal} title="Click to edit profile">
              <span><strong>Name:</strong> {currentUserProfile.name}</span>
            </div>
            <div className="editable-profile-item" onClick={handleOpenProfileModal} title="Click to edit profile">
              <span>
                <strong>Color: </strong>
                {(() => {
                  // Use currentUserProfile.color as the primary source
                  const color = currentUserProfile.color;
                  // Fallback check needed? Server sync should update currentUserProfile.
                  // const yourPlayerStats = gameState.playerStats?.[localPlayerIdRef.current];
                  // const color = yourPlayerStats?.color || currentUserProfile.color; // Prioritize stats?

                  if (color) {
                    return (
                      <span
                        className="player-color-swatch"
                        style={{ backgroundColor: color, cursor: 'pointer' }} // Add cursor pointer
                      />
                    );
                  } else {
                     return (
                       <span style={{ color: 'var(--text-color)', opacity: 0.7, fontStyle: 'italic' }}> (Waiting...)</span>
                     );
                  }
                })()}
              </span>
            </div>
            <div id="active-powerups">
              <strong>Active Effects:</strong>
              {(() => {


                // Use the timestamp from the received game state for comparison
                const serverTime = gameState.timestamp;
                const allActive = gameState.activePowerUps || []; // Ensure it's an array

                const active = allActive.filter(ap => {
                  const isLocal = ap.playerId === localPlayerIdRef.current;
                  const isExpired = ap.expiresAt <= serverTime;
                  // Log individual checks
                  // console.log(`  Checking AP type=${ap.type}, player=${ap.playerId}, expires=${ap.expiresAt}, local=${isLocal}, expired=${isExpired}`);
                  return isLocal && !isExpired; // Compare against server time
                });


                if (active.length === 0) {
                  return <span style={{ fontStyle: 'italic', opacity: 0.7 }}> None</span>;
                }

                // Mapping from type to description (reuse from legend)
                const descriptions: Record<string, string> = {
                  SPEED: "Speed Boost",
                  SLOW: "Slow Down",
                  INVINCIBILITY: "Invincibility",
                  DOUBLE_SCORE: "Double Score"
                };

                return active.map(ap => {
                  let symbol = '?';
                  let className = 'powerup-symbol';
                  let description = descriptions[ap.type] || ap.type; // Get description or fallback to type name

                  switch (ap.type) {
                    case 'SPEED': symbol = 'S'; className += ' speed'; break;
                    case 'SLOW': symbol = 'W'; className += ' slow'; break;
                    case 'INVINCIBILITY': symbol = 'I'; className += ' invincibility'; break;
                    case 'DOUBLE_SCORE': symbol = '2x'; className += ' double-score'; break;
                  }
                  // Calculate remaining duration roughly (optional)
                  const expiresIn = Math.max(0, Math.round((ap.expiresAt - serverTime) / 1000));
                  const title = `${description} (expires in ~${expiresIn}s)`;

                  return (
                    <div key={ap.type}>
                         <span className={className} title={title}>
                           {symbol}
                         </span>
                         <span>{description} (~{expiresIn}s)</span> 
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="info-section" id="player-rankings">
            <h3>Player Rankings</h3>
            <div className="table-scroll-wrapper">
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
                    // Always derive players from playerStats
                    const playerStats = gameState.playerStats || {};
                    const players = Object.values(playerStats);

                    if (players.length > 0) {
                      // console.log("Rendering", players.length, "players from gameState.playerStats (incl. offline)");
                      return players
                        .sort((a, b) => b.score - a.score) // Sort by score descending
                        .map(player => (
                          <tr 
                            key={player.id} 
                            className={player.id === localPlayerIdRef.current ? 'highlight-row' : ''}
                          >
                            <td>
                              <div>
                                <span 
                                  className="player-color-swatch" 
                                  style={{ backgroundColor: player.color }}
                                />
                                {player.name || player.id.substring(0, 6)} {player.id === localPlayerIdRef.current ? '(You)' : ''}
                              </div>
                            </td>
                            <td>
                              {player.score}
                            </td>
                            <td>
                              {player.deaths}
                            </td>
                            <td className={player.isConnected ? 'status-online' : 'status-offline'}>
                              {player.isConnected ? 'Online' : 'Offline'}
                            </td>
                          </tr>
                        ));
                    }
                    
                    // If playerStats is empty
                    return (
                      <tr>
                        <td colSpan={4}>
                          {isConnected ? 'Waiting for players...' : 'Connecting...'}
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Power-up Legend Section */}
      {isConnected && (
        <div className="info-section" id="powerup-legend">
          <h3>Power-Up Legend</h3>
          <ul>
            <li><span className="powerup-symbol speed">S</span> - Speed Boost: Temporarily increase your snake's speed.</li>
            <li><span className="powerup-symbol slow">W</span> - Slow Down: Temporarily decrease your snake's speed.</li>
            <li><span className="powerup-symbol invincibility">I</span> - Invincibility: Temporarily pass through other snakes and walls.</li>
            <li><span className="powerup-symbol double-score">2x</span> - Double Score: Temporarily earn double points for eating food.</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default App; 