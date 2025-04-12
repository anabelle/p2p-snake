import React from 'react';
import { UserProfile } from '../types';
import { GameState, PowerUpType } from '../game/state/types';

interface UserInfoSectionProps {
  currentUserProfile: UserProfile | null;
  syncedGameState: GameState | null;
  localPlayerId: string | null;
  openProfileModal: () => void;
}

const UserInfoSection: React.FC<UserInfoSectionProps> = ({
  currentUserProfile,
  syncedGameState,
  localPlayerId,
  openProfileModal
}) => {
  if (!currentUserProfile || !localPlayerId) {
    return null;
  }

  const renderActiveEffects = () => {
    if (!syncedGameState?.activePowerUps || !syncedGameState.timestamp) {
      return <span style={{ fontStyle: 'italic', opacity: 0.7 }}> None</span>;
    }
    const serverTime = syncedGameState.timestamp;
    const active = syncedGameState.activePowerUps.filter(
      (ap) => ap.playerId === localPlayerId && ap.expiresAt > serverTime
    );

    if (active.length === 0) {
      return <span style={{ fontStyle: 'italic', opacity: 0.7 }}> None</span>;
    }

    const descriptions: Record<PowerUpType, string> = {
      [PowerUpType.SPEED]: 'Speed Boost',
      [PowerUpType.SLOW]: 'Slow Down',
      [PowerUpType.INVINCIBILITY]: 'Invincibility',
      [PowerUpType.DOUBLE_SCORE]: 'Double Score'
    };

    return active.map((ap) => {
      const expiresIn = Math.max(0, Math.round((ap.expiresAt - serverTime) / 1000));
      const description = descriptions[ap.type] || ap.type;
      const title = `${description} (~${expiresIn}s)`;
      return (
        <div
          key={`${ap.playerId}-${ap.type}-${ap.expiresAt}`}
          title={title}
          data-testid={`active-effect-${ap.type}`}
        >
          <span>
            {description} (~{expiresIn}s)
          </span>
        </div>
      );
    });
  };

  return (
    <div className='info-section' id='your-snake-info'>
      <h3>Your Snake</h3>
      {}

      {}
      <div
        className='editable-profile-item'
        onClick={openProfileModal}
        title='Click to edit profile'
        data-testid='user-info-name-container'
      >
        <span>
          <strong>Name:</strong> {currentUserProfile.name}
        </span>
      </div>

      {}
      <div
        className='editable-profile-item'
        onClick={openProfileModal}
        title='Click to edit profile'
        data-testid='user-info-color-container'
      >
        <span>
          <strong>Color: </strong>
          <span
            className='player-color-swatch'
            style={{ backgroundColor: currentUserProfile.color }}
            data-testid='user-info-color-swatch'
          />
        </span>
      </div>

      <div id='active-powerups'>
        <strong>Active Effects:</strong>
        {renderActiveEffects()}
      </div>
    </div>
  );
};

export default UserInfoSection;
