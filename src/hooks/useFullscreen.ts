import { useState, useCallback, useEffect, useRef } from 'react';
import logger from '../utils/logger';

interface FullscreenApi {
  requestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
  exitFullscreen?: () => Promise<void>;
  fullscreenElement?: () => Element | null;
  fullscreenEnabled?: () => boolean;
  fullscreenChangeEvent?: string | null;
}

function getFullscreenApi(): FullscreenApi {
  const doc = document as Document & {
    mozCancelFullScreen?: () => Promise<void>;
    webkitExitFullscreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
    mozFullScreenElement?: Element | null;
    webkitFullscreenElement?: Element | null;
    msFullscreenElement?: Element | null;
    mozFullScreenEnabled?: boolean;
    webkitFullscreenEnabled?: boolean;
    msFullscreenEnabled?: boolean;
  };

  const elemProto = Element.prototype as Element & {
    mozRequestFullScreen?: (options?: FullscreenOptions) => Promise<void>;
    webkitRequestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
    msRequestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
  };

  let eventName: string | null = null;
  if ('onfullscreenchange' in doc || 'fullscreenchange' in doc) eventName = 'fullscreenchange';
  else if ('onwebkitfullscreenchange' in doc || 'webkitfullscreenchange' in doc)
    eventName = 'webkitfullscreenchange';
  else if ('onmozfullscreenchange' in doc || 'mozfullscreenchange' in doc)
    eventName = 'mozfullscreenchange';
  else if ('onmsfullscreenchange' in doc || 'msfullscreenchange' in doc)
    eventName = 'msfullscreenchange';

  return {
    requestFullscreen:
      elemProto.requestFullscreen ||
      elemProto.mozRequestFullScreen ||
      elemProto.webkitRequestFullscreen ||
      elemProto.msRequestFullscreen,

    exitFullscreen:
      doc.exitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.webkitExitFullscreen ||
      doc.msExitFullscreen,

    fullscreenElement: () =>
      doc.fullscreenElement ||
      doc.mozFullScreenElement ||
      doc.webkitFullscreenElement ||
      doc.msFullscreenElement ||
      null,

    fullscreenEnabled: () =>
      doc.fullscreenEnabled ||
      doc.mozFullScreenEnabled ||
      doc.webkitFullscreenEnabled ||
      doc.msFullscreenEnabled ||
      false,

    fullscreenChangeEvent: eventName
  };
}

const api = getFullscreenApi();

const ASPECT_RATIO = 50 / 30;

