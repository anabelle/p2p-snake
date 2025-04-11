import { renderHook, act } from '@testing-library/react';
import { useUserProfile } from './useUserProfile';
import { UserProfile } from '../types';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

// --- Type Definitions for Hook Props and Return ---
interface UseUserProfileProps {
  connectWebSocket: jest.Mock<(profile: UserProfile) => void>;
  socket: Socket | null;
  // Add gameState later if needed for sync tests
  // latestGameState?: GameState | null;
}

// Refine the return type definition (already present at the end)
// Ensure this matches the actual return type defined at the end of the file
type UseUserProfileReturn = {
  currentUserProfile: UserProfile | null;
  isProfileModalOpen: boolean;
  profileStatus: 'loading' | 'loaded' | 'needed' | 'error';
  openProfileModal: () => void;
  closeProfileModal: () => void;
  saveProfile: (profileData: Omit<UserProfile, 'id'> | UserProfile) => void;
  localPlayerId: string | null;
};

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock dependencies
const mockConnectWebSocket: jest.Mock<(profile: UserProfile) => void> = jest.fn(); // Correct typing
const mockDisconnectWebSocket = jest.fn();
const mockEmitConnected = jest.fn();
const mockEmitDisconnected = jest.fn();

const mockSocket = {
  emit: mockEmitConnected,
  connected: true
} as unknown as Socket; // Cast through unknown

const disconnectedSocket = {
  emit: mockEmitDisconnected,
  connected: false
} as unknown as Socket; // Cast through unknown

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

