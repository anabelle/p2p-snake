import { Server, Socket } from 'socket.io';
import { GameManager } from './gameManager';

interface ClientToServerEvents {
  input: (inputData: { dx: number; dy: number }) => void;
  updateProfile: (data: { name?: string; color?: string }) => void;
}

interface ServerToClientEvents {
  'state-sync': (gameState: any) => void;
  error: (errorMessage: string) => void;
}

interface InterServerEvents {}

interface SocketData {
  playerId: string;
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

      if (!playerId || !playerName || !playerColor) {
        
        socket.disconnect(true);
        return;
      }

      socket.data.playerId = playerId;

      gameManager.addPlayer(playerId, playerName, playerColor);

      socket.on('input', (inputData) => {
        gameManager.setPlayerInput(playerId, inputData);
      });

      socket.on('updateProfile', (data) => {
        const name = data.name?.trim();
        const color = data.color?.trim();

        if (!name || !color) {
          
          socket.emit('error', 'Profile update requires name and color.');
          return;
        }

        const hexColorRegex = /^#[0-9A-F]{6}$/i;
        if (!hexColorRegex.test(color)) {
          
          socket.emit('error', 'Invalid color format. Use #RRGGBB.');
          return;
        }

        gameManager.queueProfileUpdate({ playerId, name, color });
      });

      socket.on('disconnect', (reason) => {
        gameManager.removePlayer(playerId);
      });

      socket.on('error', (err) => {
        
      });
    }
  );
}
