import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { UserProfile } from './types';

jest.mock('./hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    isConnected: false,
    socket: null,
    latestGameState: null,
    connect: jest.fn(),
    disconnect: jest.fn()
  }))
}));

const mockOpenProfileModal = jest.fn();
const mockCloseProfileModal = jest.fn();
const mockSaveProfile = jest.fn();
jest.mock('./hooks/useUserProfile', () => ({
  useUserProfile: jest.fn(() => ({
    currentUserProfile: null as UserProfile | null,
    isProfileModalOpen: false,
    profileStatus: 'loading',
    localPlayerId: null,
    openProfileModal: mockOpenProfileModal,
    closeProfileModal: mockCloseProfileModal,
    saveProfile: mockSaveProfile
  }))
}));

jest.mock('./hooks/useGameAdapter', () => ({
  useGameAdapter: jest.fn(() => ({ current: null }))
}));

jest.mock('./hooks/useGameStateSync', () => ({
  useGameStateSync: jest.fn(() => ({
    syncedGameState: null,
    gameStateRef: { current: null }
  }))
}));

jest.mock('./hooks/useGameControls', () => ({
  useGameControls: jest.fn()
}));

jest.mock('./hooks/useGameRenderer', () => ({
  useGameRenderer: jest.fn()
}));

jest.mock('./hooks/useCanvasElement', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    canvasRef: { current: null }
  }))
}));

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

jest.mock('react-modal', () => {
  const modal = jest.requireActual('react-modal');
  modal.setAppElement = jest.fn();
  return modal;
});

describe('<App />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
    (require('./hooks/useUserProfile').useUserProfile as jest.Mock).mockReturnValue({
      currentUserProfile: null,
      isProfileModalOpen: true,
      profileStatus: 'needed',
      localPlayerId: null,
      openProfileModal: mockOpenProfileModal,
      closeProfileModal: mockCloseProfileModal,
      saveProfile: mockSaveProfile
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-profile-modal')).toBeInTheDocument();
    });

    expect(mockOpenProfileModal).toHaveBeenCalled();
  });

  it('opens the ProfileModal when profileStatus is "error"', async () => {
    (require('./hooks/useUserProfile').useUserProfile as jest.Mock).mockReturnValue({
      currentUserProfile: null,
      isProfileModalOpen: true,
      profileStatus: 'error',
      localPlayerId: null,
      openProfileModal: mockOpenProfileModal,
      closeProfileModal: mockCloseProfileModal,
      saveProfile: mockSaveProfile
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-profile-modal')).toBeInTheDocument();
    });

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
