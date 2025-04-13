import { useState, useCallback, useEffect, useRef } from 'react';
import logger from '../utils/logger';

interface FullscreenApi {
  requestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
  exitFullscreen?: () => Promise<void>;
  fullscreenElement?: () => Element | null;
  fullscreenEnabled?: () => boolean;
  fullscreenChangeEvent?: string | null;
}

export function getFullscreenApi(): FullscreenApi {
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

const ASPECT_RATIO = 50 / 30;

export function useFullscreen(
  elementRef: React.RefObject<HTMLElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  originalCanvasWidth: number,
  originalCanvasHeight: number
) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previousCanvasSize = useRef({ width: originalCanvasWidth, height: originalCanvasHeight });
  const apiRef = useRef<FullscreenApi>(getFullscreenApi());

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

    
    const minWidth = originalCanvasWidth;
    const minHeight = originalCanvasHeight;

    
    let newWidth = maxWidth;
    let newHeight = newWidth / ASPECT_RATIO;

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * ASPECT_RATIO;
    }

    
    newWidth = Math.max(Math.floor(newWidth), minWidth);
    newHeight = Math.max(Math.floor(newHeight), minHeight);

    logger.debug(`Calculated fullscreen canvas size: ${newWidth}x${newHeight}`);
    return { width: newWidth, height: newHeight };
  }, [originalCanvasWidth, originalCanvasHeight]);

  const checkAndApplyFullscreenState = useCallback(() => {
    const currentApi = apiRef.current;
    const currentFullscreenElement = currentApi.fullscreenElement
      ? currentApi.fullscreenElement()
      : null;
    const currentlyFullscreen = currentFullscreenElement === elementRef.current;

    logger.debug('Fullscreen check triggered, currently fullscreen:', currentlyFullscreen);
    setIsFullscreen(currentlyFullscreen);

    if (currentlyFullscreen) {
      const { width, height } = calculateFullscreenCanvasSize();
      updateCanvasAttributes(width, height);
    } else {
      if (previousCanvasSize.current) {
        updateCanvasAttributes(previousCanvasSize.current.width, previousCanvasSize.current.height);
      }
      if (elementRef.current) {
        elementRef.current.style.position = 'static';
        elementRef.current.style.width = 'auto';
        elementRef.current.style.height = 'auto';
        elementRef.current.style.top = 'auto';
        elementRef.current.style.left = 'auto';
      }
    }
  }, [elementRef, calculateFullscreenCanvasSize, updateCanvasAttributes]);

  const handleResize = useCallback(() => {
    if (isFullscreen) {
      logger.debug('Resize event detected while fullscreen, recalculating canvas size...');
      const { width, height } = calculateFullscreenCanvasSize();
      updateCanvasAttributes(width, height);
    }
  }, [isFullscreen, calculateFullscreenCanvasSize, updateCanvasAttributes]);

  const handleFullscreenChange = useCallback(() => {
    checkAndApplyFullscreenState();
  }, [checkAndApplyFullscreenState]);

  useEffect(() => {
    const currentApi = apiRef.current;
    const changeEventName = currentApi.fullscreenChangeEvent;

    const currentElement = elementRef.current;
    const currentPreviousSize = previousCanvasSize.current;

    if (changeEventName && currentElement) {
      document.addEventListener(changeEventName, handleFullscreenChange);
      logger.debug(`Added fullscreenchange listener: ${changeEventName}`);
    } else {
      logger.debug('Not adding fullscreenchange listener', { changeEventName, currentElement });
    }

    checkAndApplyFullscreenState();

    window.addEventListener('resize', handleResize);
    logger.debug('Added resize listener');

    const apiForCleanup = apiRef.current;
    return () => {
      if (changeEventName) {
        document.removeEventListener(changeEventName, handleFullscreenChange);
        logger.debug(`Removed fullscreenchange listener: ${changeEventName}`);
      }
      window.removeEventListener('resize', handleResize);
      logger.debug('Removed resize listener');

      const stillFullscreenElement = apiForCleanup.fullscreenElement
        ? apiForCleanup.fullscreenElement()
        : null;
      if (currentElement && stillFullscreenElement === currentElement) {
        if (currentPreviousSize) {
          updateCanvasAttributes(currentPreviousSize.width, currentPreviousSize.height);
        }

        currentElement.style.position = 'static';
        currentElement.style.width = 'auto';
        currentElement.style.height = 'auto';
        currentElement.style.top = 'auto';
        currentElement.style.left = 'auto';
        logger.debug(
          'Cleanup: Reset canvas size and container styles on unmount while fullscreen.'
        );
      } else {
        logger.debug('Cleanup: Not in fullscreen on unmount or element missing.');
      }
    };
  }, [
    elementRef,
    handleFullscreenChange,
    calculateFullscreenCanvasSize,
    updateCanvasAttributes,
    previousCanvasSize,
    checkAndApplyFullscreenState,
    handleResize
  ]);

  const toggleFullscreen = useCallback(async () => {
    const currentApi = apiRef.current;
    const element = elementRef.current;

    const isEnabled = currentApi.fullscreenEnabled ? currentApi.fullscreenEnabled() : false;
    logger.debug('[Toggle Check]', {
      elementExists: !!element,
      isEnabled,
      willProceed: !!element && isEnabled
    });

    if (!element || !isEnabled) {
      logger.debug('Fullscreen toggle aborted: Not enabled or element missing.');
      return;
    }

    const targetStateIsFullscreen = !isFullscreen;
    logger.debug(
      `Toggling fullscreen. Current: ${isFullscreen}, Target: ${targetStateIsFullscreen}`
    );

    if (targetStateIsFullscreen) {
      if (currentApi.requestFullscreen) {
        try {
          await currentApi.requestFullscreen.call(element);

          logger.debug('Fullscreen request successful (state update relies on event).');
        } catch (err) {
          logger.error(
            `Error attempting to enable full-screen mode: ${err} (${(err as Error).message})`,
            err
          );

          setIsFullscreen(false);
        }
      } else {
        logger.debug('Request fullscreen API not available.');
      }
    } else {
      if (
        currentApi.exitFullscreen &&
        (currentApi.fullscreenElement ? currentApi.fullscreenElement() : null)
      ) {
        try {
          await currentApi.exitFullscreen.call(document);

          logger.debug('Fullscreen exit successful (state update relies on event).');
        } catch (err) {
          logger.error(
            `Error attempting to exit full-screen mode: ${err} (${(err as Error).message})`,
            err
          );
        }
      } else {
        logger.debug('Exit fullscreen API not available or not currently in fullscreen.');
      }
    }
  }, [isFullscreen, elementRef]);

  return {
    isFullscreen,
    toggleFullscreen,
    isFullscreenEnabled: (() => {
      const currentApi = apiRef.current;
      return !!(currentApi.fullscreenEnabled && currentApi.fullscreenEnabled());
    })(),

    simulateFullscreenChange: checkAndApplyFullscreenState
  };
}
