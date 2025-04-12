import { renderHook, screen, waitFor } from '@testing-library/react';

import '@testing-library/jest-dom';
import useCanvasElement from './useCanvasElement';
import logger from '../utils/logger';

describe('useCanvasElement', () => {
  it('should initialize and return a canvas ref', () => {
    const { result } = renderHook(() =>
      useCanvasElement({ width: 800, height: 600, containerRef: { current: null } })
    );

    expect(result.current).toHaveProperty('canvasRef');
    expect(result.current.canvasRef.current).toBeNull();
  });

  it('should create a canvas element and append it to the container', async () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const width = 640;
    const height = 480;

    const { result, rerender } = renderHook((props) => useCanvasElement(props), {
      initialProps: { width: width, height: height, containerRef: containerRef },
      wrapper: ({ children }) => <div ref={containerRef}>{children}</div>
    });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /game board/i })).toBeInTheDocument();
    });

    const canvasElement = screen.getByRole('img', { name: /game board/i });
    expect(result.current.canvasRef.current).toBe(canvasElement);

    rerender({ width: width, height: height, containerRef: containerRef });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /game board/i })).toBeInTheDocument();
    });

    const canvas2 = screen.getByRole('img', { name: /game board/i });
    expect(canvas2).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas2).toHaveAttribute('width', String(width));
    expect(canvas2).toHaveAttribute('height', String(height));
    expect(result.current.canvasRef.current).toBe(canvas2);
  });

  it('should remove the canvas element on unmount', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const containerRef = { current: container };
    const width = 320;
    const height = 240;

    const { unmount, result } = renderHook(
      ({ w, h, cRef }) => useCanvasElement({ width: w, height: h, containerRef: cRef }),
      {
        initialProps: { w: width, h: height, cRef: containerRef },
        wrapper: ({ children }) => <div ref={containerRef}>{children}</div>
      }
    );

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /game board/i })).toBeInTheDocument();
    });

    const canvasElement = screen.getByRole('img', { name: /game board/i });
    expect(result.current.canvasRef.current).toBe(canvasElement);

    unmount();

    await waitFor(() => {
      expect(screen.queryByRole('img', { name: /game board/i })).not.toBeInTheDocument();
    });

    document.body.removeChild(container);
  });

  it('should handle errors during canvas removal on unmount', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const width = 320;
    const height = 240;

    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    const removeChildSpy = jest.spyOn(container, 'removeChild').mockImplementation(() => {
      throw new Error('Test removeChild error');
    });

    const { unmount } = renderHook(
      ({ w, h, cRef }) => useCanvasElement({ width: w, height: h, containerRef: cRef }),
      {
        initialProps: { w: width, h: height, cRef: containerRef }
      }
    );

    unmount();

    expect(removeChildSpy).toHaveBeenCalledTimes(1);

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      'useCanvasElement: Error removing canvas during cleanup:',
      expect.any(Error)
    );

    removeChildSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should clean up the previous canvas when props change', async () => {
    const container = document.createElement('div');
    const containerRef = { current: container };

    const initialHookProps = { width: 300, height: 150, containerRef: containerRef };
    const updatedHookProps = { width: 400, height: 200, containerRef: containerRef };

    const { rerender, result } = renderHook((props) => useCanvasElement(props), {
      initialProps: initialHookProps,
      wrapper: ({ children }) => <div ref={containerRef}>{children}</div>
    });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /game board/i })).toHaveAttribute(
        'width',
        String(initialHookProps.width)
      );
    });

    const canvas1 = screen.getByRole('img', { name: /game board/i });
    expect(result.current.canvasRef.current).toBe(canvas1);
    expect(canvas1).toHaveAttribute('height', String(initialHookProps.height));

    rerender(updatedHookProps);

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /game board/i })).toHaveAttribute(
        'width',
        String(updatedHookProps.width)
      );
    });

    const canvas2 = screen.getByRole('img', { name: /game board/i });
    expect(result.current.canvasRef.current).toBe(canvas2);
    expect(canvas2).toHaveAttribute('height', String(updatedHookProps.height));
  });
});
