import { useRef, useEffect, RefObject } from 'react';
import logger from '../utils/logger';

interface UseCanvasElementProps {
  width: number;
  height: number;
  containerRef: RefObject<HTMLElement>; // Expecting a ref to the container element
}

const useCanvasElement = ({ width, height, containerRef }: UseCanvasElementProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let canvasElementCreated = false;
    const container = containerRef.current; // Capture container.current at the start of the effect

    if (!canvasRef.current && container) {
      logger.debug('useCanvasElement: Creating canvas element...');
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      // Add role and aria-label for accessibility and testing
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Game Board'); // Default accessible name
      container.appendChild(canvas);
      canvasRef.current = canvas;
      canvasElementCreated = true;
    }

    // Store the created canvas element for cleanup
    const canvasToRemove = canvasRef.current;

    // Cleanup function
    return () => {
      // Use the captured container variable from the effect scope
      // and the canvas element captured before the return
      if (canvasElementCreated && canvasToRemove && container?.contains(canvasToRemove)) {
        logger.debug('useCanvasElement: Removing canvas element on cleanup.');
        try {
          container.removeChild(canvasToRemove);
        } catch (error) {
          logger.error('useCanvasElement: Error removing canvas during cleanup:', error);
        }
        // Remove logging
        // console.log('Cleanup - canvasRef.current:', canvasRef.current);
        // console.log('Cleanup - canvasToRemove:', canvasToRemove);
        // console.log('Cleanup - condition check:', canvasRef.current === canvasToRemove);
        // Setting canvasRef.current to null here is redundant if the component unmounts,
        // but good practice if the effect re-runs due to dependency changes.
        if (canvasRef.current === canvasToRemove) {
          canvasRef.current = null;
        }
      }
    };
    // Dependencies ensure effect runs if container ref object, width, or height changes
  }, [width, height, containerRef]); // containerRef itself is stable

  return {
    canvasRef
  };
};

export default useCanvasElement;
