import { useState, useRef, useCallback, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';
import { GameState } from '../game/state/types'; // Adjust path as necessary
import { UserProfile } from '../types'; // Adjust path as necessary

// Define the shape of the return value for the hook
interface UseWebSocketReturn {
  isConnected: boolean;
  socket: Socket | null;
  latestGameState: GameState | null;
  connect: (profile: UserProfile) => void;
  disconnect: () => void; // Add a disconnect function
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [latestGameState, setLatestGameState] = useState<GameState | null>(null);
  const gameStateRef = useRef<GameState | null>(latestGameState); // Ref to keep track of latest state for handlers

  // Update gameStateRef whenever latestGameState changes
  useEffect(() => {
    gameStateRef.current = latestGameState;
  }, [latestGameState]);

  const connect = useCallback((profile: UserProfile) => {
    if (socketRef.current) {
      console.log('WebSocket already connected or connecting.');
      return; // Avoid reconnecting if already connected
    }

    console.log(
      `Connecting to WebSocket with Profile: ID=${profile.id}, Name=${profile.name}, Color=${profile.color}`
    );

    // Use environment variable for the server URL, falling back to production URL
    const SIGNALING_SERVER_URI =
      process.env.REACT_APP_SIGNALING_SERVER_URL || 'https://snake-api-974c0cc98060.herokuapp.com';
    console.log(`Using signaling server: ${SIGNALING_SERVER_URI}`);

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

    socketRef.current = newSocket; // Store the socket instance immediately

    // --- Event Listeners ---
    newSocket.on('connect', () => {
      console.log('Connected to signaling server');
      setIsConnected(true);
      // Game adapter initialization logic is removed from here - App will handle it
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from signaling server:', reason);
      setIsConnected(false);
      // Game loop stopping and adapter clearing are removed - App will handle it
      // We might still need to clean up the socket ref here
      // socketRef.current = null; // Let's keep the ref for potential auto-reconnect unless disconnect is explicit
      setLatestGameState(null); // Clear game state on disconnect
    });

    newSocket.on('connect_error', (err) => {
      console.error('Signaling connection error:', err);
      setIsConnected(false);
      // socketRef.current = null; // Keep ref for auto-reconnect attempts
      setLatestGameState(null);
    });

    newSocket.on('state-sync', (serverState: GameState) => {
      // Basic state update - App will handle complex logic like profile sync
      // Add null/undefined checks for safety
      if (serverState) {
        setLatestGameState(serverState);
      } else {
        console.warn('Received null or undefined state-sync data');
      }
      // Profile sync logic is removed - App will handle it using latestGameState
    });
  }, []); // Empty dependency array as it doesn't depend on component props/state

  // Placeholder for the disconnect function
  const disconnect = useCallback(() => {
    console.log('Disconnect function called');
    if (socketRef.current) {
      socketRef.current.off('connect'); // Clean up listeners
      socketRef.current.off('disconnect');
      socketRef.current.off('connect_error');
      socketRef.current.off('state-sync');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setLatestGameState(null);
    }
  }, []);

  // --- Cleanup Effect --- Remove listeners on unmount
  useEffect(() => {
    // Return a cleanup function
    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection on component unmount...');
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
        socketRef.current.off('state-sync');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  return {
    isConnected,
    socket: socketRef.current,
    latestGameState,
    connect,
    disconnect // Return the disconnect function
  };
};
