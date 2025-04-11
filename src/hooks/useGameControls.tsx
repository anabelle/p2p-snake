import { useCallback, RefObject } from 'react';
import { Socket } from 'socket.io-client'; // Assuming Socket type from socket.io-client
import { Direction } from '../game/state/types';
import { useGameInput } from './useGameInput'; // Reuse the underlying input listener

/**
 * Hook to handle game input controls (keyboard/touch) and send corresponding
 * events via a WebSocket connection.
 *
 * @param socket The Socket.IO client instance.
 * @param isConnected Whether the socket is currently connected.
 * @param gameContainerRef Ref to the DOM element that should capture input events.
 */
export const useGameControls = (
  socket: Socket | null,
  isConnected: boolean,
  gameContainerRef: RefObject<HTMLDivElement>
) => {
  const handleDirectionChange = useCallback(
    (direction: Direction) => {
      if (socket && isConnected) {
        let inputToSend: { dx: number; dy: number } | null = null;
        switch (direction) {
          case Direction.UP:
            inputToSend = { dx: 0, dy: 1 };
            break;
          case Direction.DOWN:
            inputToSend = { dx: 0, dy: -1 };
            break;
          case Direction.LEFT:
            inputToSend = { dx: -1, dy: 0 };
            break;
          case Direction.RIGHT:
            inputToSend = { dx: 1, dy: 0 };
            break;
        }
        if (inputToSend) {
          // console.log(`useGameControls: Emitting input ${JSON.stringify(inputToSend)}`);
          socket.emit('input', inputToSend);
        }
      }
      // else {
      //   console.log(
      //     `useGameControls: Input ignored (socket: ${!!socket}, connected: ${isConnected})`
      //   );
      // }
    },
    [socket, isConnected] // Dependencies: socket instance and connection status
  );

  // Use the existing useGameInput hook to capture raw input
  useGameInput(gameContainerRef, handleDirectionChange);

  // This hook doesn't return anything, it just sets up the effect
};
