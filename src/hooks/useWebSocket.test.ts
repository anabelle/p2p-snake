import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from './useWebSocket'; // Assuming the hook is in the same directory
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

  // Add more tests here for connection, disconnection, errors, state sync, etc.
});
