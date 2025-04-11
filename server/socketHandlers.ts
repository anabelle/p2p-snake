import { Server, Socket } from 'socket.io';
import { GameManager } from './gameManager';

interface ClientToServerEvents {
  // No need for 'join' if query params are used
  input: (inputData: { dx: number; dy: number }) => void;
  updateProfile: (data: { name?: string; color?: string }) => void;
  // disconnect is handled implicitly
}

interface ServerToClientEvents {
  'state-sync': (gameState: any) => void; // Replace 'any' with actual GameState type if possible
  error: (errorMessage: string) => void; // Add error event definition
  // Add other events if needed (e.g., 'player-joined', 'player-left')
}

interface InterServerEvents {
  // For server-to-server communication (if any)
}

interface SocketData {
  playerId: string;
  // Add any other custom data per socket
}

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  gameManager: GameManager
) {
  io.on(
    'connection',
    (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
      const playerId = socket.handshake.query.id as string;
      const playerName = socket.handshake.query.name as string;
      const playerColor = socket.handshake.query.color as string;

      // Validate connection parameters
      if (!playerId || !playerName || !playerColor) {
        console.warn('Connection attempt with missing query parameters.', socket.handshake.query);
        socket.disconnect(true);
        return;
      }

      console.log(`Player connected: ${playerName} (${playerId})`);
      socket.data.playerId = playerId; // Store playerId in socket data

      // Add player to the game manager
      gameManager.addPlayer(playerId, playerName, playerColor);

      // --- Event Handlers ---

      // Handle input from clients
      socket.on('input', (inputData) => {
        // Basic validation already done in GameManager.setPlayerInput
        gameManager.setPlayerInput(playerId, inputData);
        // console.log(`Input from ${playerId}:`, inputData); // Optional logging
      });

      // Handle Profile Updates (Queue the request via GameManager)
      socket.on('updateProfile', (data) => {
        // Trim and validate incoming data
        const name = data.name?.trim();
        const color = data.color?.trim();

        if (!name || !color) {
          console.warn(`Received updateProfile with missing name or color from ${playerId}`);
          socket.emit('error', 'Profile update requires name and color.'); // Inform client
          return;
        }

        const hexColorRegex = /^#[0-9A-F]{6}$/i;
        if (!hexColorRegex.test(color)) {
          console.warn(`Received invalid color format in updateProfile from ${playerId}:`, color);
          socket.emit('error', 'Invalid color format. Use #RRGGBB.'); // Inform client
          return;
        }

        // Queue the validated update
        gameManager.queueProfileUpdate({ playerId, name, color });
        // console.log(`Queued profile update for ${playerId}: Name=${name}, Color=${color}`); // Optional logging
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Player disconnected: ${playerName} (${playerId}). Reason: ${reason}`);
        gameManager.removePlayer(playerId);
        // No need to broadcast player left here, state-sync will reflect it
      });

      // --- Error Handling ---
      socket.on('error', (err) => {
        console.error(`Socket error for player ${playerId}:`, err);
        // Consider disconnecting the player on certain errors
      });
    }
  );

  // Potentially add io.use() for middleware (e.g., authentication)
}
