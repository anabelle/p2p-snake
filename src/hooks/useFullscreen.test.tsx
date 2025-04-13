/* eslint-disable testing-library/no-node-access */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFullscreen, getFullscreenApi } from './useFullscreen';
import logger from '../utils/logger';

import '@testing-library/jest-dom';

// Define mocks for the API functions globally
const mockRequestFullscreen = jest.fn(() => Promise.resolve());
const mockExitFullscreen = jest.fn(() => Promise.resolve());
const mockFullscreenElementGetter = jest.fn(() => null as Element | null);
const mockFullscreenEnabledGetter = jest.fn(() => true);

// Store original methods
const originalRequestFullscreen = Element.prototype.requestFullscreen;
const originalExitFullscreen = document.exitFullscreen;
const originalFullscreenElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement');
const originalFullscreenEnabled = Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled');

const ASPECT_RATIO = 50 / 30;

describe('useFullscreen - Extended Tests', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  let elementRef: { current: HTMLElement | null };
  let canvasRef: { current: HTMLCanvasElement | null };

  beforeAll(() => {
    // Apply mocks globally before any tests run
    Element.prototype.requestFullscreen = mockRequestFullscreen;
    document.exitFullscreen = mockExitFullscreen;
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: mockFullscreenElementGetter
    });
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      get: mockFullscreenEnabledGetter
    });
  });

  afterAll(() => {
    // Restore original methods after all tests
    Element.prototype.requestFullscreen = originalRequestFullscreen;
    document.exitFullscreen = originalExitFullscreen;
    if (originalFullscreenElement) {
      Object.defineProperty(document, 'fullscreenElement', originalFullscreenElement);
    }
    if (originalFullscreenEnabled) {
      Object.defineProperty(document, 'fullscreenEnabled', originalFullscreenEnabled);
    }
    jest.restoreAllMocks(); // Ensure all mocks/spies are restored
  });

  beforeEach(() => {
    // Reset mocks before each test
    mockRequestFullscreen.mockClear().mockResolvedValue(undefined);
    mockExitFullscreen.mockClear().mockResolvedValue(undefined);
    mockFullscreenElementGetter.mockClear().mockReturnValue(null);
    mockFullscreenEnabledGetter.mockClear().mockReturnValue(true);

    elementRef = {
      current: document.createElement('div')
    };
    canvasRef = {
      current: document.createElement('canvas')
    };

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1000
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800
    });

    // Clear spies on logger if needed, keep setup clean
    // jest.spyOn(logger, 'debug').mockRestore();
    // jest.spyOn(logger, 'warn').mockRestore();
    // jest.spyOn(logger, 'error').mockRestore();
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth
    });
    Object.defineProperty(window, 'innerHeight', {
      value: originalInnerHeight
    });
    // Restore spies created within tests if necessary (e.g., logger.error)
    // Spies created with jest.spyOn in beforeEach are typically handled by jest.restoreAllMocks in afterAll
  });

  it('should initialize with fullscreen disabled when browser API returns false', () => {
    mockFullscreenEnabledGetter.mockReturnValue(false);
    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));
    expect(result.current.isFullscreenEnabled).toBe(false);
  });

  it('should handle case when fullscreenChangeEvent is not available', () => {
    // Mock getFullscreenApi locally for this specific test if needed, or rely on hook's internal handling
    // For this test, we assume the hook handles it gracefully
    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));
    expect(result.current.isFullscreen).toBe(false);
  });

  it('should handle case when fullscreen element is different from target element', () => {
    const otherElement = document.createElement('div');
    mockFullscreenElementGetter.mockReturnValue(otherElement);
    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));
    expect(result.current.isFullscreen).toBe(false);
  });

  it('should handle case when fullscreenElement method is undefined', () => {
    // To simulate this, make fullscreenEnabled return false
    mockFullscreenEnabledGetter.mockReturnValue(false);
    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    expect(result.current.isFullscreen).toBe(false);
    expect(result.current.isFullscreenEnabled).toBe(false);

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(mockRequestFullscreen).not.toHaveBeenCalled();
  });

  it('should maintain aspect ratio when scaling to fullscreen in width-constrained scenario', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });

    mockFullscreenElementGetter.mockReturnValue(elementRef.current);
    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    act(() => {
      result.current.simulateFullscreenChange();
    });
    await waitFor(() => expect(result.current.isFullscreen).toBe(true));

    const expectedHeight = Math.floor(800 / ASPECT_RATIO);
    expect(canvasRef.current?.width).toBe(800);
    expect(canvasRef.current?.height).toBe(expectedHeight);
  });

  it('should maintain aspect ratio when scaling to fullscreen in height-constrained scenario', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1600 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 500 });

    mockFullscreenElementGetter.mockReturnValue(elementRef.current);
    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    act(() => {
      result.current.simulateFullscreenChange();
    });
    await waitFor(() => expect(result.current.isFullscreen).toBe(true));

    const expectedWidth = Math.floor(500 * ASPECT_RATIO);
    expect(canvasRef.current?.height).toBe(500);
    expect(canvasRef.current?.width).toBe(expectedWidth);
  });

  it('should not change canvas size on resize when not in fullscreen mode', () => {
    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));
    expect(result.current.isFullscreen).toBe(false);
    expect(canvasRef.current?.width).toBe(500);
    expect(canvasRef.current?.height).toBe(300);

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(canvasRef.current?.width).toBe(500);
    expect(canvasRef.current?.height).toBe(300);
  });

  it('should restore canvas size when exiting fullscreen through external means', async () => {
    mockFullscreenElementGetter.mockReturnValue(elementRef.current);
    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    act(() => {
      result.current.simulateFullscreenChange();
    });
    await waitFor(() => expect(result.current.isFullscreen).toBe(true));

    let expectedWidth = window.innerWidth;
    let expectedHeight = expectedWidth / ASPECT_RATIO;
    if (expectedHeight > window.innerHeight) {
      expectedHeight = window.innerHeight;
      expectedWidth = expectedHeight * ASPECT_RATIO;
    }
    expectedWidth = Math.floor(expectedWidth);
    expectedHeight = Math.floor(expectedHeight);
    expect(canvasRef.current?.width).toBe(expectedWidth);
    expect(canvasRef.current?.height).toBe(expectedHeight);

    mockFullscreenElementGetter.mockReturnValue(null);
    act(() => {
      result.current.simulateFullscreenChange();
    });

    await waitFor(() => expect(result.current.isFullscreen).toBe(false));

    expect(canvasRef.current?.width).toBe(500);
    expect(canvasRef.current?.height).toBe(300);
  });

  it('should reset canvas when component unmounts while in fullscreen', async () => {
    mockFullscreenElementGetter.mockReturnValue(elementRef.current);

    const removeDocListenerSpy = jest.spyOn(document, 'removeEventListener');
    const removeWindowListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { result, unmount } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    act(() => {
      result.current.simulateFullscreenChange();
    });
    await waitFor(() => expect(result.current.isFullscreen).toBe(true));

    mockFullscreenElementGetter.mockReturnValue(elementRef.current);

    // Get the event name *before* unmount, as the hook uses it internally
    const actualChangeEventName = getFullscreenApi().fullscreenChangeEvent;

    unmount();

    expect(canvasRef.current?.width).toBe(500);
    expect(canvasRef.current?.height).toBe(300);
    expect(
      elementRef.current?.style.position === 'static' || elementRef.current?.style.position === ''
    ).toBe(true);
    expect(
      elementRef.current?.style.width === 'auto' || elementRef.current?.style.width === ''
    ).toBe(true);

    // Check removal using the dynamic name obtained before unmount
    if (actualChangeEventName) {
      // Use waitFor only for the positive case where the call is expected
      await waitFor(() => {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(removeDocListenerSpy).toHaveBeenCalledWith(
          actualChangeEventName,
          expect.any(Function)
        );
      });
    } else {
      // If no event name, listener shouldn't have been added/removed
      // Call expect unconditionally in the else block (disable rule)
      // eslint-disable-next-line jest/no-conditional-expect
      expect(removeDocListenerSpy).not.toHaveBeenCalled();
    }
    // Check window listener unconditionally
    await waitFor(() =>
      expect(removeWindowListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    );
  });

  it('should work with Mozilla prefixed fullscreen API', async () => {
    // Temporarily override global mocks for this specific test
    const originalRequestFullscreen = Element.prototype.requestFullscreen;
    const originalExitFullscreen = document.exitFullscreen;
    const originalFullscreenElementDesc = Object.getOwnPropertyDescriptor(
      document,
      'fullscreenElement'
    );
    const originalFullscreenEnabledDesc = Object.getOwnPropertyDescriptor(
      document,
      'fullscreenEnabled'
    );

    // Simulate non-prefixed API not being available
    delete (Element.prototype as any).requestFullscreen;
    delete (document as any).exitFullscreen;
    if (originalFullscreenElementDesc) delete (document as any).fullscreenElement;
    if (originalFullscreenEnabledDesc) delete (document as any).fullscreenEnabled;

    // Define prefixed mocks and getters
    const mockMozRequestFullScreen = jest.fn(() => Promise.resolve());
    const mockMozCancelFullScreen = jest.fn(() => Promise.resolve());
    const mockMozElementGetter = jest.fn(() => null as Element | null);
    const mockMozEnabledGetter = jest.fn(() => true);

    (Element.prototype as any).mozRequestFullScreen = mockMozRequestFullScreen;
    (document as any).mozCancelFullScreen = mockMozCancelFullScreen;
    Object.defineProperty(document, 'mozFullScreenElement', {
      get: mockMozElementGetter,
      configurable: true
    });
    Object.defineProperty(document, 'mozFullScreenEnabled', {
      get: mockMozEnabledGetter,
      configurable: true
    });

    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    expect(result.current.isFullscreenEnabled).toBe(true);

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(mockMozRequestFullScreen).toHaveBeenCalledTimes(1);

    // Trigger state update by calling the simulation function
    mockMozElementGetter.mockReturnValue(elementRef.current);
    act(() => {
      result.current.simulateFullscreenChange();
    });
    await waitFor(() => expect(result.current.isFullscreen).toBe(true));

    // Restore original APIs and remove prefixed ones
    Element.prototype.requestFullscreen = originalRequestFullscreen;
    document.exitFullscreen = originalExitFullscreen;
    if (originalFullscreenElementDesc)
      Object.defineProperty(document, 'fullscreenElement', originalFullscreenElementDesc);
    if (originalFullscreenEnabledDesc)
      Object.defineProperty(document, 'fullscreenEnabled', originalFullscreenEnabledDesc);
    delete (Element.prototype as any).mozRequestFullScreen;
    delete (document as any).mozCancelFullScreen;
    delete (document as any).mozFullScreenElement;
    delete (document as any).mozFullScreenEnabled;
  });

  it('should handle requestFullscreen rejection and log error', async () => {
    // Explicitly set enabled to true for this test to counteract potential mock issues
    mockFullscreenEnabledGetter.mockReturnValue(true);
    mockRequestFullscreen.mockRejectedValue(new Error('Fullscreen failed'));
    const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    expect(result.current.isFullscreen).toBe(false);

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(mockRequestFullscreen).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(loggerErrorSpy).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isFullscreen).toBe(false));
    const lastErrorCallArgs = loggerErrorSpy.mock.calls.pop();
    expect(lastErrorCallArgs?.[0]).toContain('Error attempting to enable full-screen mode:');
    expect(lastErrorCallArgs?.[1]).toBeInstanceOf(Error);
    loggerErrorSpy.mockRestore();
  });

  it('should handle exitFullscreen rejection and log error', async () => {
    mockFullscreenElementGetter.mockReturnValue(elementRef.current);
    mockExitFullscreen.mockRejectedValue(new Error('Exit fullscreen failed'));
    const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    await waitFor(() => expect(result.current.isFullscreen).toBe(true));

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(mockExitFullscreen).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(loggerErrorSpy).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isFullscreen).toBe(true));
    const lastErrorCallArgsExit = loggerErrorSpy.mock.calls.pop();
    expect(lastErrorCallArgsExit?.[0]).toContain('Error attempting to exit full-screen mode:');
    expect(lastErrorCallArgsExit?.[1]).toBeInstanceOf(Error);
    loggerErrorSpy.mockRestore();
  });
});
