import { useRef, useEffect, RefObject } from 'react';

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
      console.log('useCanvasElement: Creating canvas element...');
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
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
        console.log('useCanvasElement: Removing canvas element on cleanup.');
        try {
          container.removeChild(canvasToRemove);
        } catch (error) {
          console.error('useCanvasElement: Error removing canvas during cleanup:', error);
        }
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
