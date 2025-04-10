import React, { useEffect, useRef, useState } from 'react';
import * as netplayjs from 'netplayjs'; // Re-add for type casting
import { NetplayAdapter } from './game/network/NetplayAdapter';
// Types might still be needed for state-sync
import { GameState, PlayerStats } from './game/state/types'; // Import PlayerStats
import io, { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { GRID_SIZE, PLAYER_COLORS, CELL_SIZE } from './game/constants'; // Import GRID_SIZE and PLAYER_COLORS
import { generateRandomColor } from './game/logic/prng'; // Import random color generator

// Define the user profile structure
interface UserProfile {
  id: string;
  name: string;
  color: string;
}

// Function to get a random color from the predefined list
const getRandomPlayerColor = (): string => {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
};

// Function to load or create user profile
const loadUserProfile = (): UserProfile => {
  const storedProfile = localStorage.getItem('snakeUserProfile');
  if (storedProfile) {
    try {
      const profile = JSON.parse(storedProfile);
      // Basic validation
      if (profile.id && profile.name && profile.color) {
        // console.log('Loaded user profile from localStorage:', profile);
        return profile;
      }
    } catch (e) {
      console.error('Failed to parse user profile from localStorage:', e); // Keep console.error
      localStorage.removeItem('snakeUserProfile'); // Clear invalid data
    }
  }

  // No valid profile found, create a new one
  // console.log('No valid user profile found. Prompting for new profile...');
  const id = uuidv4();
  let name = prompt("Enter your name (leave blank for default):")?.trim() || '';
  let color = prompt(`Enter your preferred color hex (e.g., #33FF57) or leave blank for random:
Available: ${PLAYER_COLORS.join(', ')}`)?.trim() || '';

  // Validate or set defaults
  if (!name) {
    name = `Player_${id.substring(0, 4)}`; // Default name using part of UUID
    // console.log(`Using default name: ${name}`);
  }

  // Basic hex color validation
  const hexColorRegex = /^#[0-9A-F]{6}$/i;
  if (!color || !hexColorRegex.test(color)) {
    color = getRandomPlayerColor(); // Default random color
     // console.log(`Using random color: ${color}`);
  } else {
     // console.log(`Using chosen color: ${color}`);
  }


  const newProfile: UserProfile = { id, name, color };
  localStorage.setItem('snakeUserProfile', JSON.stringify(newProfile));
  // console.log('Created and saved new user profile:', newProfile);
  return newProfile;
};


const App: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  // Core component refs
  const socketRef = useRef<Socket | null>(null);
  const localPlayerIdRef = useRef<string>(''); // Will be set from profile
  const userProfileRef = useRef<UserProfile | null>(null); // Store the loaded profile
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

  // Input State (remains the same)
  const localInputStateRef = useRef({ dx: 0, dy: 0 });
  const pressedKeysRef = useRef<Set<string>>(new Set());
  // State for touch controls
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);

  // Input Event Listeners
  useEffect(() => {
    // --- Keyboard Listeners ---
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only process if connected? Maybe allow input buffering? For now, process always.
      // console.log(`KEYDOWN Event: key=${event.key}`);
      let changed = false;
      let newState = { ...localInputStateRef.current };
      let isArrowKey = false;
      if (!pressedKeysRef.current.has(event.key)) {
          pressedKeysRef.current.add(event.key);
          // Map arrow keys to dx/dy for sending
          switch (event.key) {
              case 'ArrowUp':    newState = { dx: 0, dy: 1 }; changed = true; isArrowKey = true; break;
              case 'ArrowDown':  newState = { dx: 0, dy: -1 }; changed = true; isArrowKey = true; break;
              case 'ArrowLeft':  newState = { dx: -1, dy: 0 }; changed = true; isArrowKey = true; break;
              case 'ArrowRight': newState = { dx: 1, dy: 0 }; changed = true; isArrowKey = true; break;
          }
      }
      if (changed) {
          localInputStateRef.current = newState;
          // console.log("KEYDOWN - Input Ref updated to:", localInputStateRef.current);
      }

      // Prevent default scrolling behavior for arrow keys
      if (isArrowKey) {
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // console.log(`KEYUP Event: key=${event.key}`);
      let changed = false;
      let newState = { dx: 0, dy: 0 }; // Default to no movement on key up

      if (pressedKeysRef.current.has(event.key)) {
          pressedKeysRef.current.delete(event.key);
          changed = true; // Input definitely changed

          // Check remaining pressed keys to determine current direction
          if (pressedKeysRef.current.has('ArrowLeft')) newState.dx = -1;
          else if (pressedKeysRef.current.has('ArrowRight')) newState.dx = 1;

          if (pressedKeysRef.current.has('ArrowUp')) newState.dy = 1;
          else if (pressedKeysRef.current.has('ArrowDown')) newState.dy = -1;

           // Prevent diagonal by prioritizing horizontal if both are pressed? Or let server decide?
           // Let's prioritize last pressed or stick with combined for now, server logic handles it.
           if (newState.dx !== 0 && newState.dy !== 0) {
               // Simple priority: Last key pressed might still be held. If arrow up/down was just released, horizontal takes precedence if held.
               if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                  if(pressedKeysRef.current.has('ArrowLeft') || pressedKeysRef.current.has('ArrowRight')) newState.dy = 0;
               } else { // Left/Right released
                  if(pressedKeysRef.current.has('ArrowUp') || pressedKeysRef.current.has('ArrowDown')) newState.dx = 0;
               }
           }

      }

      // Update ref only if the resulting state is different from current
      // Or always update on keyup to signal "stop"? Let's always update for now.
      if (changed) {
           localInputStateRef.current = newState;
           // console.log("KEYUP - Input Ref updated to:", localInputStateRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

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
          detectedDirection = { dx: 0, dy: -1 }; // Down (screen coordinates)
        } else if (angle >= 135 || angle < -135) {
          detectedDirection = { dx: -1, dy: 0 }; // Left
        } else if (angle >= -135 && angle < -45) {
          detectedDirection = { dx: 0, dy: 1 }; // Up (screen coordinates)
        }

        if (detectedDirection) {
          // Don't allow reversing direction immediately
          const currentInput = localInputStateRef.current;
          const isOpposite =
                (detectedDirection.dx !== 0 && detectedDirection.dx === -currentInput.dx) ||
                (detectedDirection.dy !== 0 && detectedDirection.dy === -currentInput.dy);

          if (!isOpposite) {
              localInputStateRef.current = detectedDirection;
               console.log("SWIPE Detected - Angle:", angle, " Direction:", detectedDirection);
          } else {
              console.log("SWIPE Ignored - Opposite direction");
          }
        } else {
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
      window.removeEventListener('keyup', handleKeyUp);
      if (gameArea) {
        console.log("Removing touch listeners...");
        gameArea.removeEventListener('touchstart', handleTouchStart);
        gameArea.removeEventListener('touchmove', handleTouchMove);
        gameArea.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [canvasHeight, canvasWidth]); // Re-run if canvas size changes to re-attach listeners

  // --- Centralized WebSocket Logic ---
  useEffect(() => {
    // --- Load Profile FIRST ---
    const profile = loadUserProfile();
    userProfileRef.current = profile;
    localPlayerIdRef.current = profile.id; // Set the ref ID here
    // --- End Profile Loading ---

    const SIGNALING_SERVER_URI = 'ws://localhost:3001';
    // console.log(`Local Player ID: ${localPlayerIdRef.current}, Name: ${profile.name}, Color: ${profile.color}`);

    // Connect to server, sending ID, Name, and Color
    socketRef.current = io(SIGNALING_SERVER_URI, {
      query: {
        id: profile.id,
        name: profile.name,
        color: profile.color
      }
    });
    const socket = socketRef.current;

    socket.on('connect', () => {
      // console.log('Connected to signaling server');
      setIsConnected(true);
      // Optional: Emit join explicitly if needed by server logic beyond query param
      // socket.emit('join', { id: localPlayerIdRef.current });

      // Start the game adapter and rendering loop immediately upon connection
      if (!gameAdapterRef.current) {
        startGameAdapter();
      }
    });

    socket.on('disconnect', () => {
      // console.log('Disconnected from signaling server');
      setIsConnected(false);
      // Stop the game loop on disconnect
      if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = undefined;
      }
      // Optionally clear adapter/canvas refs?
      gameAdapterRef.current = null;
      if (canvasRef.current) {
         canvasRef.current.remove();
         canvasRef.current = null;
      }
    });

    socket.on('connect_error', (err) => {
        console.error('Signaling connection error:', err); // Keep console.error
        setIsConnected(false);
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

        // Update React state to trigger re-render
        setGameState(serverState);

        // Update user profile color if server assigned a different one
        const playerStats = serverState.playerStats?.[localPlayerIdRef.current];
        if (playerStats && playerStats.color !== userProfileRef.current?.color) {
            // console.log(`Server assigned color ${playerStats.color}, updating local profile.`);
            userProfileRef.current = { ...userProfileRef.current!, color: playerStats.color };
            localStorage.setItem('snakeUserProfile', JSON.stringify(userProfileRef.current));
        }

        // Removed: gameAdapterRef.current.deserialize(...) call
    });

    // --- Game Adapter Initialization (Client-side only) ---
    const startGameAdapter = () => {
      // console.log(`startGameAdapter called. gameContainerRef.current: ${!!gameContainerRef.current}`);
      if (!gameAdapterRef.current && gameContainerRef.current) {
        // console.log("Initializing Client NetplayAdapter...");

        // Create canvas if it doesn't exist
        if (!canvasRef.current) {
          // console.log("Creating canvas element...");
          const canvas = document.createElement('canvas');
          // Use calculated dimensions
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          // Style canvas?
          // canvas.style.border = '1px solid lightgrey';
          gameContainerRef.current.appendChild(canvas);
          canvasRef.current = canvas;
          // console.log("Canvas element created and appended.");
        }

        try {
          // Create adapter (constructor simplified in NetplayAdapter.ts)
          gameAdapterRef.current = new NetplayAdapter(canvasRef.current, localPlayerIdRef.current);
          // console.log(`Client NetplayAdapter instance created.`);
        } catch (e) {
          console.error("Error creating NetplayAdapter instance:", e); // Keep console.error
          return; // Don't start loop if adapter fails
        }

        // console.log("Starting client game loop...");
        gameLoop(); // Start the loop *after* adapter is successfully created
      } else {
        // console.log(`startGameAdapter did not proceed. Adapter: ${!!gameAdapterRef.current}, Container: ${!!gameContainerRef.current}`);
      }
    };

    // --- Game Loop (Client: Send Input, Draw Received State) ---
    const gameLoop = () => {
      // Ensure loop stops if component unmounts or disconnects
      if (!gameAdapterRef.current || !canvasRef.current || !socketRef.current?.connected) {
          // console.log("Game loop stopping: Adapter, canvas, or socket missing/disconnected.");
          animationFrameRef.current = undefined; // Clear ref
          return;
      }

      // 1. Send Local Input State to SERVER
      const currentLocalInput = localInputStateRef.current;
      socketRef.current.emit('input', currentLocalInput); // Send { dx, dy }

      // 2. Client does NOT tick the simulation.

      // 3. Draw the current state (updated by state-sync messages)
      // Read gameState from the ref for the most up-to-date value
      try {
        // Pass gameState from the ref to draw function
        gameAdapterRef.current.draw(canvasRef.current, gameStateRef.current);
      } catch (e) {
        console.error("Error during gameAdapter.draw:", e); // Keep console.error
        // Stop loop on draw error
        animationFrameRef.current = undefined;
        return;
      }

      // Request next frame
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    // Cleanup function for main useEffect
    return () => {
      // console.log('Cleaning up App component...');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      // Disconnect WebSocket
      socketRef.current?.disconnect();
      socketRef.current = null;
      // Clear refs
      gameAdapterRef.current = null;
      canvasRef.current = null; // Still clear the ref
      // console.log('Cleanup complete.');
    };
  }, []); // Main effect runs once on mount, cleanup on unmount

  // Effect to keep gameStateRef updated with the latest gameState
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Render function
  return (
    <div className="game-container">
      <h1>Multiplayer Snake Game</h1>

      <div ref={gameContainerRef} id="game-canvas-container" style={{
          width: canvasWidth,
          height: canvasHeight,
          position: 'relative',
        }}>
         {!isConnected && 
            <div style={{
              width: '100%', height: '100%', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', 
              backgroundColor: 'var(--card-bg-color)', borderRadius: '8px' 
            }}>
                Connecting...
            </div>
         }
      </div>
      
      {isConnected && gameAdapterRef.current && (
        <>
          <div className="info-section" id="your-snake-info">
            <h3>Your Snake</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span><strong>Name:</strong> {userProfileRef.current?.name || localPlayerIdRef.current.substring(0, 6)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong>Color:</strong>
                {(() => {
                  const yourPlayerStats = gameState.playerStats?.[localPlayerIdRef.current];
                  const color = yourPlayerStats?.color;

                  if (color) {
                    return (
                      <span 
                        className="player-color-swatch" 
                        style={{ backgroundColor: color }} 
                      />
                    );
                  } else {
                     // Check snake state as fallback if stats somehow missing color initially
                     const yourSnake = gameState.snakes.find(snake => snake.id === localPlayerIdRef.current);
                     if (yourSnake?.color) {
                      return (
                         <span 
                           className="player-color-swatch" 
                           style={{ backgroundColor: yourSnake.color }} 
                         />
                      );
                     }
                  }
                  
                  return (
                    <span style={{ color: 'var(--text-color)', opacity: 0.7, fontStyle: 'italic' }}> (Waiting...)</span>
                  );
                })()}
              </div>
            </div>
            <div id="active-powerups" style={{ marginTop: '0.5rem' }}>
              <strong>Active Effects:</strong>
              {(() => {
                // --- Add Debug Logging ---
                console.log("Checking active power-ups:");
                console.log("  Raw activePowerUps from state:", gameState.activePowerUps);
                console.log("  Local Player ID:", localPlayerIdRef.current);
                console.log("  Server Timestamp:", gameState.timestamp);
                // --- End Debug Logging ---

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

                console.log("  Filtered Active Power-ups for local player:", active);

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
                    // Wrap icon and text in a div for better layout control if needed
                    <div key={ap.type} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
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
                    <th style={{ textAlign: 'center' }}>Score</th>
                    <th style={{ textAlign: 'center' }}>Deaths</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
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
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span 
                                  className="player-color-swatch" 
                                  style={{ backgroundColor: player.color }}
                                />
                                {player.name || player.id.substring(0, 6)} {player.id === localPlayerIdRef.current ? '(You)' : ''}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {player.score}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {player.deaths}
                            </td>
                            <td style={{ textAlign: 'center' }} className={player.isConnected ? 'status-online' : 'status-offline'}>
                              {player.isConnected ? 'Online' : 'Offline'}
                            </td>
                          </tr>
                        ));
                    }
                    
                    // If playerStats is empty
                    return (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', fontStyle: 'italic', opacity: 0.7 }}>
                          {isConnected ? 'Waiting for players...' : 'Connecting...'}
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
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