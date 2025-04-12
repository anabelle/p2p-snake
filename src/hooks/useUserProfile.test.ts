import { renderHook, act } from '@testing-library/react';
import { useUserProfile } from './useUserProfile';
import { UserProfile } from '../types';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

interface UseUserProfileProps {
  connectWebSocket: jest.Mock<(profile: UserProfile) => void>;
  socket: Socket | null;
}

type UseUserProfileReturn = {
  currentUserProfile: UserProfile | null;
  isProfileModalOpen: boolean;
  profileStatus: 'loading' | 'loaded' | 'needed' | 'error';
  openProfileModal: () => void;
  closeProfileModal: () => void;
  saveProfile: (profileData: Omit<UserProfile, 'id'> | UserProfile) => void;
  localPlayerId: string | null;
};

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

const mockConnectWebSocket: jest.Mock<(profile: UserProfile) => void> = jest.fn();
const mockDisconnectWebSocket = jest.fn();
const mockEmitConnected = jest.fn();
const mockEmitDisconnected = jest.fn();

const mockSocket = {
  emit: mockEmitConnected,
  connected: true
} as unknown as Socket;

const disconnectedSocket = {
  emit: mockEmitDisconnected,
  connected: false
} as unknown as Socket;

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

describe('useUserProfile', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockConnectWebSocket.mockClear();
    mockDisconnectWebSocket.mockClear();

    mockEmitConnected.mockClear();
    mockEmitDisconnected.mockClear();
    (uuidv4 as jest.Mock).mockClear();
    (uuidv4 as jest.Mock).mockReturnValue('mock-uuid-1234');
  });

  it('should initialize with no profile and modal closed if localStorage is empty', () => {
    const { result } = renderHook<UseUserProfileReturn, UseUserProfileProps>(() =>
      useUserProfile({
        connectWebSocket: mockConnectWebSocket,
        socket: null
      })
    );

    expect(result.current.currentUserProfile).toBeNull();
    expect(result.current.isProfileModalOpen).toBe(false);
  });

  it('should indicate profile initialization is needed when localStorage is empty', () => {
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

  it('should handle incomplete profile data in localStorage', () => {
    localStorageMock.setItem(
      'snakeUserProfile',
      JSON.stringify({ id: 'user-2', name: 'Incomplete' })
    );

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
    const { result } = renderHook<UseUserProfileReturn, UseUserProfileProps>(() =>
      useUserProfile({
        connectWebSocket: mockConnectWebSocket,
        socket: null
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
    expect(result.current.isProfileModalOpen).toBe(false);
    expect(mockConnectWebSocket).toHaveBeenCalledTimes(1);
    expect(mockConnectWebSocket).toHaveBeenCalledWith(expectedProfile);
    expect(mockEmitConnected).not.toHaveBeenCalled();
    expect(uuidv4).toHaveBeenCalledTimes(1);
  });

  it('should update an existing profile, update state, save to localStorage, and emit update', () => {
    const existingProfile: UserProfile = {
      id: 'user-existing',
      name: 'Old Name',
      color: '#00ff00'
    };
    localStorageMock.setItem('snakeUserProfile', JSON.stringify(existingProfile));

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
});
