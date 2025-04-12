import { useCallback, RefObject } from 'react';
import { Socket } from 'socket.io-client';
import { Direction } from '../game/state/types';
import { useGameInput } from './useGameInput';

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
          socket.emit('input', inputToSend);
        }
      }
    },
    [socket, isConnected]
  );

  useGameInput(gameContainerRef, handleDirectionChange);
};
