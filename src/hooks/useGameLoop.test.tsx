import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useGameLoop } from './useGameLoop';

jest.useFakeTimers();

describe('useGameLoop', () => {
  it('should call the draw function repeatedly when active', () => {
    const mockDraw = jest.fn();
    const isActive = true;

    renderHook(() => useGameLoop(mockDraw, isActive));

    act(() => {
      jest.advanceTimersByTime(16);
    });

    expect(mockDraw).toHaveBeenCalled();

    const initialCallCount = mockDraw.mock.calls.length;
    act(() => {
      jest.advanceTimersByTime(16);
    });

    expect(mockDraw.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('should not call the draw function when inactive', () => {
    const mockDraw = jest.fn();
    const isActive = false;

    renderHook(() => useGameLoop(mockDraw, isActive));

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockDraw).not.toHaveBeenCalled();
  });

  it('should stop calling the draw function when isActive becomes false', () => {
    const mockDraw = jest.fn();
    let isActive = true;

    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useGameLoop(mockDraw, active),
      {
        initialProps: { active: isActive }
      }
    );

    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(mockDraw.mock.calls.length).toBeGreaterThan(0);

    const callCountBeforeStop = mockDraw.mock.calls.length;

    isActive = false;
    rerender({ active: isActive });

    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(mockDraw.mock.calls.length).toBe(callCountBeforeStop);
  });
});
