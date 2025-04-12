import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';
import { UserProfile } from '../types';
import io from 'socket.io-client';

jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
    connected: false
  };
  return jest.fn(() => mockSocket);
});

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4')
}));

const mockProfile: UserProfile = {
  id: 'test-user-id',
  name: 'Test User',
  color: '#ff0000'
};

describe('useWebSocket Hook', () => {
  let mockIo: jest.MockedFunction<typeof io>;
  let mockSocketInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockIo = io as jest.MockedFunction<typeof io>;

    if (mockIo.mock.results.length > 0) {
      mockSocketInstance = mockIo.mock.results[mockIo.mock.results.length - 1].value;
    } else {
      mockSocketInstance = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connect: jest.fn(),
        connected: false
      };

      mockIo.mockReturnValue(mockSocketInstance);
    }
  });

  it('should initialize with disconnected state and null socket/gameState', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.socket).toBeNull();
    expect(result.current.latestGameState).toBeNull();

    expect(typeof result.current.connect).toBe('function');

    expect(mockIo).not.toHaveBeenCalled();
  });

  it('should connect to the WebSocket server and set up listeners when connect is called', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect(mockProfile);
    });

    expect(mockIo).toHaveBeenCalledTimes(1);

    const expectedUrl =
      process.env.REACT_APP_SIGNALING_SERVER_URL || 'https://snake-api-974c0cc98060.herokuapp.com';
    expect(mockIo).toHaveBeenCalledWith(expectedUrl, {
      query: {
        id: mockProfile.id,
        name: mockProfile.name,
        color: mockProfile.color
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    expect(mockSocketInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocketInstance.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocketInstance.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    expect(mockSocketInstance.on).toHaveBeenCalledWith('state-sync', expect.any(Function));
  });

  it('should set isConnected to true when the socket connect event fires', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect(mockProfile);
    });

    act(() => {
      const connectHandler = mockSocketInstance.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect'
      )?.[1];
      if (connectHandler) {
        connectHandler();
      } else {
        throw new Error('Connect handler not found');
      }
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should set isConnected to false and clear state on disconnect event', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect(mockProfile);

      mockSocketInstance.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect'
      )?.[1]();
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      const disconnectHandler = mockSocketInstance.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'disconnect'
      )?.[1];
      if (disconnectHandler) {
        disconnectHandler('io server disconnect');
      } else {
        throw new Error('Disconnect handler not found');
      }
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.latestGameState).toBeNull();
  });

  it('should set isConnected to false and clear state on connect_error event', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect(mockProfile);
    });

    act(() => {
      const connectErrorHandler = mockSocketInstance.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect_error'
      )?.[1];
      if (connectErrorHandler) {
        connectErrorHandler(new Error('Connection failed'));
      } else {
        throw new Error('Connect error handler not found');
      }
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.latestGameState).toBeNull();
  });

  it('should update latestGameState when state-sync event fires', () => {
    const { result } = renderHook(() => useWebSocket());
    const mockGameState = {
      snakes: [],
      food: [],
      powerUps: [],
      activePowerUps: [],
      gridSize: { width: 10, height: 10 },
      timestamp: 123,
      sequence: 1,
      rngSeed: 456,
      playerCount: 0,
      powerUpCounter: 0,
      playerStats: {}
    };

    act(() => {
      result.current.connect(mockProfile);
    });

    act(() => {
      const stateSyncHandler = mockSocketInstance.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'state-sync'
      )?.[1];
      if (stateSyncHandler) {
        stateSyncHandler(mockGameState);
      } else {
        throw new Error('state-sync handler not found');
      }
    });

    expect(result.current.latestGameState).toEqual(mockGameState);
  });

  it('should not connect if already connected (socketRef exists)', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect(mockProfile);
    });
    expect(mockIo).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.connect(mockProfile);
    });

    expect(mockIo).toHaveBeenCalledTimes(1);
  });

  it('should call socket.disconnect, clear listeners, and reset state when disconnect function is called', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect(mockProfile);

      mockSocketInstance.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect'
      )?.[1]();
      mockSocketInstance.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'state-sync'
      )?.[1]({ some: 'state' });
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.latestGameState).not.toBeNull();
    expect(mockSocketInstance.disconnect).not.toHaveBeenCalled();

    act(() => {
      result.current.disconnect();
    });

    expect(mockSocketInstance.disconnect).toHaveBeenCalledTimes(1);

    expect(mockSocketInstance.off).toHaveBeenCalledWith('connect');
    expect(mockSocketInstance.off).toHaveBeenCalledWith('disconnect');
    expect(mockSocketInstance.off).toHaveBeenCalledWith('connect_error');
    expect(mockSocketInstance.off).toHaveBeenCalledWith('state-sync');

    expect(result.current.isConnected).toBe(false);
    expect(result.current.latestGameState).toBeNull();
    expect(result.current.socket).toBeNull();
  });

  it('should clean up listeners and disconnect socket on unmount', () => {
    const { result, unmount } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect(mockProfile);
    });

    if (mockIo.mock.results.length > 0) {
      mockSocketInstance = mockIo.mock.results[mockIo.mock.results.length - 1].value;
    }

    unmount();

    expect(mockSocketInstance.disconnect).toHaveBeenCalledTimes(1);

    expect(mockSocketInstance.off).toHaveBeenCalledWith('connect');
    expect(mockSocketInstance.off).toHaveBeenCalledWith('disconnect');
    expect(mockSocketInstance.off).toHaveBeenCalledWith('connect_error');
    expect(mockSocketInstance.off).toHaveBeenCalledWith('state-sync');
  });
});
