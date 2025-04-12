import { useEffect, useRef } from 'react';

export const useGameLoop = (draw: () => void, isActive: boolean) => {
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const loop = () => {
      draw();
      animationFrameId.current = requestAnimationFrame(loop);
    };

    if (isActive) {
      animationFrameId.current = requestAnimationFrame(loop);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [isActive, draw]);

  return {};
};