describe('useUserProfile', () => {
  beforeEach(() => {
    // Reset mocks and localStorage before each test
    localStorageMock.clear();
    mockConnectWebSocket.mockClear();
    mockDisconnectWebSocket.mockClear();
    // Clear the specific mock functions for emit
    mockEmitConnected.mockClear();
    mockEmitDisconnected.mockClear();
    (uuidv4 as jest.Mock).mockClear();
    (uuidv4 as jest.Mock).mockReturnValue('mock-uuid-1234'); // Ensure consistent UUID
  });

  it('should initialize with no profile and modal closed if localStorage is empty', () => {
    // Correct generic order: Result, Props
    const { result } = renderHook<UseUserProfileReturn, UseUserProfileProps>(() =>
      useUserProfile({
        connectWebSocket: mockConnectWebSocket,
        socket: null
      })
    );
    // Now accessing result.current properties should align with UseUserProfileReturn
    expect(result.current.currentUserProfile).toBeNull();
    expect(result.current.isProfileModalOpen).toBe(false);
  });

  it('should indicate profile initialization is needed when localStorage is empty', () => {
    // Correct generic order: Result, Props
    const { result } = renderHook<UseUserProfileReturn, UseUserProfileProps>(() =>
      useUserProfile({
        connectWebSocket: mockConnectWebSocket,
        socket: null
      })
    );
    expect(result.current.profileStatus).toBe('needed');
    expect(result.current.currentUserProfile).toBeNull();
    expect(result.current.isProfileModalOpen).toBe(false);
  });

  it('should load profile from localStorage on initialization and connect', () => {
    const existingProfile: UserProfile = { id: 'user-1', name: 'Test', color: '#111111' };
    localStorageMock.setItem('snakeUserProfile', JSON.stringify(existingProfile));
    // Correct generic order: Result, Props
    const { result } = renderHook<UseUserProfileReturn, UseUserProfileProps>(() =>
      useUserProfile({
        connectWebSocket: mockConnectWebSocket,
        socket: null
      })
    );
    expect(result.current.currentUserProfile).toEqual(existingProfile);
    expect(result.current.profileStatus).toBe('loaded');
    expect(result.current.isProfileModalOpen).toBe(false);
    expect(mockConnectWebSocket).toHaveBeenCalledTimes(1);
    expect(mockConnectWebSocket).toHaveBeenCalledWith(existingProfile);
  });

  it('should handle invalid JSON in localStorage', () => {
    localStorageMock.setItem('snakeUserProfile', 'invalid json');
    // Correct generic order: Result, Props
    const { result } = renderHook<UseUserProfileReturn, UseUserProfileProps>(() =>
      useUserProfile({
        connectWebSocket: mockConnectWebSocket,
        socket: null
      })
    );
    expect(result.current.currentUserProfile).toBeNull();
    expect(result.current.profileStatus).toBe('needed'); // Should require new profile
    expect(mockConnectWebSocket).not.toHaveBeenCalled();
  });

  it('should handle incomplete profile data in localStorage', () => {
    localStorageMock.setItem(
      'snakeUserProfile',
      JSON.stringify({ id: 'user-2', name: 'Incomplete' })
    ); // Missing color
    // Correct generic order: Result, Props
    const { result } = renderHook<UseUserProfileReturn, UseUserProfileProps>(() =>
      useUserProfile({
        connectWebSocket: mockConnectWebSocket,
        socket: null
      })
    );
    expect(result.current.currentUserProfile).toBeNull();
    expect(result.current.profileStatus).toBe('needed');
    expect(mockConnectWebSocket).not.toHaveBeenCalled();
  });

  it('should open and close the profile modal', () => {
    // Correct generic order: Result, Props
    const { result } = renderHook<UseUserProfileReturn, UseUserProfileProps>(() =>
      useUserProfile({
        connectWebSocket: mockConnectWebSocket,
        socket: null
      })
    );
    expect(result.current.isProfileModalOpen).toBe(false);
    act(() => {
      result.current.openProfileModal();
    });
    expect(result.current.isProfileModalOpen).toBe(true);
    act(() => {
      result.current.closeProfileModal();
    });
    expect(result.current.isProfileModalOpen).toBe(false);
  });

  it('should save a new profile, update state, save to localStorage, and connect', () => {
    // Correct generic order: Result, Props
    const { result } = renderHook<UseUserProfileReturn, UseUserProfileProps>(() =>
      useUserProfile({
        connectWebSocket: mockConnectWebSocket,
        socket: null // Socket is null when saving a *new* profile initially
      })
    );
    const newProfileData: Omit<UserProfile, 'id'> = { name: 'Newbie', color: '#ff0000' };
    act(() => {
      result.current.saveProfile(newProfileData);
    });
    const expectedProfile: UserProfile = { ...newProfileData, id: 'mock-uuid-1234' };
    expect(result.current.currentUserProfile).toEqual(expectedProfile);
    expect(result.current.profileStatus).toBe('loaded');
    expect(localStorageMock.getItem('snakeUserProfile')).toEqual(JSON.stringify(expectedProfile));
    expect(result.current.isProfileModalOpen).toBe(false); // Should close modal on save
    expect(mockConnectWebSocket).toHaveBeenCalledTimes(1);
    expect(mockConnectWebSocket).toHaveBeenCalledWith(expectedProfile);
    expect(mockEmitConnected).not.toHaveBeenCalled(); // Check specific emit mock
    expect(uuidv4).toHaveBeenCalledTimes(1);
  });

  it('should update an existing profile, update state, save to localStorage, and emit update', () => {
    const existingProfile: UserProfile = {
      id: 'user-existing',
      name: 'Old Name',
      color: '#00ff00'
    };
    localStorageMock.setItem('snakeUserProfile', JSON.stringify(existingProfile));
    // Correct generic order: Result, Props
    const { result, rerender } = renderHook<UseUserProfileReturn, UseUserProfileProps>(
      (props) => useUserProfile(props),
      { initialProps: { connectWebSocket: mockConnectWebSocket, socket: null } }
    );
    rerender({ connectWebSocket: mockConnectWebSocket, socket: mockSocket });
    expect(result.current.currentUserProfile).toEqual(existingProfile);
    expect(mockConnectWebSocket).toHaveBeenCalledTimes(1);
    mockConnectWebSocket.mockClear();
    const updatedProfileData: UserProfile = {
      id: 'user-existing',
      name: 'New Name',
      color: '#0000ff'
    };
    act(() => {
      result.current.saveProfile(updatedProfileData);
    });
    expect(result.current.currentUserProfile).toEqual(updatedProfileData);
    expect(result.current.profileStatus).toBe('loaded');
    expect(localStorageMock.getItem('snakeUserProfile')).toEqual(
      JSON.stringify(updatedProfileData)
    );
    expect(result.current.isProfileModalOpen).toBe(false);
    expect(mockConnectWebSocket).not.toHaveBeenCalled();
    expect(mockEmitConnected).toHaveBeenCalledTimes(1);
    expect(mockEmitConnected).toHaveBeenCalledWith('updateProfile', {
      name: 'New Name',
      color: '#0000ff'
    });
    expect(mockEmitDisconnected).not.toHaveBeenCalled();
    expect(uuidv4).not.toHaveBeenCalled();
  });

  it('should not emit update if socket is not connected when updating profile', () => {
    const existingProfile: UserProfile = {
      id: 'user-disconnected',
      name: 'Offline',
      color: '#cccccc'
    };
    localStorageMock.setItem('snakeUserProfile', JSON.stringify(existingProfile));
    // Correct generic order: Result, Props
    const { result, rerender } = renderHook<UseUserProfileReturn, UseUserProfileProps>(
      (props) => useUserProfile(props),
      { initialProps: { connectWebSocket: mockConnectWebSocket, socket: null } }
    );
    rerender({ connectWebSocket: mockConnectWebSocket, socket: disconnectedSocket });
    mockConnectWebSocket.mockClear();
    const updatedProfileData: UserProfile = { ...existingProfile, name: 'Offline Updated' };
    act(() => {
      result.current.saveProfile(updatedProfileData);
    });
    expect(result.current.currentUserProfile).toEqual(updatedProfileData);
    expect(localStorageMock.getItem('snakeUserProfile')).toEqual(
      JSON.stringify(updatedProfileData)
    );
    expect(mockEmitDisconnected).not.toHaveBeenCalled();
    expect(mockEmitConnected).not.toHaveBeenCalled();
    expect(mockConnectWebSocket).not.toHaveBeenCalled();
  });

  // Add tests for the sync effect (handling updates from server) later
  // This requires mocking the gameState update mechanism, which is outside this hook's direct responsibility
  // but the hook needs to react to it. We'll pass gameState as a prop for this.
});

// Remove the duplicate type definition at the end if it exists, keep the one at the top.
// type UseUserProfileReturn = { ... }; // REMOVE this if duplicated
