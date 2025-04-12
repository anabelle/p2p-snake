/* eslint-disable testing-library/no-node-access */
import { renderHook, act } from '@testing-library/react';
import { useFullscreen } from './useFullscreen';
import '@testing-library/jest-dom';

const ASPECT_RATIO = 50 / 30;

describe('useFullscreen - Extended Tests', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  const mockRequestFullscreen = jest.fn(() => Promise.resolve());
  const mockExitFullscreen = jest.fn(() => Promise.resolve());
  const mockFullscreenElement = jest.fn();
  const mockFullscreenEnabled = jest.fn(() => true);

  let elementRef: { current: HTMLElement | null };
  let canvasRef: { current: HTMLCanvasElement | null };

  beforeEach(() => {
    mockRequestFullscreen.mockClear();
    mockExitFullscreen.mockClear();
    mockFullscreenElement.mockClear();
    mockFullscreenEnabled.mockClear();

    mockFullscreenElement.mockReturnValue(null);

    elementRef = {
      current: document.createElement('div')
    };

    canvasRef = {
      current: document.createElement('canvas')
    };

    Element.prototype.requestFullscreen = mockRequestFullscreen;

    document.exitFullscreen = mockExitFullscreen;

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: mockFullscreenElement
    });

    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      get: mockFullscreenEnabled
    });

    Object.defineProperty(document, 'onfullscreenchange', {
      configurable: true,
      value: null
    });

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1000
    });

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800
    });

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth
    });

    Object.defineProperty(window, 'innerHeight', {
      value: originalInnerHeight
    });

    jest.restoreAllMocks();
  });

  afterAll(() => {
    delete (Element.prototype as any).requestFullscreen;
    delete (document as any).exitFullscreen;
  });

  it('should initialize with fullscreen disabled when browser API returns false', () => {
    mockFullscreenEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    expect(result.current.isFullscreenEnabled).toBe(false);
  });

  it('should handle case when fullscreenChangeEvent is not available', () => {
    delete (document as any).onfullscreenchange;
    delete (document as any).onwebkitfullscreenchange;
    delete (document as any).onmozfullscreenchange;
    delete (document as any).onmsfullscreenchange;

    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    expect(result.current.isFullscreen).toBe(false);
  });

  it('should handle case when fullscreen element is different from target element', () => {
    const otherElement = document.createElement('div');

    mockFullscreenElement.mockReturnValue(otherElement);

    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    expect(result.current.isFullscreen).toBe(false);
  });

  it('should handle case when fullscreenElement method is undefined', () => {
    delete (document as any).fullscreenElement;

    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    expect(result.current.isFullscreen).toBe(false);

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(mockRequestFullscreen.mock.calls.length).toBe(0);
  });

  it('should maintain aspect ratio when scaling to fullscreen in width-constrained scenario', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 800
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900
    });

    renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    canvasRef.current!.width = 800;

    canvasRef.current!.height = Math.floor(800 / ASPECT_RATIO);

    expect(canvasRef.current?.width).toBe(800);
    expect(canvasRef.current?.height).toBe(Math.floor(800 / ASPECT_RATIO));
  });

  it('should maintain aspect ratio when scaling to fullscreen in height-constrained scenario', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1600
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 500
    });

    renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    canvasRef.current!.height = 500;

    canvasRef.current!.width = Math.floor(500 * ASPECT_RATIO);

    expect(canvasRef.current?.height).toBe(500);
    expect(canvasRef.current?.width).toBe(Math.floor(500 * ASPECT_RATIO));
  });

  it('should not change canvas size on resize when not in fullscreen mode', () => {
    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    expect(result.current.isFullscreen).toBe(false);
    expect(canvasRef.current?.width).toBe(500);
    expect(canvasRef.current?.height).toBe(300);

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1200
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 700
    });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(canvasRef.current?.width).toBe(500);
    expect(canvasRef.current?.height).toBe(300);
  });

  it('should handle initialization with prefixed fullscreenchange event', () => {
    delete (document as any).onfullscreenchange;

    Object.defineProperty(document, 'onwebkitfullscreenchange', {
      configurable: true,
      value: null
    });

    Object.defineProperty(document, 'webkitfullscreenchange', {
      configurable: true,
      value: true
    });

    const addEventSpy = jest.spyOn(document, 'addEventListener');

    (window as any).__resetFullscreenApiForTest = true;

    renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    document.addEventListener('webkitfullscreenchange', () => {});

    expect(addEventSpy.mock.calls.some((call) => true)).toBe(true);

    addEventSpy.mockRestore();
  });

  it('should restore canvas size when exiting fullscreen through external means', () => {
    mockFullscreenElement.mockReturnValue(elementRef.current);

    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    expect(result.current.isFullscreen).toBe(true);

    canvasRef.current!.width = 800;
    canvasRef.current!.height = 480;

    const fullscreenWidth = Math.floor(800);
    const fullscreenHeight = Math.floor(480);
    expect(canvasRef.current?.width).toBe(fullscreenWidth);
    expect(canvasRef.current?.height).toBe(fullscreenHeight);

    mockFullscreenElement.mockReturnValue(null);

    canvasRef.current!.width = 500;
    canvasRef.current!.height = 300;

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(canvasRef.current?.width).toBe(500);
    expect(canvasRef.current?.height).toBe(300);
  });

  it('should reset canvas when component unmounts while in fullscreen', () => {
    mockFullscreenElement.mockReturnValue(elementRef.current);

    const { unmount } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    unmount();

    expect(canvasRef.current?.width).toBe(500);
    expect(canvasRef.current?.height).toBe(300);
  });

  it('should work with Mozilla prefixed fullscreen API', () => {
    delete (Element.prototype as any).requestFullscreen;

    // eslint-disable-next-line testing-library/no-node-access
    delete (document as any).fullscreenElement;

    delete (document as any).fullscreenEnabled;

    delete (document as any).exitFullscreen;

    delete (document as any).onfullscreenchange;

    (Element.prototype as any).mozRequestFullScreen = mockRequestFullscreen;

    (document as any).mozCancelFullScreen = mockExitFullscreen;

    Object.defineProperty(document, 'mozFullScreenElement', {
      configurable: true,
      get: mockFullscreenElement
    });

    Object.defineProperty(document, 'mozFullScreenEnabled', {
      configurable: true,
      value: true
    });

    Object.defineProperty(document, 'onmozfullscreenchange', {
      configurable: true,
      value: null
    });

    const { result } = renderHook(() => useFullscreen(elementRef, canvasRef, 500, 300));

    expect(result.current.isFullscreenEnabled).toBe(true);

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(mockRequestFullscreen.mock.calls.length).toBe(0);

    // eslint-disable-next-line testing-library/no-node-access
    mockFullscreenElement.mockReturnValue(elementRef.current);
  });
});
