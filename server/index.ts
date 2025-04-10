import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
// Remove NetplayAdapter import - server manages state directly
// import { NetplayAdapter } from '../src/game/network/NetplayAdapter';
import { GameState, Direction } from '../src/game/state/types';
import { GAME_SPEED_MS, GRID_SIZE } from '../src/game/constants';
import { updateGame, PlayerInputs } from '../src/game/logic/gameRules'; // Need updateGame
import { generateFood } from '../src/game/logic/foodLogic'; // Need for initial food
import { getOccupiedPositions, mulberry32 } from '../src/game/logic/prng'; // Need for initial food

// --- Server Setup ---
const httpServer = createServer();
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

// Remove ShimPlayer and createShimPlayer - not needed without adapter
// interface ShimPlayer { getID: () => string; }
// const createShimPlayer = (id: string): ShimPlayer => ({ getID: () => id });

// --- Server-side Game Initialization ---
// Remove mockCanvas

function initializeGame() {
    console.log("Initializing server game state...");
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
        powerUpCounter: 0
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
    console.log("Server game state initialized.");
}

initializeGame(); // Initialize on server start

// --- Socket.IO Event Handlers ---
io.on('connection', (socket: Socket) => {
  const playerId = socket.handshake.query.id as string;
  if (!playerId) {
    console.warn('Player connected without ID. Disconnecting.');
    socket.disconnect(true);
    return;
  }

  console.log(`Player connected: ${playerId} (${socket.id})`);
  connectedPlayers.set(playerId, socket);
  playerInputs.set(playerId, { dx: 0, dy: 0 }); // Initialize input

  // Update player count in game state
  currentGameState.playerCount = connectedPlayers.size;

  // Handle join event - might not be needed if query.id is reliable
  // socket.on('join', (data) => { ... });

  // Handle input from clients
  socket.on('input', (inputData: { dx: number; dy: number }) => {
    // Basic validation
    if (connectedPlayers.has(playerId) && // Ensure player is still connected
        typeof inputData?.dx === 'number' && typeof inputData?.dy === 'number') {
      playerInputs.set(playerId, inputData);
      // console.log(`Received input from ${playerId}:`, inputData);
    } else {
        console.warn(`Invalid or late input received from ${playerId}:`, inputData);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${playerId} (${socket.id})`);
    connectedPlayers.delete(playerId);
    playerInputs.delete(playerId);
    // Update player count in game state immediately
    currentGameState.playerCount = connectedPlayers.size;
    // The updateGame logic will handle removing the snake when the player ID is missing
  });
});

// --- Server Game Loop ---
const GAME_LOOP_INTERVAL_MS = GAME_SPEED_MS; // Align with game logic speed
let lastTickTime = performance.now();

setInterval(() => {
    // if (!currentGameState) return; // Should always be initialized now
    if (connectedPlayers.size === 0) {
        // console.log("No players connected, skipping tick.");
        // Optional: Reset game? Pause?
        lastTickTime = performance.now(); // Reset timer if paused
        return;
    }

    const now = performance.now();
    const logicalTime = currentGameState.timestamp + (now - lastTickTime); // Use actual elapsed time?
    lastTickTime = now;

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

    // 2. Call updateGame directly
    try {
        currentGameState = updateGame(currentGameState, currentTickPlayerInputs, logicalTime, currentPlayerIDSet);
    } catch (e) {
        console.error("!!! Error during updateGame on server:", e);
        return; // Stop this tick on error
    }

    // 3. Broadcast the new state to all connected clients
    // Use io.emit for broadcast
    io.emit('state-sync', currentGameState);
    // console.log(`Tick ${currentGameState.sequence}: Sent state sync to ${connectedPlayers.size} players.`);

}, GAME_LOOP_INTERVAL_MS);

// --- Start Server ---
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Signaling & Game Server listening on *:${PORT}`);
}); 