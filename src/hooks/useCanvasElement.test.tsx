import { renderHook /* , act */ } from '@testing-library/react';
// import { useRef } from 'react'; // Removed unused import
import useCanvasElement from './useCanvasElement';

// Mock canvas element and context - Removed as it's unused
// const mockContext = {
//   clearRect: jest.fn(),
//   drawImage: jest.fn(),
//   fillRect: jest.fn(),
//   fillText: jest.fn(),
//   beginPath: jest.fn(),
//   moveTo: jest.fn(),
//   lineTo: jest.fn(),
//   stroke: jest.fn(),
//   arc: jest.fn(),
//   fill: jest.fn(),
//   save: jest.fn(),
//   restore: jest.fn(),
//   setTransform: jest.fn(),
//   canvas: { width: 800, height: 600 },
// } as unknown as CanvasRenderingContext2D;

describe('useCanvasElement', () => {
  it('should initialize and return a canvas ref', () => {
    const { result } = renderHook(() =>
      useCanvasElement({ width: 800, height: 600, containerRef: { current: null } })
    );

    // Expect the hook to return an object containing a ref
    expect(result.current).toHaveProperty('canvasRef');
    expect(result.current.canvasRef.current).toBeNull(); // Initially null

    // Simulate assigning a canvas element
    // (In a real component, this happens when the <canvas> mounts)
    // We can't directly test the ref assignment here easily without a component,
    // but we verify the ref object is returned.
  });

  // New test for canvas creation and appending
  it('should create a canvas element and append it to the container', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const width = 640;
    const height = 480;

    // Render the hook
    const { result } = renderHook(
      ({ w, h, cRef }) => useCanvasElement({ width: w, height: h, containerRef: cRef }),
      {
        initialProps: { w: width, h: height, cRef: containerRef }
      }
    );

    // The useEffect runs immediately in renderHook.
    // Verify the state *after* the hook has run its effect.

    // Check if canvas was created and appended
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.children.length).toBe(1);
    // eslint-disable-next-line testing-library/no-node-access
    const canvasElement = container.children[0];
    expect(canvasElement).toBeInstanceOf(HTMLCanvasElement);
    expect((canvasElement as HTMLCanvasElement).width).toBe(width);
    expect((canvasElement as HTMLCanvasElement).height).toBe(height);

    // Check if the hook's ref points to the created canvas
    expect(result.current.canvasRef.current).toBe(canvasElement);
  });

  // Test for cleanup
  it('should remove the canvas element on unmount', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const width = 320;
    const height = 240;

    // Render the hook
    const { unmount, result } = renderHook(
      ({ w, h, cRef }) => useCanvasElement({ width: w, height: h, containerRef: cRef }),
      {
        initialProps: { w: width, h: height, cRef: containerRef }
      }
    );

    // Verify canvas exists initially
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.children.length).toBe(1);
    // eslint-disable-next-line testing-library/no-node-access
    const canvasElement = container.children[0];
    expect(result.current.canvasRef.current).toBe(canvasElement);

    // Unmount the hook
    unmount();

    // Verify canvas is removed from container
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.children.length).toBe(0);
    // Verify the ref is nulled out (optional, but good practice)
    // Note: The ref object itself still exists, but its .current should be null.
    // We check this indirectly by checking the container, but could also check ref if needed.
    // expect(result.current.canvasRef.current).toBeNull(); // This doesn't work as result isn't updated post-unmount
  });

  // Add more tests later for drawing logic
});
