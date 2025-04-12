import { renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useGameInput } from './useGameInput';
import { Direction } from '../game/state/types';

if (typeof Touch === 'undefined') {
  (global as any).Touch = class Touch {
    identifier: number;
    target: EventTarget;
    clientX: number;
    clientY: number;

    constructor(options: {
      identifier: number;
      target: EventTarget;
      clientX: number;
      clientY: number;
    }) {
      this.identifier = options.identifier;
      this.target = options.target;
      this.clientX = options.clientX;
      this.clientY = options.clientY;
    }
  };
}

const simulateSwipe = (
  element: HTMLElement,
  startX: number,
  startY: number,
  endX: number,
  endY: number
) => {
  const touchStart = new Touch({
    identifier: Date.now(),
    target: element,
    clientX: startX,
    clientY: startY
  });
  const touchEnd = new Touch({
    identifier: Date.now(),
    target: element,
    clientX: endX,
    clientY: endY
  });

  const touchStartEvent = new TouchEvent('touchstart', {
    touches: [touchStart],
    changedTouches: [touchStart],
    bubbles: true
  });
  const touchMoveEvent = new TouchEvent('touchmove', {
    touches: [touchStart],
    changedTouches: [touchStart],
    bubbles: true,
    cancelable: true
  });
  const touchEndEvent = new TouchEvent('touchend', {
    touches: [],
    changedTouches: [touchEnd],
    bubbles: true
  });

  act(() => {
    element.dispatchEvent(touchStartEvent);
    element.dispatchEvent(touchMoveEvent);
    element.dispatchEvent(touchEndEvent);
  });
};

describe('useGameInput', () => {
  let setDirection: jest.Mock;
  let mockGameContainerRef: React.RefObject<HTMLDivElement>;
  let containerElement: HTMLDivElement;

  beforeEach(() => {
    setDirection = jest.fn();

    containerElement = document.createElement('div');

    mockGameContainerRef = { current: containerElement };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update direction on arrow key press', async () => {
    renderHook(() => useGameInput(mockGameContainerRef, setDirection));

    await userEvent.keyboard('{ArrowUp}');
    expect(setDirection).toHaveBeenCalledWith(Direction.UP);
    setDirection.mockClear();

    await userEvent.keyboard('{ArrowDown}');
    expect(setDirection).toHaveBeenCalledWith(Direction.DOWN);
    setDirection.mockClear();

    await userEvent.keyboard('{ArrowLeft}');
    expect(setDirection).toHaveBeenCalledWith(Direction.LEFT);
    setDirection.mockClear();

    await userEvent.keyboard('{ArrowRight}');
    expect(setDirection).toHaveBeenCalledWith(Direction.RIGHT);
    setDirection.mockClear();

    await userEvent.keyboard('w');
    expect(setDirection).toHaveBeenCalledWith(Direction.UP);
    setDirection.mockClear();

    await userEvent.keyboard('s');
    expect(setDirection).toHaveBeenCalledWith(Direction.DOWN);
    setDirection.mockClear();

    await userEvent.keyboard('a');
    expect(setDirection).toHaveBeenCalledWith(Direction.LEFT);
    setDirection.mockClear();

    await userEvent.keyboard('d');
    expect(setDirection).toHaveBeenCalledWith(Direction.RIGHT);
  });

  it('should update direction on touch swipe', () => {
    renderHook(() => useGameInput(mockGameContainerRef, setDirection));

    simulateSwipe(containerElement, 50, 100, 150, 100);
    expect(setDirection).toHaveBeenCalledWith(Direction.RIGHT);
    setDirection.mockClear();

    simulateSwipe(containerElement, 150, 100, 50, 100);
    expect(setDirection).toHaveBeenCalledWith(Direction.LEFT);
    setDirection.mockClear();

    simulateSwipe(containerElement, 100, 50, 100, 150);
    expect(setDirection).toHaveBeenCalledWith(Direction.DOWN);
    setDirection.mockClear();

    simulateSwipe(containerElement, 100, 150, 100, 50);
    expect(setDirection).toHaveBeenCalledWith(Direction.UP);
    setDirection.mockClear();
  });

  it('should not update direction for short swipes', () => {
    renderHook(() => useGameInput(mockGameContainerRef, setDirection));

    simulateSwipe(containerElement, 100, 100, 110, 110);
    expect(setDirection).not.toHaveBeenCalled();
  });

  it('should prevent default behavior for touchmove', () => {
    renderHook(() => useGameInput(mockGameContainerRef, setDirection));

    const touchStart = new Touch({
      identifier: 1,
      target: containerElement,
      clientX: 100,
      clientY: 100
    });
    const touchMove = new Touch({
      identifier: 1,
      target: containerElement,
      clientX: 110,
      clientY: 110
    });

    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [touchStart],
      changedTouches: [touchStart],
      bubbles: true
    });
    const touchMoveEvent = new TouchEvent('touchmove', {
      touches: [touchStart],
      changedTouches: [touchMove],
      bubbles: true,
      cancelable: true
    });

    const preventDefaultSpy = jest.spyOn(touchMoveEvent, 'preventDefault');

    act(() => {
      containerElement.dispatchEvent(touchStartEvent);
      containerElement.dispatchEvent(touchMoveEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });
});
