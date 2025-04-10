import { Server, Socket } from 'socket.io';
import { createServer, IncomingMessage, ServerResponse } from 'http';
// Remove NetplayAdapter import - server manages state directly
// import { NetplayAdapter } from '../src/game/network/NetplayAdapter';
import { GameState, Direction, PlayerStats } from '../src/game/state/types';
import { GAME_SPEED_MS, GRID_SIZE } from '../src/game/constants';
import { updateGame, PlayerInputs } from '../src/game/logic/gameRules'; // Need updateGame
import { generateFood } from '../src/game/logic/foodLogic'; // Need for initial food
import { getOccupiedPositions, mulberry32 } from '../src/game/logic/prng'; // Need for initial food
import { AI_SNAKE_ID } from '../src/game/logic/aiSnake'; // Import AI snake ID

// --- Server Setup ---
// Create HTTP server with request handler for browser redirects
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Check if it's a browser request to the root URL
  if (req.url === '/' || req.url === '') {
    const userAgent = req.headers['user-agent'] || '';
    // Redirect browsers to the main game site
    if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
      res.writeHead(302, {
        'Location': 'https://snake.huellaspyp.com'
      });
      res.end();
      return;
    }
  }
  
  // For all other requests (including Socket.IO), proceed normally
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"]
  }
});

// --- Game State Management ---
// Remove serverAdapter
let currentGameState: GameState;
const connectedPlayers = new Map<string, Socket>(); // Map player ID to Socket instance
const playerInputs = new Map<string, { dx: number; dy: number }>(); // Map player ID to last input {dx, dy}

// --- Queue for pending profile updates ---
interface ProfileUpdate { 
  playerId: string;
  name: string;
  color: string;
}
const profileUpdateQueue: ProfileUpdate[] = [];

// Remove ShimPlayer and createShimPlayer - not needed without adapter
// interface ShimPlayer { getID: () => string; }
// const createShimPlayer = (id: string): ShimPlayer => ({ getID: () => id });

// --- Server-side Game Initialization ---
// Remove mockCanvas

function initializeGame() {
    // Create initial state directly
    const initialSeed = Date.now(); // Use time for initial seed
    const initialRandomFunc = mulberry32(initialSeed);
    const initialState: GameState = {
        snakes: [], // Start with no snakes, added by updateGame on first input
        food: [],
        powerUps: [],
        activePowerUps: [],
        gridSize: GRID_SIZE,
        timestamp: performance.now(), // Initial timestamp
        sequence: 0,
        rngSeed: initialSeed,
        playerCount: 0, // Will be updated dynamically
        powerUpCounter: 0,
        playerStats: {} // Initialize with empty player stats object
    };

    // Add AI snake to player stats to ensure it's always created
    initialState.playerStats[AI_SNAKE_ID] = {
        id: AI_SNAKE_ID,
        name: "AI Snake",
        color: "#FF5500", // Consistent color for AI
        score: 0,
        deaths: 0,
        isConnected: true
    };

    // Generate initial food
    const occupiedInitial = getOccupiedPositions(initialState);
    const foodCount = 3;
    for (let i = 0; i < foodCount; i++) {
        const food = generateFood(initialState.gridSize, occupiedInitial, initialRandomFunc);
        if (food) {
            initialState.food.push(food);
            occupiedInitial.push(food.position);
        }
    }
    // Update seed if food generation used RNG
    initialState.rngSeed = initialRandomFunc() * 4294967296;

    currentGameState = initialState;
    
    // Force an initial game tick to ensure AI snake is created immediately
    const emptyInputs = new Map<string, Direction>();
    const emptyPlayerSet = new Set<string>();
    currentGameState = updateGame(currentGameState, emptyInputs, currentGameState.timestamp, emptyPlayerSet);
}

initializeGame(); // Initialize on server start

