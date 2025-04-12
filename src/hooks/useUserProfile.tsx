import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// Replicate the props interface from the test file
interface UseUserProfileProps {
  connectWebSocket: (profile: UserProfile) => void;
  socket: Socket | null;
  // Add gameState later if needed for sync tests
  // latestGameState?: GameState | null;
}

// Replicate the return type interface from the test file
type UseUserProfileReturn = {
  currentUserProfile: UserProfile | null;
  isProfileModalOpen: boolean;
  profileStatus: 'loading' | 'loaded' | 'needed' | 'error';
  openProfileModal: () => void;
  closeProfileModal: () => void;
  saveProfile: (profileData: Omit<UserProfile, 'id'> | UserProfile) => void;
  localPlayerId: string | null;
};

const PROFILE_STORAGE_KEY = 'snakeUserProfile';

export const useUserProfile = ({
  connectWebSocket,
  socket
}: UseUserProfileProps): UseUserProfileReturn => {
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  // Initialize as 'loading' until the effect runs
  const [profileStatus, setProfileStatus] = useState<'loading' | 'loaded' | 'needed' | 'error'>(
    'loading'
  );
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  // Effect to load profile from localStorage on initial mount
  useEffect(() => {
    logger.debug('useUserProfile: Initial load effect running...');
    setProfileStatus('loading'); // Explicitly set loading at the start
    try {
      const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (storedProfile) {
        const profile: UserProfile = JSON.parse(storedProfile);
        // Validate profile structure
        if (profile.id && profile.name && profile.color) {
          logger.debug('useUserProfile: Profile loaded from storage:', profile);
          setCurrentUserProfile(profile);
          setLocalPlayerId(profile.id);
          setProfileStatus('loaded');
          // Connect WebSocket automatically if profile is loaded
          connectWebSocket(profile);
        } else {
          logger.warn('useUserProfile: Invalid profile structure found in storage. Removing.');
          localStorage.removeItem(PROFILE_STORAGE_KEY);
          setProfileStatus('needed'); // Needs a new profile
        }
      } else {
        logger.debug('useUserProfile: No profile found in storage.');
        setProfileStatus('needed'); // Needs a profile
      }
    } catch (e) {
      logger.error(`useUserProfile: Error parsing profile from storage: ${e}`);
      localStorage.removeItem(PROFILE_STORAGE_KEY); // Clear corrupted data
      setProfileStatus('needed'); // Set to needed instead of error
    }
  }, [connectWebSocket]); // Dependency: connectWebSocket ensures it's stable

  const openProfileModal = useCallback(() => {
    setIsProfileModalOpen(true);
  }, []);

  const closeProfileModal = useCallback(() => {
    setIsProfileModalOpen(false);
  }, []);

  const saveProfile = useCallback(
    (profileData: Omit<UserProfile, 'id'> | UserProfile) => {
      const isNewUser = !currentUserProfile || !('id' in profileData) || !profileData.id;
      const profileToSave: UserProfile = {
        ...profileData,
        // Assign new ID only if it's truly a new user or ID is missing
        id: isNewUser ? uuidv4() : (profileData as UserProfile).id
      };

      logger.debug(
        isNewUser
          ? 'useUserProfile: Saving NEW profile:'
          : 'useUserProfile: Saving UPDATED profile:',
        profileToSave
      );
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileToSave));
      setCurrentUserProfile(profileToSave);
      setLocalPlayerId(profileToSave.id);
      setProfileStatus('loaded'); // Profile is now loaded/updated
      setIsProfileModalOpen(false); // Close modal after saving

      if (isNewUser) {
        logger.debug('useUserProfile: Connecting WebSocket for new user...');
        // Ensure connectWebSocket is called with the final profile including the generated ID
        connectWebSocket(profileToSave);
      } else if (socket?.connected) {
        // For existing users, emit an update event if the socket is connected
        const updatePayload = { name: profileToSave.name, color: profileToSave.color };
        logger.debug('useUserProfile: Emitting profile update to server:', updatePayload);
        socket.emit('updateProfile', updatePayload);
      } else {
        logger.warn(
          'useUserProfile: Profile updated, but socket not connected. Update will be sent on next connection or profile sync.'
        );
        // Consider if we need to queue the update or rely on a server-side sync mechanism
      }
    },
    [currentUserProfile, socket, connectWebSocket]
  ); // Dependencies

  // --- Placeholder for Server Sync Effect ---
  // useEffect(() => {
  //   if (latestGameState && localPlayerId && currentUserProfile) {
  //     const playerStatsFromServer = latestGameState.playerStats?.[localPlayerId];
  //     if (
  //       playerStatsFromServer &&
  //       (playerStatsFromServer.name !== currentUserProfile.name ||
  //         playerStatsFromServer.color !== currentUserProfile.color)
  //     ) {
  //       const updatedProfile = {
  //         id: localPlayerId,
  //         name: playerStatsFromServer.name ?? '', // Handle potential null/undefined name
  //         color: playerStatsFromServer.color // Assuming color is always present if stats exist
  //       };
  //       console.log('useUserProfile: Updating local profile from server state:', updatedProfile);
  //       // Avoid loops: Only update if different
  //       if (JSON.stringify(updatedProfile) !== JSON.stringify(currentUserProfile)) {
  //         localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
  //         setCurrentUserProfile(updatedProfile);
  //       }
  //     }
  //   }
  // }, [latestGameState, localPlayerId, currentUserProfile]);

  return {
    currentUserProfile,
    isProfileModalOpen,
    profileStatus,
    openProfileModal,
    closeProfileModal,
    saveProfile,
    localPlayerId
  };
};
