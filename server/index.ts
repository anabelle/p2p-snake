import { Server } from 'socket.io';
import { httpServer } from './httpServer';
import { GameManager } from './gameManager';
import { setupSocketHandlers } from './socketHandlers';
import { GAME_SPEED_MS } from '../src/game/constants';
import { GameState } from '../src/game/state/types'; // Import GameState for type safety

// --- Server Setup ---
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST']
  }
});

// --- Game Initialization ---
const gameManager = new GameManager();

// --- Setup Socket Handlers ---
// We need to explicitly type io here if socketHandlers expects typed events
// However, let's keep it simple for now if the interfaces in socketHandlers are self-contained.
setupSocketHandlers(io, gameManager);

// --- Server Game Loop ---
const GAME_LOOP_INTERVAL_MS = GAME_SPEED_MS; // Align with game logic speed

setInterval(() => {
  // Run the game tick
  const newState: GameState | null = gameManager.runGameTick();

  // Broadcast the new state if it was updated
  if (newState) {
    io.emit('state-sync', newState);
    // Optional logging
    // const playerCount = gameManager.getPlayerCount();
    // if (playerCount > 0) {
    //   console.log(`Tick ${newState.sequence}: Sent state sync to ${playerCount} players.`);
    // }
  }
  // If newState is null, it means the tick was skipped (e.g., no players)
}, GAME_LOOP_INTERVAL_MS);

// --- Start Server ---
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Signaling & Game Server listening on *:${PORT}`); // Use a more descriptive log
});

// --- Graceful Shutdown (Optional but Recommended) ---
const signals = { SIGINT: 2, SIGTERM: 15 };

function shutdown(signal: keyof typeof signals, value: number) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  io.close(() => {
    console.log('Socket.IO server closed.');
    httpServer.close(() => {
      console.log('HTTP server closed.');
      process.exit(128 + value);
    });
  });

  // Force shutdown after a timeout
  setTimeout(() => {
    console.error('Could not close connections in time, forcing shutdown');
    process.exit(1);
  }, 10000).unref(); // 10 seconds timeout
}

Object.keys(signals).forEach((signal) => {
  process.on(signal as NodeJS.Signals, () =>
    shutdown(signal as keyof typeof signals, signals[signal as keyof typeof signals])
  );
});