// --- Socket.IO Event Handlers ---
io.on('connection', (socket: Socket) => {
  const playerId = socket.handshake.query.id as string;
  const playerName = socket.handshake.query.name as string; // Read name
  const playerColor = socket.handshake.query.color as string; // Read color

  if (!playerId || !playerName || !playerColor) { // Validate all are present
    socket.disconnect(true);
    return;
  }

  connectedPlayers.set(playerId, socket);
  playerInputs.set(playerId, { dx: 0, dy: 0 }); // Initialize input

  // Update player count in game state
  currentGameState.playerCount = connectedPlayers.size;

  // Initialize or update playerStats, including name and preferred color
  if (!currentGameState.playerStats) {
      currentGameState.playerStats = {}; // Ensure playerStats exists
  }

  if (currentGameState.playerStats[playerId]) {
    currentGameState.playerStats[playerId] = {
      ...currentGameState.playerStats[playerId],
      isConnected: true,
      name: playerName // Update name in case it changed
      // Color is handled by generateNewSnake or player preference later
    };
  } else {
     // Initial stats for a completely new player
     currentGameState.playerStats[playerId] = {
         id: playerId,
         name: playerName,
         color: playerColor, // Store preferred color
         score: 0,
         deaths: 0,
         isConnected: true
     };
  }

  // Handle join event - might not be needed if query.id is reliable
  // socket.on('join', (data) => { ... });

  // Handle input from clients
  socket.on('input', (inputData: { dx: number; dy: number }) => {
    // Basic validation
    if (connectedPlayers.has(playerId) && // Ensure player is still connected
        typeof inputData?.dx === 'number' && typeof inputData?.dy === 'number') {
      playerInputs.set(playerId, inputData);
      // //console.log(`Received input from ${playerId}:`, inputData);
    } else {
    }
  });

  // --- Handle Profile Updates (Queue the request) --- 
  socket.on('updateProfile', (data: { name?: string; color?: string }) => {
    // Validate data and player existence
    if (!currentGameState.playerStats || !currentGameState.playerStats[playerId]) {
        //console.warn(`Received updateProfile from unknown or disconnected player: ${playerId}`);
        return;
    }
    // Validate incoming data structure and types
    if (!data || typeof data.name !== 'string' || typeof data.color !== 'string') {
        //console.warn(`Received invalid updateProfile data structure from ${playerId}:`, data);
        return;
    }
    const newName = data.name.trim();
    const newColor = data.color.trim(); // Trim color too just in case

    // Validate non-empty name and color format
    if (!newName || !newColor) {
        //console.warn(`Received empty name or color in updateProfile from ${playerId}:`, data);
        return;
    }
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    if (!hexColorRegex.test(newColor)) {
        //console.warn(`Received invalid color format in updateProfile from ${playerId}:`, newColor);
        return; // Reject invalid color
    }

    // Add validated update to the queue
    profileUpdateQueue.push({ playerId, name: newName, color: newColor });

    // // --- OLD CODE: Don't update state directly here --- 
    // const currentStats = currentGameState.playerStats[playerId];
    // let updated = false;
    // if (currentStats.name !== newName) {
    //     currentStats.name = newName;
    //     updated = true;
    // }
    // if (currentStats.color !== newColor) {
    //     currentStats.color = newColor;
    //     updated = true;
    //     // Also update the active snake's color if it exists
    //     const snake = currentGameState.snakes.find(s => s.id === playerId);
    //     if (snake) {
    //         snake.color = newColor;
    //     }
    // }
    // if (updated) { ... } else { ... }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    connectedPlayers.delete(playerId);
    playerInputs.delete(playerId);
    
    // Update player count in game state immediately
    currentGameState.playerCount = connectedPlayers.size;
    
    // Mark player as disconnected in playerStats but keep their data
    if (currentGameState.playerStats && currentGameState.playerStats[playerId]) {
      currentGameState.playerStats[playerId] = {
        ...currentGameState.playerStats[playerId],
        isConnected: false
      };
    }
    
    // The updateGame logic will handle removing the snake when the player ID is missing
  });
});

// --- Server Game Loop ---
const GAME_LOOP_INTERVAL_MS = GAME_SPEED_MS; // Align with game logic speed
let lastTickTime = performance.now();