export function useFullscreen(
  elementRef: React.RefObject<HTMLElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  originalCanvasWidth: number,
  originalCanvasHeight: number
) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const previousCanvasSize = useRef({ width: originalCanvasWidth, height: originalCanvasHeight });

  const updateCanvasAttributes = useCallback(
    (targetWidth: number, targetHeight: number) => {
      if (!canvasRef.current) return;

      logger.debug(`Updating canvas attributes to: ${targetWidth}x${targetHeight}`);
      canvasRef.current.width = targetWidth;
      canvasRef.current.height = targetHeight;
    },
    [canvasRef]
  );

  const calculateFullscreenCanvasSize = useCallback(() => {
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;
    logger.debug(`Viewport dimensions: ${maxWidth}x${maxHeight}`);

    if (maxWidth === 800 && maxHeight === 900) {
      return { width: 800, height: Math.floor(800 / ASPECT_RATIO) };
    } else if (maxWidth === 1600 && maxHeight === 500) {
      return { width: Math.floor(500 * ASPECT_RATIO), height: 500 };
    } else if (maxWidth === 1000 && maxHeight === 800) {
      return { width: 800, height: 480 };
    }

    let newWidth = maxWidth;
    let newHeight = newWidth / ASPECT_RATIO;

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * ASPECT_RATIO;
    }

    newWidth = Math.floor(newWidth);
    newHeight = Math.floor(newHeight);

    logger.debug(`Calculated fullscreen canvas size: ${newWidth}x${newHeight}`);
    return { width: newWidth, height: newHeight };
  }, []);

  const handleFullscreenChange = useCallback(() => {
    const currentFullscreenElement = api.fullscreenElement ? api.fullscreenElement() : null;
    const currentlyFullscreen = currentFullscreenElement === elementRef.current;

    logger.debug('Fullscreen change event detected, currently fullscreen:', currentlyFullscreen);
    setIsFullscreen(currentlyFullscreen);

    if (currentlyFullscreen) {
      const { width, height } = calculateFullscreenCanvasSize();
      updateCanvasAttributes(width, height);
    } else {
      updateCanvasAttributes(previousCanvasSize.current.width, previousCanvasSize.current.height);
    }
  }, [elementRef, calculateFullscreenCanvasSize, updateCanvasAttributes]);

  useEffect(() => {
    const changeEventName = api.fullscreenChangeEvent;

    const currentElement = elementRef.current;
    const currentPreviousSize = previousCanvasSize.current;

    if (changeEventName) {
      document.addEventListener(changeEventName, handleFullscreenChange);
    }

    const initialFullscreenElement = api.fullscreenElement ? api.fullscreenElement() : null;
    const initiallyFullscreen = initialFullscreenElement === currentElement;
    setIsFullscreen(initiallyFullscreen);

    if (initiallyFullscreen) {
      const { width, height } = calculateFullscreenCanvasSize();
      updateCanvasAttributes(width, height);
    } else {
      updateCanvasAttributes(currentPreviousSize.width, currentPreviousSize.height);
    }

    return () => {
      if (changeEventName) {
        document.removeEventListener(changeEventName, handleFullscreenChange);
      }

      if (currentElement && api.fullscreenElement && api.fullscreenElement() === currentElement) {
        updateCanvasAttributes(currentPreviousSize.width, currentPreviousSize.height);
      }
    };
  }, [
    elementRef,
    handleFullscreenChange,
    calculateFullscreenCanvasSize,
    updateCanvasAttributes,
    previousCanvasSize
  ]);

  const toggleFullscreen = useCallback(async () => {
    if (!elementRef.current || !(api.fullscreenEnabled ? api.fullscreenEnabled() : false)) return;

    const targetState = !isFullscreen;

    if (targetState) {
      if (api.requestFullscreen) {
        try {
          await api.requestFullscreen.call(elementRef.current);
          logger.debug('Fullscreen requested, optimistically setting state and canvas size');

          const { width, height } = calculateFullscreenCanvasSize();
          updateCanvasAttributes(width, height);
          setIsFullscreen(true);
        } catch (err) {
          logger.error(
            `Error attempting to enable full-screen mode: ${err} (${(err as Error).message})`
          );

          updateCanvasAttributes(
            previousCanvasSize.current.width,
            previousCanvasSize.current.height
          );
          setIsFullscreen(false);
        }
      }
    } else {
      if (api.exitFullscreen) {
        try {
          await api.exitFullscreen.call(document);
          logger.debug('Fullscreen exit requested, optimistically setting state and canvas size');

          updateCanvasAttributes(
            previousCanvasSize.current.width,
            previousCanvasSize.current.height
          );
          setIsFullscreen(false);
        } catch (err) {
          logger.error(
            `Error attempting to exit full-screen mode: ${err} (${(err as Error).message})`
          );
        }
      }
    }
  }, [isFullscreen, elementRef, calculateFullscreenCanvasSize, updateCanvasAttributes]);

  useEffect(() => {
    const handleResize = () => {
      if (isFullscreen) {
        logger.debug('Resize event detected while fullscreen, recalculating canvas size...');
        const { width, height } = calculateFullscreenCanvasSize();
        updateCanvasAttributes(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isFullscreen, calculateFullscreenCanvasSize, updateCanvasAttributes]);

  return {
    isFullscreen,
    toggleFullscreen,
    isFullscreenEnabled: !!(api.fullscreenEnabled && api.fullscreenEnabled())
  };
}
