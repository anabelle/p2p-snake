import { Server } from 'socket.io';
import { httpServer } from './httpServer';
import { GameManager } from './gameManager';
import { setupSocketHandlers } from './socketHandlers';
import { GAME_SPEED_MS } from '../src/game/constants';
import { GameState } from '../src/game/state/types';

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const gameManager = new GameManager();

setupSocketHandlers(io, gameManager);

const GAME_LOOP_INTERVAL_MS = GAME_SPEED_MS;

setInterval(() => {
  const newState: GameState | null = gameManager.runGameTick();

  if (newState) {
    io.emit('state-sync', newState);
  }
}, GAME_LOOP_INTERVAL_MS);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Signaling & Game Server listening on *:${PORT}`);
});

const signals = { SIGINT: 2, SIGTERM: 15 };

function shutdown(signal: keyof typeof signals, value: number) {
  io.close(() => {
    httpServer.close(() => {
      process.exit(128 + value);
    });
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcing shutdown');
    process.exit(1);
  }, 10000).unref();
}

Object.keys(signals).forEach((signal) => {
  process.on(signal as NodeJS.Signals, () =>
    shutdown(signal as keyof typeof signals, signals[signal as keyof typeof signals])
  );
});
