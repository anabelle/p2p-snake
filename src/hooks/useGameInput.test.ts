import { renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // Import userEvent
import React from 'react'; // Import React for RefObject
import { useGameInput } from './useGameInput';
import { Direction } from '../game/state/types';

// Mock the Touch class if it doesn't exist in the test environment (like JSDOM)
if (typeof Touch === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Helper function to simulate swipe
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
  }); // Added move
  const touchEndEvent = new TouchEvent('touchend', {
    touches: [],
    changedTouches: [touchEnd],
    bubbles: true
  });

  act(() => {
    element.dispatchEvent(touchStartEvent);
    element.dispatchEvent(touchMoveEvent); // Simulate move to trigger preventDefault
    element.dispatchEvent(touchEndEvent);
  });
};

describe('useGameInput', () => {
  let setDirection: jest.Mock;
  let mockGameContainerRef: React.RefObject<HTMLDivElement>;
  let containerElement: HTMLDivElement;

  beforeEach(() => {
    setDirection = jest.fn();
    // Create a real element to attach events to
    containerElement = document.createElement('div');
    // document.body.appendChild(containerElement); // Removed: Avoid direct node access
    mockGameContainerRef = { current: containerElement };
  });

  afterEach(() => {
    // Clean up the mock element
    // No need to manually remove from body if it wasn't added directly
    // if (containerElement && containerElement.parentNode) {
    //   containerElement.parentNode.removeChild(containerElement);
    // }
    jest.clearAllMocks();
  });

  it('should update direction on arrow key press', async () => {
    renderHook(() => useGameInput(mockGameContainerRef, setDirection));

    // Simulate ArrowUp press
    await userEvent.keyboard('{ArrowUp}');
    expect(setDirection).toHaveBeenCalledWith(Direction.UP);
    setDirection.mockClear();

    // Simulate ArrowDown press
    await userEvent.keyboard('{ArrowDown}');
    expect(setDirection).toHaveBeenCalledWith(Direction.DOWN);
    setDirection.mockClear();

    // Simulate ArrowLeft press
    await userEvent.keyboard('{ArrowLeft}');
    expect(setDirection).toHaveBeenCalledWith(Direction.LEFT);
    setDirection.mockClear();

    // Simulate ArrowRight press
    await userEvent.keyboard('{ArrowRight}');
    expect(setDirection).toHaveBeenCalledWith(Direction.RIGHT);
    setDirection.mockClear();

    // Simulate 'w' press (alternative for UP)
    await userEvent.keyboard('w');
    expect(setDirection).toHaveBeenCalledWith(Direction.UP);
    setDirection.mockClear();

    // Simulate 's' press (alternative for DOWN)
    await userEvent.keyboard('s');
    expect(setDirection).toHaveBeenCalledWith(Direction.DOWN);
    setDirection.mockClear();

    // Simulate 'a' press (alternative for LEFT)
    await userEvent.keyboard('a');
    expect(setDirection).toHaveBeenCalledWith(Direction.LEFT);
    setDirection.mockClear();

    // Simulate 'd' press (alternative for RIGHT)
    await userEvent.keyboard('d');
    expect(setDirection).toHaveBeenCalledWith(Direction.RIGHT);
  });

  it('should update direction on touch swipe', () => {
    renderHook(() => useGameInput(mockGameContainerRef, setDirection));

    // Swipe Right
    // eslint-disable-next-line testing-library/no-node-access
    simulateSwipe(containerElement, 50, 100, 150, 100);
    expect(setDirection).toHaveBeenCalledWith(Direction.RIGHT);
    setDirection.mockClear();

    // Swipe Left
    // eslint-disable-next-line testing-library/no-node-access
    simulateSwipe(containerElement, 150, 100, 50, 100);
    expect(setDirection).toHaveBeenCalledWith(Direction.LEFT);
    setDirection.mockClear();

    // Swipe Down (Screen Y increases downwards)
    // eslint-disable-next-line testing-library/no-node-access
    simulateSwipe(containerElement, 100, 50, 100, 150);
    expect(setDirection).toHaveBeenCalledWith(Direction.DOWN);
    setDirection.mockClear();

    // Swipe Up (Screen Y decreases upwards)
    // eslint-disable-next-line testing-library/no-node-access
    simulateSwipe(containerElement, 100, 150, 100, 50);
    expect(setDirection).toHaveBeenCalledWith(Direction.UP);
    setDirection.mockClear();
  });

  it('should not update direction for short swipes', () => {
    renderHook(() => useGameInput(mockGameContainerRef, setDirection));

    // eslint-disable-next-line testing-library/no-node-access
    simulateSwipe(containerElement, 100, 100, 110, 110); // Short diagonal swipe
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
