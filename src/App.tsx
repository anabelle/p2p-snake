import React, { useEffect, useRef, useState } from 'react';
import * as netplayjs from 'netplayjs'; // Re-add for type casting
import { NetplayAdapter } from './game/network/NetplayAdapter';
// Types might still be needed for state-sync
import { GameState, PlayerStats } from './game/state/types'; // Import PlayerStats
import io, { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { GRID_SIZE, PLAYER_COLORS } from './game/constants'; // Import GRID_SIZE and PLAYER_COLORS
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
        console.log('Loaded user profile from localStorage:', profile);
        return profile;
      }
    } catch (e) {
      console.error('Failed to parse user profile from localStorage:', e);
      localStorage.removeItem('snakeUserProfile'); // Clear invalid data
    }
  }

  // No valid profile found, create a new one
  console.log('No valid user profile found. Prompting for new profile...');
  const id = uuidv4();
  let name = prompt("Enter your name (leave blank for default):")?.trim() || '';
  let color = prompt(`Enter your preferred color hex (e.g., #33FF57) or leave blank for random:
Available: ${PLAYER_COLORS.join(', ')}`)?.trim() || '';

  // Validate or set defaults
  if (!name) {
    name = `Player_${id.substring(0, 4)}`; // Default name using part of UUID
    console.log(`Using default name: ${name}`);
  }

  // Basic hex color validation
  const hexColorRegex = /^#[0-9A-F]{6}$/i;
  if (!color || !hexColorRegex.test(color)) {
    color = getRandomPlayerColor(); // Default random color
     console.log(`Using random color: ${color}`);
  } else {
     console.log(`Using chosen color: ${color}`);
  }


  const newProfile: UserProfile = { id, name, color };
  localStorage.setItem('snakeUserProfile', JSON.stringify(newProfile));
  console.log('Created and saved new user profile:', newProfile);
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

  // Input Event Listeners (remains the same)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only process if connected? Maybe allow input buffering? For now, process always.
      console.log(`KEYDOWN Event: key=${event.key}`);
      let changed = false;
      let newState = { ...localInputStateRef.current };
      if (!pressedKeysRef.current.has(event.key)) {
          pressedKeysRef.current.add(event.key);
          // Map arrow keys to dx/dy for sending
          switch (event.key) {
              case 'ArrowUp':    newState = { dx: 0, dy: 1 }; changed = true; break;
              case 'ArrowDown':  newState = { dx: 0, dy: -1 }; changed = true; break;
              case 'ArrowLeft':  newState = { dx: -1, dy: 0 }; changed = true; break;
              case 'ArrowRight': newState = { dx: 1, dy: 0 }; changed = true; break;
          }
      }
      if (changed) {
          localInputStateRef.current = newState;
          console.log("KEYDOWN - Input Ref updated to:", localInputStateRef.current);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      console.log(`KEYUP Event: key=${event.key}`);
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
           console.log("KEYUP - Input Ref updated to:", localInputStateRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // Empty dependency array is correct here

  // --- Centralized WebSocket Logic ---
  useEffect(() => {
    // --- Load Profile FIRST ---
    const profile = loadUserProfile();
    userProfileRef.current = profile;
    localPlayerIdRef.current = profile.id; // Set the ref ID here
    // --- End Profile Loading ---

    const SIGNALING_SERVER_URI = 'ws://localhost:3001';
    console.log(`Local Player ID: ${localPlayerIdRef.current}, Name: ${profile.name}, Color: ${profile.color}`);

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
      console.log('Connected to signaling server');
      setIsConnected(true);
      // Optional: Emit join explicitly if needed by server logic beyond query param
      // socket.emit('join', { id: localPlayerIdRef.current });

      // Start the game adapter and rendering loop immediately upon connection
      if (!gameAdapterRef.current) {
        startGameAdapter();
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
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
        console.error('Signaling connection error:', err);
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
                    console.log(`Client: Adding missing stats for snake ${snake.id} from sync`);
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
                    console.log(`Client: Adding missing stats for snake ${snake.id} (stats existed)`);
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
                         console.log(`Client: Marking player ${pId} as disconnected (not in snakes)`);
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
            console.log(`Server assigned color ${playerStats.color}, updating local profile.`);
            userProfileRef.current = { ...userProfileRef.current!, color: playerStats.color };
            localStorage.setItem('snakeUserProfile', JSON.stringify(userProfileRef.current));
        }

        // Removed: gameAdapterRef.current.deserialize(...) call
    });

    // --- Game Adapter Initialization (Client-side only) ---
    const startGameAdapter = () => {
      console.log(`startGameAdapter called. gameContainerRef.current: ${!!gameContainerRef.current}`);
      if (!gameAdapterRef.current && gameContainerRef.current) {
        console.log("Initializing Client NetplayAdapter...");

        // Create canvas if it doesn't exist
        if (!canvasRef.current) {
          console.log("Creating canvas element...");
          const canvas = document.createElement('canvas');
          canvas.width = NetplayAdapter.canvasSize.width;
          canvas.height = NetplayAdapter.canvasSize.height;
          // Style canvas?
          // canvas.style.border = '1px solid lightgrey';
          gameContainerRef.current.appendChild(canvas);
          canvasRef.current = canvas;
          console.log("Canvas element created and appended.");
        }

        try {
          // Create adapter (constructor simplified in NetplayAdapter.ts)
          gameAdapterRef.current = new NetplayAdapter(canvasRef.current, localPlayerIdRef.current);
          console.log(`Client NetplayAdapter instance created.`);
        } catch (e) {
          console.error("Error creating NetplayAdapter instance:", e);
          return; // Don't start loop if adapter fails
        }

        console.log("Starting client game loop...");
        gameLoop(); // Start the loop *after* adapter is successfully created
      } else {
        console.log(`startGameAdapter did not proceed. Adapter: ${!!gameAdapterRef.current}, Container: ${!!gameContainerRef.current}`);
      }
    };

    // --- Game Loop (Client: Send Input, Draw Received State) ---
    const gameLoop = () => {
      // Ensure loop stops if component unmounts or disconnects
      if (!gameAdapterRef.current || !canvasRef.current || !socketRef.current?.connected) {
          console.log("Game loop stopping: Adapter, canvas, or socket missing/disconnected.");
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
        console.error("Error during gameAdapter.draw:", e);
        // Stop loop on draw error
        animationFrameRef.current = undefined;
        return;
      }

      // Request next frame
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    // Cleanup function for main useEffect
    return () => {
      console.log('Cleaning up App component...');
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
      console.log('Cleanup complete.');
    };
  }, []); // Main effect runs once on mount, cleanup on unmount

  // Effect to keep gameStateRef updated with the latest gameState
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Render function
  return (
    <div className="App">
      <h1>Central Server Snake Game</h1>
      <div>Status: {isConnected ? `Connected (${userProfileRef.current?.name || localPlayerIdRef.current})` : 'Disconnected'}</div>
      {/* Container for the game canvas */}
      <div ref={gameContainerRef} id="game-container" style={{
          marginTop: '20px',
          position: 'relative',
          width: NetplayAdapter.canvasSize.width,
          height: NetplayAdapter.canvasSize.height,
          border: '1px solid grey',
          backgroundColor: '#222' // Add a background color
          }}>
         {/* Canvas will be appended here dynamically */}
         {!isConnected && <div style={{color: 'white', textAlign: 'center', paddingTop: '50px'}}>Connecting...</div>}
      </div>
      
      {/* Player information display */}
      {isConnected && gameAdapterRef.current && (
        <div id="player-info-wrapper" style={{
          width: NetplayAdapter.canvasSize.width,
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#222',
          color: 'white',
          borderRadius: '5px',
          border: '1px solid #444',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ 
              marginTop: '0', 
              marginBottom: '10px',
              color: '#fff',
              borderBottom: '2px solid #444',
              paddingBottom: '5px'
            }}>Your Snake</h3>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ fontWeight: 'bold', marginRight: '10px' }}>Name:</div>
              <div style={{ marginRight: '20px' }}>
                  {/* Display name from profile ref or fallback */}
                  {userProfileRef.current?.name || localPlayerIdRef.current.substring(0, 6)}
              </div>
              <div style={{ fontWeight: 'bold', marginRight: '10px' }}>Color:</div>
              
              {/* Direct dynamic access to your snake info */}
              {(() => {
                // Try to find your snake in the game state
                const yourSnake = gameState.snakes.find(
                  snake => snake.id === localPlayerIdRef.current
                );
                
                if (yourSnake) {
                  return (
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: yourSnake.color,
                      border: '1px solid #fff'
                    }} />
                  );
                }
                
                // Fallback to playerStats
                const yourPlayerStats = gameState.playerStats?.[localPlayerIdRef.current];
                if (yourPlayerStats) {
                  return (
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: yourPlayerStats.color,
                      border: '1px solid #fff'
                    }} />
                  );
                }
                
                // If neither is available, show not spawned message
                return (
                  <span style={{ color: '#aaa', fontStyle: 'italic' }}>Not spawned yet</span>
                );
              })()}
            </div>
          </div>
          
          <h3 style={{ 
            marginBottom: '10px',
            color: '#fff',
            borderBottom: '2px solid #444',
            paddingBottom: '5px'
          }}>Player Rankings</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#333' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #555' }}>Player</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #555' }}>Score</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #555' }}>Deaths</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #555' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Get players from snakes or playerStats, whichever is available */}
              {(() => {
                // First check if we have snakes to display
                const snakes = gameState.snakes || [];
                
                if (snakes.length > 0) {
                  console.log("Rendering", snakes.length, "snakes from gameState");
                  return snakes
                    .sort((a, b) => b.score - a.score)
                    .map(snake => (
                      <tr key={snake.id} style={{ 
                        backgroundColor: snake.id === localPlayerIdRef.current ? '#3a4a5a' : 'transparent' 
                      }}>
                        <td style={{ 
                          padding: '8px', 
                          borderBottom: '1px solid #444',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <div style={{ 
                            width: '12px', 
                            height: '12px', 
                            backgroundColor: snake.color,
                            marginRight: '8px',
                            border: '1px solid #fff' 
                          }} />
                          {/* Display name from playerStats or fallback */}
                           {(() => {
                                const stats = gameState.playerStats?.[snake.id];
                                return stats?.name || (snake.id === localPlayerIdRef.current ? 'You' : snake.id.substring(0, 6));
                           })()}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #444' }}>
                          {snake.score}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #444' }}>
                          {/* Use gameState for playerStats */}
                          {gameState.playerStats?.[snake.id]?.deaths || 0}
                        </td>
                        <td style={{ 
                          padding: '8px', 
                          textAlign: 'center', 
                          borderBottom: '1px solid #444',
                          color: '#4caf50',
                          fontWeight: 'bold'
                        }}>
                          {/* Status from playerStats - use gameState */}
                          {gameState.playerStats?.[snake.id]?.isConnected ? 'Online' : 'Offline'}
                        </td>
                      </tr>
                    ));
                }
                
                // Fallback to playerStats if for some reason snakes aren't available
                const playerStats = gameState.playerStats || {};
                const players = Object.values(playerStats);
                
                if (players.length > 0) {
                  console.log("Rendering", players.length, "players from gameState.playerStats");
                  return players
                    .sort((a, b) => b.score - a.score)
                    .map(player => (
                      <tr key={player.id} style={{ 
                        backgroundColor: player.id === localPlayerIdRef.current ? '#3a4a5a' : 'transparent' 
                      }}>
                        <td style={{ 
                          padding: '8px', 
                          borderBottom: '1px solid #444',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <div style={{ 
                            width: '12px', 
                            height: '12px', 
                            backgroundColor: player.color,
                            marginRight: '8px',
                            border: '1px solid #fff' 
                          }} />
                          {/* Display name from playerStats or fallback */}
                          {player.name || (player.id === localPlayerIdRef.current ? 'You' : player.id.substring(0, 6))}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #444' }}>
                          {player.score}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #444' }}>
                          {player.deaths}
                        </td>
                        <td style={{ 
                          padding: '8px', 
                          textAlign: 'center', 
                          borderBottom: '1px solid #444',
                          color: player.isConnected ? '#4caf50' : '#f44336',
                          fontWeight: 'bold'
                        }}>
                          {player.isConnected ? 'Online' : 'Offline'}
                        </td>
                      </tr>
                    ));
                }
                
                // If we reach here, there are no players to display
                return (
                  <tr>
                    <td colSpan={4} style={{ padding: '8px', textAlign: 'center' }}>
                      {/* Conditional message based on connection status */}
                      {!isConnected ? 'Connecting...' : 'No players yet'}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default App; 