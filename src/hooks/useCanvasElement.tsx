import { useRef, useEffect, RefObject } from 'react';
import logger from '../utils/logger';

interface UseCanvasElementProps {
  width: number;
  height: number;
  containerRef: RefObject<HTMLElement>;
}

const useCanvasElement = ({ width, height, containerRef }: UseCanvasElementProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let canvasElementCreated = false;
    const container = containerRef.current;

    if (!canvasRef.current && container) {
      logger.debug('useCanvasElement: Creating canvas element...');
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Game Board');
      container.appendChild(canvas);
      canvasRef.current = canvas;
      canvasElementCreated = true;
    }

    const canvasToRemove = canvasRef.current;

    return () => {
      if (canvasElementCreated && canvasToRemove && container?.contains(canvasToRemove)) {
        logger.debug('useCanvasElement: Removing canvas element on cleanup.');
        try {
          container.removeChild(canvasToRemove);
        } catch (error) {
          logger.error('useCanvasElement: Error removing canvas during cleanup:', error);
        }

        if (canvasRef.current === canvasToRemove) {
          canvasRef.current = null;
        }
      }
    };
  }, [width, height, containerRef]);

  return {
    canvasRef
  };
};

export default useCanvasElement;
