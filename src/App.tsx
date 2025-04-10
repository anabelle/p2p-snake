import React, { useEffect, useRef, useState } from 'react';
import * as netplayjs from 'netplayjs'; // Re-add for type casting
import { NetplayAdapter } from './game/network/NetplayAdapter';
// Types might still be needed for state-sync
import { GameState } from './game/state/types';
import io, { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  // Core component refs
  const socketRef = useRef<Socket | null>(null);
  const localPlayerIdRef = useRef<string>(uuidv4()); // Keep local ID for identifying self
  const gameAdapterRef = useRef<NetplayAdapter | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();

  // Simplified state
  const [isConnected, setIsConnected] = useState(false);

  // Input State (remains the same)
  const localInputStateRef = useRef({ dx: 0, dy: 0 });
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // Input Event Listeners (remains the same)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only process if connected? Maybe allow input buffering? For now, process always.
      console.log(`KEYDOWN Event: key=${event.key}`);
      let changed = false;
      let newState = { ...localInputStateRef.current };
      if (!pressedKeysRef.current.has(event.key)) {
          pressedKeysRef.current.add(event.key);
          // Map arrow keys to dx/dy for sending
          switch (event.key) {
              case 'ArrowUp':    newState = { dx: 0, dy: 1 }; changed = true; break;
              case 'ArrowDown':  newState = { dx: 0, dy: -1 }; changed = true; break;
              case 'ArrowLeft':  newState = { dx: -1, dy: 0 }; changed = true; break;
              case 'ArrowRight': newState = { dx: 1, dy: 0 }; changed = true; break;
          }
      }
      if (changed) {
          localInputStateRef.current = newState;
          console.log("KEYDOWN - Input Ref updated to:", localInputStateRef.current);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      console.log(`KEYUP Event: key=${event.key}`);
      let changed = false;
      let newState = { dx: 0, dy: 0 }; // Default to no movement on key up

      if (pressedKeysRef.current.has(event.key)) {
          pressedKeysRef.current.delete(event.key);
          changed = true; // Input definitely changed

          // Check remaining pressed keys to determine current direction
          if (pressedKeysRef.current.has('ArrowLeft')) newState.dx = -1;
          else if (pressedKeysRef.current.has('ArrowRight')) newState.dx = 1;

          if (pressedKeysRef.current.has('ArrowUp')) newState.dy = 1;
          else if (pressedKeysRef.current.has('ArrowDown')) newState.dy = -1;

           // Prevent diagonal by prioritizing horizontal if both are pressed? Or let server decide?
           // Let's prioritize last pressed or stick with combined for now, server logic handles it.
           if (newState.dx !== 0 && newState.dy !== 0) {
               // Simple priority: Last key pressed might still be held. If arrow up/down was just released, horizontal takes precedence if held.
               if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                  if(pressedKeysRef.current.has('ArrowLeft') || pressedKeysRef.current.has('ArrowRight')) newState.dy = 0;
               } else { // Left/Right released
                  if(pressedKeysRef.current.has('ArrowUp') || pressedKeysRef.current.has('ArrowDown')) newState.dx = 0;
               }
           }

      }

      // Update ref only if the resulting state is different from current
      // Or always update on keyup to signal "stop"? Let's always update for now.
      if (changed) {
           localInputStateRef.current = newState;
           console.log("KEYUP - Input Ref updated to:", localInputStateRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // Empty dependency array is correct here

  // --- Centralized WebSocket Logic ---
  useEffect(() => {
    const SIGNALING_SERVER_URI = 'ws://localhost:3001';
    console.log(`Local Player ID: ${localPlayerIdRef.current}`);

    // Connect to server, sending ID
    socketRef.current = io(SIGNALING_SERVER_URI, { query: { id: localPlayerIdRef.current } });
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to signaling server');
      setIsConnected(true);
      // Optional: Emit join explicitly if needed by server logic beyond query param
      // socket.emit('join', { id: localPlayerIdRef.current });

      // Start the game adapter and rendering loop immediately upon connection
      if (!gameAdapterRef.current) {
        startGameAdapter();
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      setIsConnected(false);
      // Stop the game loop on disconnect
      if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = undefined;
      }
      // Optionally clear adapter/canvas refs?
      gameAdapterRef.current = null;
      if (canvasRef.current) {
         canvasRef.current.remove();
         canvasRef.current = null;
      }
    });

    socket.on('connect_error', (err) => {
        console.error('Signaling connection error:', err);
        setIsConnected(false);
    });

    // --- Listener for State Sync from Server ---
    socket.on('state-sync', (serverState: GameState) => {
        if (gameAdapterRef.current) {
            // Apply the authoritative state received from the server
            // Explicitly cast to satisfy JsonValue type
            gameAdapterRef.current.deserialize(serverState as unknown as netplayjs.JsonValue);
        } else {
            // This might happen if state arrives before adapter is ready on initial connect
            console.warn("Received state-sync but game adapter not ready.");
        }
    });

    // --- Game Adapter Initialization (Client-side only) ---
    const startGameAdapter = () => {
      console.log(`startGameAdapter called. gameContainerRef.current: ${!!gameContainerRef.current}`);
      if (!gameAdapterRef.current && gameContainerRef.current) {
        console.log("Initializing Client NetplayAdapter...");

        // Create canvas if it doesn't exist
        if (!canvasRef.current) {
          console.log("Creating canvas element...");
          const canvas = document.createElement('canvas');
          canvas.width = NetplayAdapter.canvasSize.width;
          canvas.height = NetplayAdapter.canvasSize.height;
          // Style canvas?
          // canvas.style.border = '1px solid lightgrey';
          gameContainerRef.current.appendChild(canvas);
          canvasRef.current = canvas;
          console.log("Canvas element created and appended.");
        }

        try {
          // Create adapter (constructor simplified in NetplayAdapter.ts)
          gameAdapterRef.current = new NetplayAdapter(canvasRef.current);
          console.log(`Client NetplayAdapter instance created.`);
        } catch (e) {
          console.error("Error creating NetplayAdapter instance:", e);
          return; // Don't start loop if adapter fails
        }

        console.log("Starting client game loop...");
        gameLoop(); // Start the loop *after* adapter is successfully created
      } else {
        console.log(`startGameAdapter did not proceed. Adapter: ${!!gameAdapterRef.current}, Container: ${!!gameContainerRef.current}`);
      }
    };

    // --- Game Loop (Client: Send Input, Draw Received State) ---
    const gameLoop = () => {
      // Ensure loop stops if component unmounts or disconnects
      if (!gameAdapterRef.current || !canvasRef.current || !socketRef.current?.connected) {
          console.log("Game loop stopping: Adapter, canvas, or socket missing/disconnected.");
          animationFrameRef.current = undefined; // Clear ref
          return;
      }

      // 1. Send Local Input State to SERVER
      const currentLocalInput = localInputStateRef.current;
      socketRef.current.emit('input', currentLocalInput); // Send { dx, dy }

      // 2. Client does NOT tick the simulation.

      // 3. Draw the current state (updated by state-sync messages)
      try {
        gameAdapterRef.current.draw(canvasRef.current);
      } catch (e) {
        console.error("Error during gameAdapter.draw:", e);
        // Stop loop on draw error
        animationFrameRef.current = undefined;
        return;
      }

      // Request next frame
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    // Cleanup function for main useEffect
    return () => {
      console.log('Cleaning up App component...');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      // Disconnect WebSocket
      socketRef.current?.disconnect();
      socketRef.current = null;
      // Clear refs
      gameAdapterRef.current = null;
      canvasRef.current = null; // Still clear the ref
      console.log('Cleanup complete.');
    };
  }, []); // Main effect runs once on mount, cleanup on unmount

  // Render function
  return (
    <div className="App">
      <h1>Central Server Snake Game</h1>
      <div>Status: {isConnected ? `Connected (ID: ${localPlayerIdRef.current})` : 'Disconnected'}</div>
      {/* Container for the game canvas */}
      <div ref={gameContainerRef} id="game-container" style={{
          marginTop: '20px',
          position: 'relative',
          width: NetplayAdapter.canvasSize.width,
          height: NetplayAdapter.canvasSize.height,
          border: '1px solid grey',
          backgroundColor: '#222' // Add a background color
          }}>
         {/* Canvas will be appended here dynamically */}
         {!isConnected && <div style={{color: 'white', textAlign: 'center', paddingTop: '50px'}}>Connecting...</div>}
      </div>
    </div>
  );
};

export default App; 