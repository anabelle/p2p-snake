import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from './useWebSocket'; // Revert to original path
import { UserProfile } from '../types'; // Adjust path as necessary
import io from 'socket.io-client';

// Mock the socket.io-client library
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(), // Add connect mock if needed for explicit connection tests
    connected: false // Start as not connected
  };
  return jest.fn(() => mockSocket);
});

// Mock the v4 function from uuid
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
  let mockSocketInstance: any; // Type based on your mock structure

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Setup the mock io instance and the socket it returns
    mockIo = io as jest.MockedFunction<typeof io>;
    // Access the actual mock socket instance returned by the factory
    // This requires the mock factory to be structured to allow access,
    // or we might need to refine the mock setup.
    // For now, let's assume the last call to io() gives us the instance we need.
    if (mockIo.mock.results.length > 0) {
      mockSocketInstance = mockIo.mock.results[mockIo.mock.results.length - 1].value;
    } else {
      // If io() hasn't been called yet (e.g., in initial state test),
      // we might manually create a mock socket instance for assertions if needed,
      // or adjust the test structure.
      // For the initial state test, we don't expect io() to be called yet.
      mockSocketInstance = {
        // A default mock instance structure
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connect: jest.fn(),
        connected: false
      };
      // Make io return this specific instance if called
      mockIo.mockReturnValue(mockSocketInstance);
    }
  });

  it('should initialize with disconnected state and null socket/gameState', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.socket).toBeNull();
    expect(result.current.latestGameState).toBeNull();
    // Expect connect function to be defined
    expect(typeof result.current.connect).toBe('function');
    // Ensure io() was not called just by rendering the hook
    expect(mockIo).not.toHaveBeenCalled();
  });

  it('should connect to the WebSocket server and set up listeners when connect is called', () => {
    const { result } = renderHook(() => useWebSocket());

    // Call the connect function
    act(() => {
      result.current.connect(mockProfile);
    });

    // Verify io was called correctly
    expect(mockIo).toHaveBeenCalledTimes(1);
    // You might need to adjust the expected URL based on your env or constants
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

    // Verify the socket instance is stored (accessing via ref might be tricky in tests,
    // we might need to expose it differently or rely on mock calls)
    // For now, let's verify listeners were attached to the mock socket instance
    expect(mockSocketInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocketInstance.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocketInstance.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    expect(mockSocketInstance.on).toHaveBeenCalledWith('state-sync', expect.any(Function));

    // Verify the socket reference is updated in the hook's internal state (indirectly)
    // We expect the returned socket NOT to be null anymore if connection was initiated.
    // Note: Direct ref checking might not work as expected due to closure/timing.
    // We will test state changes caused by events later.
    // For now, we know io() was called, which creates the socket.
  });

  it('should set isConnected to true when the socket connect event fires', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect(mockProfile);
    });

    // Simulate the connect event
    act(() => {
      // Find the 'connect' handler attached in the test setup and call it
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

    // Connect first
    act(() => {
      result.current.connect(mockProfile);
      // Simulate connection succeeding
      mockSocketInstance.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect'
      )?.[1]();
    });

    // Ensure initially connected
    expect(result.current.isConnected).toBe(true);

    // Simulate the disconnect event
    act(() => {
      const disconnectHandler = mockSocketInstance.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'disconnect'
      )?.[1];
      if (disconnectHandler) {
        disconnectHandler('io server disconnect'); // Pass a reason
      } else {
        throw new Error('Disconnect handler not found');
      }
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.latestGameState).toBeNull();
    // Note: socket ref might still exist due to potential reconnect logic in socket.io
  });

  it('should set isConnected to false and clear state on connect_error event', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect(mockProfile);
    });

    // Simulate the connect_error event
    act(() => {
      const connectErrorHandler = mockSocketInstance.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect_error'
      )?.[1];
      if (connectErrorHandler) {
        connectErrorHandler(new Error('Connection failed')); // Pass an error
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

    // Simulate the state-sync event
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

    // First connection
    act(() => {
      result.current.connect(mockProfile);
    });
    expect(mockIo).toHaveBeenCalledTimes(1);

    // Attempt second connection
    act(() => {
      result.current.connect(mockProfile);
    });
    // io() should not be called again
    expect(mockIo).toHaveBeenCalledTimes(1);
  });

  it('should call socket.disconnect, clear listeners, and reset state when disconnect function is called', () => {
    const { result } = renderHook(() => useWebSocket());

    // Connect first
    act(() => {
      result.current.connect(mockProfile);
      // Simulate connection succeeding and receiving state
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

    // Call the hook's disconnect function
    act(() => {
      result.current.disconnect();
    });

    // Verify socket actions
    expect(mockSocketInstance.disconnect).toHaveBeenCalledTimes(1);
    // Check that .off was called for each event type
    expect(mockSocketInstance.off).toHaveBeenCalledWith('connect');
    expect(mockSocketInstance.off).toHaveBeenCalledWith('disconnect');
    expect(mockSocketInstance.off).toHaveBeenCalledWith('connect_error');
    expect(mockSocketInstance.off).toHaveBeenCalledWith('state-sync');

    // Verify state reset
    expect(result.current.isConnected).toBe(false);
    expect(result.current.latestGameState).toBeNull();
    expect(result.current.socket).toBeNull(); // Explicit disconnect should null the ref
  });

  it('should clean up listeners and disconnect socket on unmount', () => {
    // Render the hook first
    const { result, unmount } = renderHook(() => useWebSocket());

    // Connect first
    act(() => {
      // Use the connect function from the rendered hook instance
      result.current.connect(mockProfile);
    });

    // Ensure the mockSocketInstance reference is correct *before* unmount
    // Re-assign based on the latest call to io(), assuming connect worked
    if (mockIo.mock.results.length > 0) {
      mockSocketInstance = mockIo.mock.results[mockIo.mock.results.length - 1].value;
    }

    // Call unmount
    unmount();

    // Verify cleanup actions on the *last known* mock socket instance
    expect(mockSocketInstance.disconnect).toHaveBeenCalledTimes(1);
    // Check that .off was called for each event type
    expect(mockSocketInstance.off).toHaveBeenCalledWith('connect');
    expect(mockSocketInstance.off).toHaveBeenCalledWith('disconnect');
    expect(mockSocketInstance.off).toHaveBeenCalledWith('connect_error');
    expect(mockSocketInstance.off).toHaveBeenCalledWith('state-sync');
  });
});
