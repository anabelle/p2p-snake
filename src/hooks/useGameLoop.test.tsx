import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useGameLoop } from './useGameLoop'; // Hook doesn't exist yet

// Tell Jest to use fake timers
jest.useFakeTimers();

describe('useGameLoop', () => {
  // No longer need beforeEach/afterEach for manual mocks
  // We will use Jest's built-in fake timers

  it('should call the draw function repeatedly when active', () => {
    const mockDraw = jest.fn();
    const isActive = true; // Start the loop

    renderHook(() => useGameLoop(mockDraw, isActive));

    // Initially, the draw function might not have been called yet (depends on timing)
    // Let's advance the timers by one frame
    act(() => {
      jest.advanceTimersByTime(16); // Advance by roughly one frame duration (e.g., 16ms for ~60fps)
    });

    // Now the draw function should have been called at least once
    expect(mockDraw).toHaveBeenCalled();

    // Let's advance timers again to simulate another frame
    const initialCallCount = mockDraw.mock.calls.length;
    act(() => {
      jest.advanceTimersByTime(16);
    });

    // Expect the draw function to have been called again
    expect(mockDraw.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('should not call the draw function when inactive', () => {
    const mockDraw = jest.fn();
    const isActive = false; // Do not start the loop

    renderHook(() => useGameLoop(mockDraw, isActive));

    // Advance timers just in case, but it shouldn't trigger the callback
    act(() => {
      jest.advanceTimersByTime(100); // Advance significantly
    });

    expect(mockDraw).not.toHaveBeenCalled();
  });

  // Add more tests later for starting/stopping the loop, dependencies, etc.
  // Example: Test stopping the loop
  it('should stop calling the draw function when isActive becomes false', () => {
    const mockDraw = jest.fn();
    let isActive = true;

    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useGameLoop(mockDraw, active),
      {
        initialProps: { active: isActive }
      }
    );

    // Advance time, expect calls
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(mockDraw.mock.calls.length).toBeGreaterThan(0);

    const callCountBeforeStop = mockDraw.mock.calls.length;

    // Rerender with isActive = false
    isActive = false;
    rerender({ active: isActive });

    // Advance time again, expect no *new* calls
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(mockDraw.mock.calls.length).toBe(callCountBeforeStop);
  });
});
