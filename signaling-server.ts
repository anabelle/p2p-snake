import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// --- Game Logic Imports ---
// NOTE: Adjust paths if your structure is different or if using compiled JS
// Using standard imports now. Ensure paths are correct relative to the compiled output
// or that your execution environment (like ts-node) handles TS paths.
import { GameState, Direction } from './src/game/state/types'; // Reverted path
import { updateGame, PlayerInputs } from './src/game/logic/gameRules'; // Reverted path
// import { NetplayAdapter } from './src/game/network/NetplayAdapter'; // Might only need constants/types, not the full class
import { generateNewSnake } from './src/game/logic/snakeLogic'; // Reverted path
import { getOccupiedPositions, mulberry32 } from './src/game/logic/prng'; // Reverted path
import { generateFood } from './src/game/logic/foodLogic'; // Reverted path
import { GRID_SIZE, GAME_SPEED_MS } from './src/game/constants'; // Reverted path

const app = express();
app.use(cors()); // Allow requests from your React app's origin

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity (adjust in production)
    methods: ["GET", "POST"]
  }
});

console.log("Signaling server starting...");

// --- Game State Management ---
let authoritativeState: GameState | null = null;
const clientInputs = new Map<string, { dx: number, dy: number }>(); // Map socket.id to latest input {dx, dy}
const players = new Map<string, { id: string }>(); // Map socket.id to player info { id } - using socket.id as player ID for now

function initializeGameState(): GameState {
    console.log("Initializing Authoritative Game State...");
    const initialSeed = Date.now(); // Use current time for variability on server restart
    const initialRandomFunc = mulberry32(initialSeed);
    const state: GameState = {
      snakes: [], // Start with no snakes, they join via 'join' event
      food: [],
      powerUps: [],
      activePowerUps: [],
      gridSize: GRID_SIZE,
      timestamp: performance.now(),
      sequence: 0,
      rngSeed: initialSeed,
      playerCount: 0,
      powerUpCounter: 0
    };

    // Initialize Food
    const occupiedInitial = getOccupiedPositions(state);
    const foodCount = 3;
    for (let i = 0; i < foodCount; i++) {
        const food = generateFood(state.gridSize, occupiedInitial, initialRandomFunc);
        if (food) {
            state.food.push(food);
            occupiedInitial.push(food.position);
        }
    }
    console.log("Initial food generated.");
    return state;
}

// Initialize state when server starts
authoritativeState = initializeGameState();

// --- Server-Side Game Loop ---
const GAME_LOOP_INTERVAL = GAME_SPEED_MS; // Run game logic at the game's intended speed
let lastTickTime = performance.now();

setInterval(() => {
    if (!authoritativeState) return; // Don't run if state isn't initialized

    const now = performance.now();
    // const logicalTime = authoritativeState.timestamp + GAME_LOOP_INTERVAL; // Keep this removed

    // 1. Prepare inputs for updateGame
    const currentTickInputs: PlayerInputs = new Map<string, Direction>();
    const currentPlayerIDs = new Set<string>(players.keys()); // Players currently connected

    clientInputs.forEach((input, playerId) => {
        let requestedDirection: Direction | null = null;
        if (input.dx === -1) requestedDirection = Direction.LEFT;
        else if (input.dx === 1) requestedDirection = Direction.RIGHT;
        else if (input.dy === 1) requestedDirection = Direction.UP; // Assuming +y is up based on client code
        else if (input.dy === -1) requestedDirection = Direction.DOWN; // Assuming -y is down

        if (requestedDirection !== null) {
            currentTickInputs.set(playerId, requestedDirection);
        }
    });
    // Clear inputs for next tick cycle (maybe do this after update?)
    // clientInputs.clear(); // Let's clear AFTER processing to keep last known input if none sent

    // 2. Run the simulation tick
    try {
        // console.log("SERVER TICK: Running updateGame. Current Players:", currentPlayerIDs, "Inputs:", currentTickInputs);
        // Keep the fixed interval passed to updateGame
        authoritativeState = updateGame(authoritativeState, currentTickInputs, GAME_LOOP_INTERVAL, currentPlayerIDs);
        // console.log("SERVER TICK: State after update:", authoritativeState);
    } catch (e) {
        console.error("SERVER TICK: Error during updateGame:", e);
        // Potentially reset state or handle error gracefully
        return; 
    }

    // 3. Broadcast the new state to all clients
    io.emit('state-sync', authoritativeState);

    lastTickTime = now;

}, GAME_LOOP_INTERVAL);


// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Store player info (using socket.id as player ID)
  players.set(socket.id, { id: socket.id });
  console.log(`Player added: ${socket.id}. Total players: ${players.size}`);
  clientInputs.set(socket.id, { dx: 0, dy: 0 }); // Initialize input buffer

  // --- Event: 'join' (Client signals readiness) ---
  // We don't need explicit 'join' anymore, connection implies joining the game.
  // Send the current state immediately on connection.
  if (authoritativeState) {
      console.log(`Sending initial state to ${socket.id}`);
      socket.emit('state-sync', authoritativeState);
  } else {
      console.warn(`Cannot send initial state to ${socket.id}, state not initialized.`);
  }


  // --- Event: 'input' (Client sends its input state) ---
  socket.on('input', (inputData: { dx: number, dy: number }) => {
    // console.log(`Received input from ${socket.id}:`, inputData);
    // Validate inputData if necessary
    if (inputData && typeof inputData.dx === 'number' && typeof inputData.dy === 'number') {
        clientInputs.set(socket.id, inputData);
    } else {
        console.warn(`Invalid input received from ${socket.id}:`, inputData);
    }
  });

  // --- Event: 'disconnect' ---
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}. Reason: ${reason}`);
    // Remove player and their input buffer
    players.delete(socket.id);
    clientInputs.delete(socket.id);
    console.log(`Player removed: ${socket.id}. Remaining players: ${players.size}`);
    
    // The game logic in updateGame will handle removing the snake
    // when the player ID is no longer in currentPlayerIDs set passed to it.
  });

  // --- REMOVED P2P Signaling Events ---
  // socket.on('join', ...) - Replaced by connect logic
  // socket.on('signal', ...) - Removed
  // socket.on('disconnect', ...) - Kept for cleanup
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});

// Basic error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 