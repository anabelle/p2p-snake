import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { UserProfile } from './types'; // Assuming types are in src/types.ts or similar

// --- Mock Custom Hooks ---

// Mock useWebSocket
jest.mock('./hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    isConnected: false,
    socket: null,
    latestGameState: null,
    connect: jest.fn(),
    disconnect: jest.fn()
  }))
}));

// Mock useUserProfile
const mockOpenProfileModal = jest.fn();
const mockCloseProfileModal = jest.fn();
const mockSaveProfile = jest.fn();
jest.mock('./hooks/useUserProfile', () => ({
  useUserProfile: jest.fn(() => ({
    currentUserProfile: null as UserProfile | null,
    isProfileModalOpen: false,
    profileStatus: 'loading', // Default mock status
    localPlayerId: null,
    openProfileModal: mockOpenProfileModal,
    closeProfileModal: mockCloseProfileModal,
    saveProfile: mockSaveProfile
  }))
}));

// Mock useGameAdapter
jest.mock('./hooks/useGameAdapter', () => ({
  useGameAdapter: jest.fn(() => ({ current: null })) // Simple mock for now
}));

// Mock useGameStateSync
jest.mock('./hooks/useGameStateSync', () => ({
  useGameStateSync: jest.fn(() => ({
    syncedGameState: null,
    gameStateRef: { current: null }
  }))
}));

// Mock useGameControls (doesn't return anything, just sets up listeners)
jest.mock('./hooks/useGameControls', () => ({
  useGameControls: jest.fn()
}));

// Mock useGameRenderer (doesn't return anything, just sets up rendering)
jest.mock('./hooks/useGameRenderer', () => ({
  useGameRenderer: jest.fn()
}));

// Mock useCanvasElement
jest.mock('./hooks/useCanvasElement', () => ({
  __esModule: true, // Necessary for default exports if applicable
  default: jest.fn(() => ({
    canvasRef: { current: null } // Mock canvas ref
  }))
}));

// Mock Child Components (Optional but can simplify App testing)
jest.mock('./components/ProfileModal', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid='mock-profile-modal'>Profile Modal</div> : null
}));
jest.mock('./components/GameArea', () => ({
  __esModule: true,
  default: () => <div data-testid='mock-game-area'>Game Area</div>
}));
jest.mock('./components/InfoPanel', () => ({
  __esModule: true,
  default: () => <div data-testid='mock-info-panel'>Info Panel</div>
}));

// Mock react-modal setAppElement to avoid errors in test environment
jest.mock('react-modal', () => {
  const modal = jest.requireActual('react-modal');
  modal.setAppElement = jest.fn(); // Mock setAppElement
  return modal;
});

// --- Test Suite ---

describe('<App />', () => {
  // Clear mocks before each test
  beforeEach(() => {
    // Reset mocks for individual tests if needed
    jest.clearAllMocks();

    // Reset specific hook mocks to default states
    (require('./hooks/useWebSocket').useWebSocket as jest.Mock).mockReturnValue({
      isConnected: false,
      socket: null,
      latestGameState: null,
      connect: jest.fn(),
      disconnect: jest.fn()
    });
    (require('./hooks/useUserProfile').useUserProfile as jest.Mock).mockReturnValue({
      currentUserProfile: null,
      isProfileModalOpen: false,
      profileStatus: 'loading',
      localPlayerId: null,
      openProfileModal: mockOpenProfileModal,
      closeProfileModal: mockCloseProfileModal,
      saveProfile: mockSaveProfile
    });
    (require('./hooks/useCanvasElement').default as jest.Mock).mockReturnValue({
      canvasRef: { current: null }
    });
    (require('./hooks/useGameStateSync').useGameStateSync as jest.Mock).mockReturnValue({
      syncedGameState: null,
      gameStateRef: { current: null }
    });
    (require('./hooks/useGameAdapter').useGameAdapter as jest.Mock).mockReturnValue({
      current: null
    });
  });

  it('renders without crashing', () => {
    render(<App />);
    // Check for a high-level element, like the main heading
    expect(screen.getByRole('heading', { name: /multiplayer snake game/i })).toBeInTheDocument();
  });

  it('renders the main heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /multiplayer snake game/i })).toBeInTheDocument();
  });

  it('renders GameArea and InfoPanel components', () => {
    render(<App />);
    expect(screen.getByTestId('mock-game-area')).toBeInTheDocument();
    expect(screen.getByTestId('mock-info-panel')).toBeInTheDocument();
  });

  it('opens the ProfileModal when profileStatus is "needed"', async () => {
    // Arrange: Set useUserProfile mock to return 'needed' status
    (require('./hooks/useUserProfile').useUserProfile as jest.Mock).mockReturnValue({
      currentUserProfile: null,
      isProfileModalOpen: true, // Simulate modal being open based on status change
      profileStatus: 'needed',
      localPlayerId: null,
      openProfileModal: mockOpenProfileModal,
      closeProfileModal: mockCloseProfileModal,
      saveProfile: mockSaveProfile
    });

    render(<App />);

    // Act & Assert: Check if the modal appears (or the mock component is rendered)
    // Need to wait because the effect that calls openProfileModal is async
    await waitFor(() => {
      // Wait specifically for the modal to appear
      expect(screen.getByTestId('mock-profile-modal')).toBeInTheDocument();
    });
    // After waiting, assert that the function was called
    expect(mockOpenProfileModal).toHaveBeenCalled();
  });

  it('opens the ProfileModal when profileStatus is "error"', async () => {
    // Arrange: Set useUserProfile mock to return 'error' status
    (require('./hooks/useUserProfile').useUserProfile as jest.Mock).mockReturnValue({
      currentUserProfile: null,
      isProfileModalOpen: true, // Simulate modal being open based on status change
      profileStatus: 'error',
      localPlayerId: null,
      openProfileModal: mockOpenProfileModal,
      closeProfileModal: mockCloseProfileModal,
      saveProfile: mockSaveProfile
    });

    render(<App />);

    // Act & Assert: Check if the modal appears
    await waitFor(() => {
      // Wait specifically for the modal to appear
      expect(screen.getByTestId('mock-profile-modal')).toBeInTheDocument();
    });
    // After waiting, assert that the function was called
    expect(mockOpenProfileModal).toHaveBeenCalled();
  });

  it('calls disconnectWebSocket on unmount', () => {
    const mockDisconnect = jest.fn();
    (require('./hooks/useWebSocket').useWebSocket as jest.Mock).mockReturnValue({
      isConnected: false,
      socket: null,
      latestGameState: null,
      connect: jest.fn(),
      disconnect: mockDisconnect
    });

    const { unmount } = render(<App />);
    unmount();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
