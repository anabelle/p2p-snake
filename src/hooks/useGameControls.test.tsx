import { renderHook } from '@testing-library/react';
import { useGameControls } from './useGameControls';
import userEvent from '@testing-library/user-event';
import { Socket } from 'socket.io-client';

const mockEmit = jest.fn();

const mockSocket = { emit: mockEmit } as any as Socket;

const mockGameContainerRef = {
  current: document.createElement('div')
};

describe('useGameControls', () => {
  beforeEach(() => {
    mockEmit.mockClear();

    document.body.appendChild(mockGameContainerRef.current);
    mockGameContainerRef.current.focus();
  });

  afterEach(() => {
    document.body.removeChild(mockGameContainerRef.current);
  });

  it('should not emit input if socket is null or not connected', async () => {
    renderHook(() => useGameControls(null, false, mockGameContainerRef));
    await userEvent.keyboard('{ArrowUp}');
    expect(mockEmit).not.toHaveBeenCalled();

    renderHook(() => useGameControls(mockSocket, false, mockGameContainerRef));
    await userEvent.keyboard('{ArrowLeft}');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('should emit correct input event on ArrowUp key press when connected', async () => {
    renderHook(() => useGameControls(mockSocket, true, mockGameContainerRef));
    await userEvent.keyboard('{ArrowUp}');
    expect(mockEmit).toHaveBeenCalledWith('input', { dx: 0, dy: 1 });
    expect(mockEmit).toHaveBeenCalledTimes(1);
  });

  it('should emit correct input event on ArrowDown key press when connected', async () => {
    renderHook(() => useGameControls(mockSocket, true, mockGameContainerRef));
    await userEvent.keyboard('{ArrowDown}');
    expect(mockEmit).toHaveBeenCalledWith('input', { dx: 0, dy: -1 });
    expect(mockEmit).toHaveBeenCalledTimes(1);
  });

  it('should emit correct input event on ArrowLeft key press when connected', async () => {
    renderHook(() => useGameControls(mockSocket, true, mockGameContainerRef));
    await userEvent.keyboard('{ArrowLeft}');
    expect(mockEmit).toHaveBeenCalledWith('input', { dx: -1, dy: 0 });
    expect(mockEmit).toHaveBeenCalledTimes(1);
  });

  it('should emit correct input event on ArrowRight key press when connected', async () => {
    renderHook(() => useGameControls(mockSocket, true, mockGameContainerRef));
    await userEvent.keyboard('{ArrowRight}');
    expect(mockEmit).toHaveBeenCalledWith('input', { dx: 1, dy: 0 });
    expect(mockEmit).toHaveBeenCalledTimes(1);
  });
});
