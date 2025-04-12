import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserInfoSection from './UserInfoSection';
import { UserProfile } from '../types';
import { GameState, PowerUpType, ActivePowerUp } from '../game/state/types';
import userEvent from '@testing-library/user-event';

const mockProfile: UserProfile = { id: 'p1', name: 'Test User', color: '#ff0000' };
const mockGameStateBase: Partial<GameState> = {
  timestamp: Date.now(),
  activePowerUps: [],
  playerStats: {
    p1: { id: 'p1', name: 'Test User', color: '#ff0000', score: 100, deaths: 0, isConnected: true }
  }
};
const mockOpenModal = jest.fn();

const mockActivePowerUp: ActivePowerUp = {
  playerId: 'p1',
  type: PowerUpType.SPEED,
  expiresAt: Date.now() + 5000
};

describe('UserInfoSection', () => {
  beforeEach(() => {
    mockOpenModal.mockClear();
  });

  it('should render the "Your Snake" heading', () => {
    render(
      <UserInfoSection
        currentUserProfile={mockProfile}
        syncedGameState={mockGameStateBase as GameState | null}
        localPlayerId='p1'
        openProfileModal={mockOpenModal}
      />
    );
    expect(screen.getByRole('heading', { name: /your snake/i })).toBeInTheDocument();
  });

  it('should return null if currentUserProfile or localPlayerId is null', () => {
    render(
      <UserInfoSection
        currentUserProfile={null}
        syncedGameState={mockGameStateBase as GameState | null}
        localPlayerId='p1'
        openProfileModal={mockOpenModal}
      />
    );

    expect(screen.queryByTestId('your-snake-info')).toBeNull();

    render(
      <UserInfoSection
        currentUserProfile={mockProfile}
        syncedGameState={mockGameStateBase as GameState | null}
        localPlayerId={null}
        openProfileModal={mockOpenModal}
      />
    );

    expect(screen.queryByTestId('your-snake-info')).toBeNull();
  });

  it('should display the current user name', () => {
    render(
      <UserInfoSection
        currentUserProfile={mockProfile}
        syncedGameState={mockGameStateBase as GameState | null}
        localPlayerId='p1'
        openProfileModal={mockOpenModal}
      />
    );
    expect(screen.getByText(`Name:`)).toBeInTheDocument();
    expect(screen.getByText(mockProfile.name)).toBeInTheDocument();
  });

  it('should display the current user color swatch', () => {
    render(
      <UserInfoSection
        currentUserProfile={mockProfile}
        syncedGameState={mockGameStateBase as GameState | null}
        localPlayerId='p1'
        openProfileModal={mockOpenModal}
      />
    );

    const swatch = screen.getByTestId('user-info-color-swatch');
    expect(swatch).toBeInTheDocument();
    expect(swatch).toHaveStyle(`background-color: ${mockProfile.color}`);
  });

  it('should call openProfileModal when name is clicked', async () => {
    render(
      <UserInfoSection
        currentUserProfile={mockProfile}
        syncedGameState={mockGameStateBase as GameState | null}
        localPlayerId='p1'
        openProfileModal={mockOpenModal}
      />
    );

    const nameContainer = screen.getByTestId('user-info-name-container');
    expect(nameContainer).toBeInTheDocument();
    expect(screen.getByText(mockProfile.name)).toBeInTheDocument();
    expect(nameContainer).toHaveClass('editable-profile-item');
    expect(nameContainer).toHaveAttribute('title', 'Click to edit profile');
    await userEvent.click(nameContainer);
    expect(mockOpenModal).toHaveBeenCalledTimes(1);
  });

  it('should call openProfileModal when color is clicked', async () => {
    render(
      <UserInfoSection
        currentUserProfile={mockProfile}
        syncedGameState={mockGameStateBase as GameState | null}
        localPlayerId='p1'
        openProfileModal={mockOpenModal}
      />
    );

    const colorContainer = screen.getByTestId('user-info-color-container');
    expect(colorContainer).toBeInTheDocument();
    expect(screen.getByTestId('user-info-color-swatch')).toBeInTheDocument();
    expect(colorContainer).toHaveClass('editable-profile-item');
    expect(colorContainer).toHaveAttribute('title', 'Click to edit profile');
    await userEvent.click(colorContainer);
    expect(mockOpenModal).toHaveBeenCalledTimes(1);
  });

  it('should display "None" for active effects if gameState is null', () => {
    render(
      <UserInfoSection
        currentUserProfile={mockProfile}
        syncedGameState={null}
        localPlayerId='p1'
        openProfileModal={mockOpenModal}
      />
    );
    expect(screen.getByText('Active Effects:')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('should display "None" for active effects if no powerups exist', () => {
    render(
      <UserInfoSection
        currentUserProfile={mockProfile}
        syncedGameState={mockGameStateBase as GameState | null}
        localPlayerId='p1'
        openProfileModal={mockOpenModal}
      />
    );
    expect(screen.getByText('Active Effects:')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('should display "None" for active effects if powerups are for other players', () => {
    const otherPlayerPowerup: ActivePowerUp = { ...mockActivePowerUp, playerId: 'p2' };
    const gameStateOtherPlayer: Partial<GameState> = {
      ...mockGameStateBase,
      timestamp: Date.now(),
      activePowerUps: [otherPlayerPowerup]
    };
    render(
      <UserInfoSection
        currentUserProfile={mockProfile}
        syncedGameState={gameStateOtherPlayer as GameState | null}
        localPlayerId='p1'
        openProfileModal={mockOpenModal}
      />
    );
    expect(screen.getByText('Active Effects:')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('should display active powerup description and time remaining', () => {
    const now = Date.now();
    const expiresAt = now + 5300;
    const powerUp: ActivePowerUp = { playerId: 'p1', type: PowerUpType.SPEED, expiresAt };
    const gameState: Partial<GameState> = {
      ...mockGameStateBase,
      timestamp: now,
      activePowerUps: [powerUp]
    };

    render(
      <UserInfoSection
        currentUserProfile={mockProfile}
        syncedGameState={gameState as GameState | null}
        localPlayerId='p1'
        openProfileModal={mockOpenModal}
      />
    );
    expect(screen.getByText('Active Effects:')).toBeInTheDocument();

    const effectContainerDiv = screen.getByTestId('active-effect-SPEED');
    expect(effectContainerDiv).toBeInTheDocument();
    expect(effectContainerDiv).toHaveTextContent(/Speed Boost \(~\d+s\)/i);
    expect(effectContainerDiv).toHaveAttribute('title', 'Speed Boost (~5s)');
  });

  it('should handle multiple active powerups', () => {
    const now = Date.now();
    const powerUp1: ActivePowerUp = {
      playerId: 'p1',
      type: PowerUpType.SPEED,
      expiresAt: now + 5000
    };
    const powerUp2: ActivePowerUp = {
      playerId: 'p1',
      type: PowerUpType.INVINCIBILITY,
      expiresAt: now + 10000
    };
    const gameState: Partial<GameState> = {
      ...mockGameStateBase,
      timestamp: now,
      activePowerUps: [powerUp1, powerUp2]
    };
    render(
      <UserInfoSection
        currentUserProfile={mockProfile}
        syncedGameState={gameState as GameState | null}
        localPlayerId='p1'
        openProfileModal={mockOpenModal}
      />
    );

    const speedEffect = screen.getByTestId('active-effect-SPEED');
    const invincibilityEffect = screen.getByTestId('active-effect-INVINCIBILITY');
    expect(speedEffect).toBeInTheDocument();
    expect(invincibilityEffect).toBeInTheDocument();
    expect(speedEffect).toHaveTextContent(/Speed Boost \(~\d+s\)/i);
    expect(invincibilityEffect).toHaveTextContent(/Invincibility \(~\d+s\)/i);
  });

  it('should display "None" if powerup has expired', () => {
    const now = Date.now();
    const powerUp: ActivePowerUp = {
      playerId: 'p1',
      type: PowerUpType.SPEED,
      expiresAt: now - 1000
    };
    const gameState: Partial<GameState> = {
      ...mockGameStateBase,
      timestamp: now,
      activePowerUps: [powerUp]
    };
    render(
      <UserInfoSection
        currentUserProfile={mockProfile}
        syncedGameState={gameState as GameState | null}
        localPlayerId='p1'
        openProfileModal={mockOpenModal}
      />
    );
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('should display the raw type name for unknown active effects', () => {
    const now = Date.now();
    const unknownType = 'UNKNOWN_EFFECT' as PowerUpType;
    const powerUp: ActivePowerUp = {
      playerId: 'p1',
      type: unknownType,
      expiresAt: now + 5000
    };
    const gameState: Partial<GameState> = {
      ...mockGameStateBase,
      timestamp: now,
      activePowerUps: [powerUp]
    };

    render(
      <UserInfoSection
        currentUserProfile={mockProfile}
        syncedGameState={gameState as GameState | null}
        localPlayerId='p1'
        openProfileModal={mockOpenModal}
      />
    );

    expect(screen.getByText('Active Effects:')).toBeInTheDocument();
    const effectContainerDiv = screen.getByTestId(`active-effect-${unknownType}`);
    expect(effectContainerDiv).toBeInTheDocument();

    expect(effectContainerDiv).toHaveTextContent(`${unknownType} (~5s)`);
    expect(effectContainerDiv).toHaveAttribute('title', `${unknownType} (~5s)`);
  });
});
