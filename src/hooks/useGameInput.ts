import React, { useEffect, useCallback, useRef } from 'react';
import { Direction } from '../game/state/types';

const keyDirectionMap: { [key: string]: Direction } = {
  ArrowUp: Direction.UP,
  ArrowDown: Direction.DOWN,
  ArrowLeft: Direction.LEFT,
  ArrowRight: Direction.RIGHT,
  w: Direction.UP,
  s: Direction.DOWN,
  a: Direction.LEFT,
  d: Direction.RIGHT
};

export const useGameInput = (
  gameContainerRef: React.RefObject<HTMLElement | null>,
  setDirection: (direction: Direction) => void
) => {
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const swipeThreshold = 30;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }

      const direction = keyDirectionMap[event.key];

      if (direction) {
        setDirection(direction);

        if (event.key.startsWith('Arrow')) {
          event.preventDefault();
        }
      }
    },
    [setDirection]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    const gameArea = gameContainerRef.current;
    if (!gameArea) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        touchStartPos.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (touchStartPos.current) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchStartPos.current || event.changedTouches.length === 0) return;

      const touchEndPos = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY
      };
      const dx = touchEndPos.x - touchStartPos.current.x;
      const dy = touchEndPos.y - touchStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > swipeThreshold) {
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        let detectedDirection: Direction | null = null;

        if (angle >= -45 && angle < 45) {
          detectedDirection = Direction.RIGHT;
        } else if (angle >= 45 && angle < 135) {
          detectedDirection = Direction.DOWN;
        } else if (angle >= 135 || angle < -135) {
          detectedDirection = Direction.LEFT;
        } else if (angle >= -135 && angle < -45) {
          detectedDirection = Direction.UP;
        }

        if (detectedDirection) {
          setDirection(detectedDirection);
        }
      }

      touchStartPos.current = null;
    };

    gameArea.addEventListener('touchstart', handleTouchStart, { passive: false });
    gameArea.addEventListener('touchmove', handleTouchMove, { passive: false });
    gameArea.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      gameArea.removeEventListener('touchstart', handleTouchStart);
      gameArea.removeEventListener('touchmove', handleTouchMove);
      gameArea.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameContainerRef, setDirection, swipeThreshold]);
};
