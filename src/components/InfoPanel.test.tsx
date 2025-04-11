import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import InfoPanel from './InfoPanel';
import { UserProfile } from '../types';
import { GameState } from '../game/state/types';

// Mock child components
jest.mock('./UserInfoSection', () => () => <div data-testid='mock-user-info'>UserInfoSection</div>);
jest.mock('./PlayerRankings', () => () => (
  <div data-testid='mock-player-rankings'>PlayerRankings</div>
));
jest.mock('./PowerUpLegend', () => () => (
  <div data-testid='mock-powerup-legend'>PowerUpLegend</div>
));

describe('InfoPanel', () => {
  const mockProfile: UserProfile = { id: 'p1', name: 'Tester', color: '#fff' };
  const mockGameState: GameState = {
    /* minimal mock */ snakes: [],
    food: [],
    powerUps: [],
    activePowerUps: [],
    gridSize: { width: 10, height: 10 },
    timestamp: 0,
    sequence: 0,
    rngSeed: 1,
    playerCount: 1,
    powerUpCounter: 0,
    playerStats: { p1: { id: 'p1', color: '#fff', score: 0, deaths: 0, isConnected: true } }
  };
  const mockOpenModal = jest.fn();

  const baseProps = {
    isConnected: true,
    currentUserProfile: mockProfile,
    profileStatus: 'loaded' as const,
    syncedGameState: mockGameState,
    localPlayerId: 'p1',
    openProfileModal: mockOpenModal
  };

  test('renders null if not connected', () => {
    render(<InfoPanel {...baseProps} isConnected={false} />);
    expect(screen.queryByTestId('info-panel-wrapper')).not.toBeInTheDocument();
  });

  test('renders null if profile is null', () => {
    render(<InfoPanel {...baseProps} currentUserProfile={null} />);
    expect(screen.queryByTestId('info-panel-wrapper')).not.toBeInTheDocument();
  });

  test('renders null if profile status is not loaded', () => {
    render(<InfoPanel {...baseProps} profileStatus='loading' />);
    expect(screen.queryByTestId('info-panel-wrapper')).not.toBeInTheDocument();
    render(<InfoPanel {...baseProps} profileStatus='needed' />);
    expect(screen.queryByTestId('info-panel-wrapper')).not.toBeInTheDocument();
  });

  test('renders children components and wrapper when conditions are met', () => {
    render(<InfoPanel {...baseProps} />);

    // Check for the wrapper div first
    expect(screen.getByTestId('info-panel-wrapper')).toBeInTheDocument();

    // Check for mocked children
    expect(screen.getByTestId('mock-user-info')).toBeInTheDocument();
    expect(screen.getByTestId('mock-player-rankings')).toBeInTheDocument();
    expect(screen.getByTestId('mock-powerup-legend')).toBeInTheDocument();
  });
});