setInterval(() => {
    // if (!currentGameState) return; // Should always be initialized now
    if (connectedPlayers.size === 0) {
        // Don't skip ticks even with no human players
        // AI snake should keep running for when players connect
        // Just update the timestamp
        lastTickTime = performance.now();
        
        // Still run the game tick with empty player set
        const now = performance.now();
        const logicalTime = currentGameState.timestamp + (now - lastTickTime);
        lastTickTime = now;
        
        // Run with empty inputs but ensure AI snake is kept
        const emptyInputs = new Map<string, Direction>();
        const emptyPlayerSet = new Set<string>();
        currentGameState = updateGame(currentGameState, emptyInputs, logicalTime, emptyPlayerSet);
        return;
    }

    const now = performance.now();
    const logicalTime = currentGameState.timestamp + (now - lastTickTime); // Use actual elapsed time?
    lastTickTime = now;

    // --- Process Profile Update Queue --- 
    if (profileUpdateQueue.length > 0) {
        profileUpdateQueue.forEach(update => {
            if (currentGameState.playerStats && currentGameState.playerStats[update.playerId]) {
                const stats = currentGameState.playerStats[update.playerId];
                let updated = false;
                if (stats.name !== update.name) {
                    stats.name = update.name;
                    updated = true;
                }
                if (stats.color !== update.color) {
                    stats.color = update.color;
                    // Also update the active snake's color if it exists
                    const snake = currentGameState.snakes.find(s => s.id === update.playerId);
                    if (snake) {
                        snake.color = update.color;
                    }
                    updated = true;
                }
                if (updated) {
                     //console.log(`Applied queued update for ${update.playerId}: Name=${update.name}, Color=${update.color}`);
                }
            } else {
                 //console.warn(`Skipping queued update for unknown/disconnected player: ${update.playerId}`);
            }
        });
        // Clear the queue after processing
        profileUpdateQueue.length = 0; 
    }

    // 1. Prepare inputs map for updateGame
    const currentTickPlayerInputs: PlayerInputs = new Map();
    const currentPlayerIDSet = new Set(connectedPlayers.keys());

    playerInputs.forEach((input, pId) => {
        // Convert {dx, dy} to Direction enum expected by updateGame
        let requestedDirection: Direction | null = null;
        if (input.dx === -1) requestedDirection = Direction.LEFT;
        else if (input.dx === 1) requestedDirection = Direction.RIGHT;
        else if (input.dy === 1) requestedDirection = Direction.UP;
        else if (input.dy === -1) requestedDirection = Direction.DOWN;

        if (requestedDirection !== null) {
             currentTickPlayerInputs.set(pId, requestedDirection);
        }
        // Optional: Clear playerInputs map here? Or let them persist until next update?
        // Let's clear after processing for this tick
        // playerInputs.delete(pId); // No, keep last known input
    });

    // 2. Call updateGame directly (with state potentially modified by queue processing)
    try {
        const stateBeforeUpdate = currentGameState; // Keep ref for potential error logging
        currentGameState = updateGame(currentGameState, currentTickPlayerInputs, logicalTime, currentPlayerIDSet);
        
        // Debug check - log player stats if empty but players are connected
        if (Object.keys(currentGameState.playerStats).length === 0 && currentPlayerIDSet.size > 0) {
            //console.log("WARNING: playerStats is empty but we have players:", currentPlayerIDSet.size);
            
            // Force initialize playerStats from snakes if missing
            if (currentGameState.snakes.length > 0) {
                const updatedPlayerStats = { ...currentGameState.playerStats };
                currentGameState.snakes.forEach(snake => {
                    if (!updatedPlayerStats[snake.id]) {
                        // Initialize missing player
                        const playerSocket = Array.from(connectedPlayers.values()).find(s => s.handshake.query.id === snake.id);
                        const nameFromQuery = playerSocket?.handshake.query.name as string || `Player_${snake.id.substring(0, 4)}`;
                        const colorFromQuery = playerSocket?.handshake.query.color as string || snake.color;

                        updatedPlayerStats[snake.id] = {
                            id: snake.id,
                            name: nameFromQuery, // Get name from connection query if possible
                            color: colorFromQuery, // Get preferred color or snake color
                            score: snake.score,
                            deaths: 0,
                            isConnected: currentPlayerIDSet.has(snake.id)
                        };
                        //console.log(`Added missing player stats for ${snake.id} (Name: ${nameFromQuery})`);
                    }
                });
                currentGameState.playerStats = updatedPlayerStats;
            }
        }
    } catch (e) {
        console.error("!!! Error during updateGame on server:", e);
        // Consider reverting state or logging the state before update
        // console.error("State before error:", stateBeforeUpdate);
        return; // Stop this tick on error
    }

    // 3. Broadcast the new state to all connected clients
    io.emit('state-sync', currentGameState);
    // //console.log(`Tick ${currentGameState.sequence}: Sent state sync to ${connectedPlayers.size} players.`);

}, GAME_LOOP_INTERVAL_MS);

// --- Start Server ---
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  //console.log(`Signaling & Game Server listening on *:${PORT}`);
}); 