import { useState, useRef, useCallback, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';
import { GameState } from '../game/state/types';
import { UserProfile } from '../types';
import logger from '../utils/logger';

interface UseWebSocketReturn {
  isConnected: boolean;
  socket: Socket | null;
  latestGameState: GameState | null;
  connect: (profile: UserProfile) => void;
  disconnect: () => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [latestGameState, setLatestGameState] = useState<GameState | null>(null);
  const gameStateRef = useRef<GameState | null>(latestGameState);

  useEffect(() => {
    gameStateRef.current = latestGameState;
  }, [latestGameState]);

  const connect = useCallback((profile: UserProfile) => {
    if (socketRef.current) {
      logger.debug('WebSocket already connected or connecting.');
      return;
    }

    logger.debug(
      `Connecting to WebSocket with Profile: ID=${profile.id}, Name=${profile.name}, Color=${profile.color}`
    );

    const SIGNALING_SERVER_URI =
      process.env.REACT_APP_SIGNALING_SERVER_URL || 'https://snake.heyanabelle.com/backend';
    logger.debug(`Using signaling server: ${SIGNALING_SERVER_URI}`);

    const newSocket = io(SIGNALING_SERVER_URI, {
      query: {
        id: profile.id,
        name: profile.name,
        color: profile.color
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      logger.debug('Connected to signaling server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      logger.debug('Disconnected from signaling server:', reason);
      setIsConnected(false);

      setLatestGameState(null);
    });

    newSocket.on('connect_error', (err) => {
      logger.error('Signaling connection error:', err);
      setIsConnected(false);

      setLatestGameState(null);
    });

    newSocket.on('state-sync', (serverState: GameState) => {
      if (serverState) {
        setLatestGameState(serverState);
      } else {
        logger.warn('Received null or undefined state-sync data');
      }
    });
  }, []);

  const disconnect = useCallback(() => {
    logger.debug('Disconnect function called');
    if (socketRef.current) {
      socketRef.current.off('connect');
      socketRef.current.off('disconnect');
      socketRef.current.off('connect_error');
      socketRef.current.off('state-sync');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setLatestGameState(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        logger.debug('Cleaning up socket connection on component unmount...');
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
        socketRef.current.off('state-sync');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    isConnected,
    socket: socketRef.current,
    latestGameState,
    connect,
    disconnect
  };
};
