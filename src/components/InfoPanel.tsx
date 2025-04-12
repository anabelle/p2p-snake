import React from 'react';
import { UserProfile } from '../types';
import { GameState } from '../game/state/types';
import UserInfoSection from './UserInfoSection';
import PlayerRankings from './PlayerRankings';
import PowerUpLegend from './PowerUpLegend';

interface InfoPanelProps {
  isConnected: boolean;
  currentUserProfile: UserProfile | null;
  profileStatus: 'loading' | 'loaded' | 'needed' | 'error';
  syncedGameState: GameState | null;
  localPlayerId: string | null;
  openProfileModal: () => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  isConnected,
  currentUserProfile,
  profileStatus,
  syncedGameState,
  localPlayerId,
  openProfileModal
}) => {
  const shouldRender = isConnected && currentUserProfile && profileStatus === 'loaded';

  if (!shouldRender) {
    return null;
  }

  return (
    <div className='info-sections-wrapper' data-testid='info-panel-wrapper'>
      <UserInfoSection
        currentUserProfile={currentUserProfile}
        syncedGameState={syncedGameState}
        localPlayerId={localPlayerId}
        openProfileModal={openProfileModal}
      />
      <PlayerRankings
        syncedGameState={syncedGameState}
        localPlayerId={localPlayerId}
        isConnected={isConnected}
      />
      <PowerUpLegend />
    </div>
  );
};

export default InfoPanel;
