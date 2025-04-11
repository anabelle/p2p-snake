import { renderHook } from '@testing-library/react';
import { useGameControls } from './useGameControls';
import userEvent from '@testing-library/user-event'; // For simulating key presses
import { Socket } from 'socket.io-client'; // Import Socket type

// Mock Socket.IO client
const mockEmit = jest.fn();
// Cast the mock to satisfy the hook's expected type during build
const mockSocket = { emit: mockEmit } as any as Socket;

// Mock game container ref
const mockGameContainerRef = {
  current: document.createElement('div') // A basic element for event listeners
};

describe('useGameControls', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockEmit.mockClear();
    // Add the mock element to the document body so events can bubble
    document.body.appendChild(mockGameContainerRef.current);
    mockGameContainerRef.current.focus(); // Element needs focus to receive keyboard events
  });

  afterEach(() => {
    // Clean up the element after each test
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

  // Add tests for touch/swipe events if useGameInput supports them and they are needed
  // For now, focusing on keyboard input based on the existing App.tsx logic
});
