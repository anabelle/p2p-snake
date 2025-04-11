import { useEffect, useRef } from 'react';

export const useGameLoop = (draw: () => void, isActive: boolean) => {
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const loop = () => {
      draw();
      animationFrameId.current = requestAnimationFrame(loop);
    };

    if (isActive) {
      // Start the loop
      animationFrameId.current = requestAnimationFrame(loop);
    }
    // The cleanup function handles stopping the loop when isActive becomes false

    // Cleanup function to stop the loop when the component unmounts
    // or when isActive/draw changes
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [isActive, draw]); // Re-run effect if isActive or draw changes

  // The hook doesn't need to return anything for now
  return {};
};
