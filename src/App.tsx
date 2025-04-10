import React, { useEffect, useRef } from 'react';
import * as netplayjs from 'netplayjs';
import { NetplayAdapter } from './game/network/NetplayAdapter';
import { Snake } from './game/state/types'; // Import Snake type

const App: React.FC = () => {
  const netplayContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<netplayjs.LockstepWrapper | null>(null);
  // Ref for the animation frame request
  const animationFrameRef = useRef<number>();
  // Ref to store the canvas element once found
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let started = false;
    if (netplayContainerRef.current && !wrapperRef.current) {
      console.log("Creating and starting LockstepWrapper...");
      const wrapper = new netplayjs.LockstepWrapper(NetplayAdapter);
      wrapperRef.current = wrapper;

      // --- Configure wrapper before starting ---
      (wrapper as any).config = (wrapper as any).config || {}; // Ensure config object exists
      (wrapper as any).config.lobby = false; // Disable default lobby UI
      (wrapper as any).config.matchID = 'global-snake-room'; // Set fixed room ID
      // Add explicit STUN server for potentially better P2P connection
      (wrapper as any).config.peerJsConfig = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }, // Google's public STUN server
          // You could add more STUN/TURN servers here if needed
        ],
      };
      // --- End configuration ---

      try {
        // Start the wrapper (no arguments needed here now)
        wrapper.start(); 
        started = true;
        console.log("NetplayJS wrapper started successfully with fixed room.");

        // --- Animation loop for UI updates (like border color) ---
        const updateLoop = () => {
          if (wrapperRef.current && netplayContainerRef.current) {
             // Try to find the canvas if we haven't already
            if (!canvasRef.current) {
                canvasRef.current = netplayContainerRef.current.querySelector('canvas');
            }

            if (canvasRef.current) {
                try {
                    // Attempt to access game and player data (guarding against errors)
                    const game = (wrapperRef.current as any).getGame ? (wrapperRef.current as any).getGame() as NetplayAdapter | null : null;
                    const localPlayer = (wrapperRef.current as any).getLocalPlayer ? (wrapperRef.current as any).getLocalPlayer() as netplayjs.NetplayPlayer | null : null;

                    let borderColor = '#FFFFFF'; // Default border

                    if (game && localPlayer) {
                        const state = game.state;
                        const localPlayerId = localPlayer.getID().toString();
                        const localSnake = state.snakes.find((s: Snake) => s.id === localPlayerId);
                        if (localSnake) {
                            borderColor = localSnake.color;
                        }
                    }

                    // Update border style directly on the found canvas
                    if (canvasRef.current.style.borderColor !== borderColor) {
                        canvasRef.current.style.borderColor = borderColor;
                        canvasRef.current.style.borderWidth = '3px'; // Ensure border width is set
                        canvasRef.current.style.borderStyle = 'solid'; // Ensure border style is set
                    }
                } catch (error) {
                    // Don't log errors continuously if methods are missing
                    // console.error("Error accessing game/player state:", error);
                }
            }
          }
          // Schedule next frame
          animationFrameRef.current = requestAnimationFrame(updateLoop);
        };

        // Start the loop
        animationFrameRef.current = requestAnimationFrame(updateLoop);
        // --- End Animation loop ---

      } catch (error) {
        console.error("Failed to start NetplayJS wrapper:", error);
        wrapperRef.current = null;
      }
    }

    // Cleanup function
    return () => {
      // Stop the animation frame loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Cleanup wrapper if needed (removed explicit stop previously)
      if (started && wrapperRef.current) {
        console.log("NetplayJS wrapper was active, component unmounting.");
        // If stop() exists and is needed, add it back here with proper checks
        wrapperRef.current = null;
      }
    };
  }, [netplayContainerRef]);

  return (
    <div className="App">
      <h1>P2P Snake Game (netplayjs - Lockstep)</h1>
      {/* Container for netplayjs UI injection */}
      <div ref={netplayContainerRef} id="netplay-container" style={{ marginTop: '20px' }}>
        {/* NetplayJS populates this div. Initial border set via JS loop. */}
      </div>
    </div>
  );
};

export default App; 