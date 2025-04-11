import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to manage the game loop using requestAnimationFrame.
 * @param onFrame Function to call on each animation frame.
 * @param isActive Boolean indicating whether the loop should be running.
 */
export const useGameLoop = (onFrame: () => void, isActive: boolean) => {
  const animationFrameRef = useRef<number>();

  // The actual loop function
  const loop = useCallback(() => {
    // Call the provided function for this frame
    onFrame();
    // Request the next frame, storing the handle
    animationFrameRef.current = requestAnimationFrame(loop);
  }, [onFrame]); // Recreate loop only if onFrame changes

  useEffect(() => {
    // Effect to start/stop the loop based on isActive
    if (isActive) {
      // Start the loop if it's not already running
      if (!animationFrameRef.current) {
        console.log('Starting game loop...');
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    } else {
      // Stop the loop if it is running
      if (animationFrameRef.current) {
        console.log('Stopping game loop...');
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    }

    // Cleanup function: always cancel the frame on unmount or if isActive/loop changes
    return () => {
      if (animationFrameRef.current) {
        console.log('Cleaning up game loop...');
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [isActive, loop]); // Dependencies: run effect if isActive or loop changes

  // The hook itself doesn't need to return anything
};
