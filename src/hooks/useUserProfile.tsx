import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

interface UseUserProfileProps {
  connectWebSocket: (profile: UserProfile) => void;
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

const PROFILE_STORAGE_KEY = 'snakeUserProfile';

export const useUserProfile = ({
  connectWebSocket,
  socket
}: UseUserProfileProps): UseUserProfileReturn => {
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [profileStatus, setProfileStatus] = useState<'loading' | 'loaded' | 'needed' | 'error'>(
    'loading'
  );
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  useEffect(() => {
    logger.debug('useUserProfile: Initial load effect running...');
    setProfileStatus('loading');
    try {
      const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (storedProfile) {
        const profile: UserProfile = JSON.parse(storedProfile);

        if (profile.id && profile.name && profile.color) {
          logger.debug('useUserProfile: Profile loaded from storage:', profile);
          setCurrentUserProfile(profile);
          setLocalPlayerId(profile.id);
          setProfileStatus('loaded');

          connectWebSocket(profile);
        } else {
          logger.warn('useUserProfile: Invalid profile structure found in storage. Removing.');
          localStorage.removeItem(PROFILE_STORAGE_KEY);
          setProfileStatus('needed');
        }
      } else {
        logger.debug('useUserProfile: No profile found in storage.');
        setProfileStatus('needed');
      }
    } catch (e) {
      logger.error(`useUserProfile: Error parsing profile from storage: ${e}`);
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      setProfileStatus('needed');
    }
  }, [connectWebSocket]);

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
      setProfileStatus('loaded');
      setIsProfileModalOpen(false);

      if (isNewUser) {
        logger.debug('useUserProfile: Connecting WebSocket for new user...');

        connectWebSocket(profileToSave);
      } else if (socket?.connected) {
        const updatePayload = { name: profileToSave.name, color: profileToSave.color };
        logger.debug('useUserProfile: Emitting profile update to server:', updatePayload);
        socket.emit('updateProfile', updatePayload);
      } else {
        logger.warn(
          'useUserProfile: Profile updated, but socket not connected. Update will be sent on next connection or profile sync.'
        );
      }
    },
    [currentUserProfile, socket, connectWebSocket]
  );

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
