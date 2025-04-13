import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameArea from './GameArea';
import { GameState, PlayerStats } from '../game/state/types';

const baseMockGameState: Omit<GameState, 'playerStats' | 'playerCount'> & {
  playerStats: Record<string, Partial<PlayerStats>>;
} = {
  snakes: [],
  food: [],
  powerUps: [],
  activePowerUps: [],
  gridSize: { width: 20, height: 20 },
  timestamp: 1234567890,
  sequence: 0,
  rngSeed: 12345,
  powerUpCounter: 0,

  playerStats: {}
};

describe('GameArea', () => {
  const mockRef = React.createRef<HTMLDivElement>();
  const baseProps = {
    gameContainerRef: mockRef,
    canvasWidth: 800,
    canvasHeight: 600,
    isConnected: true,
    profileStatus: 'loaded' as const,
    isProfileModalOpen: false,
    syncedGameState: null,
    isFullscreen: false
  };

  test('renders the main container div with correct test id and custom property', () => {
    render(<GameArea {...baseProps} />);

    const gameContainer = screen.getByTestId('game-area-container');

    expect(gameContainer).toBeInTheDocument();
    expect(gameContainer).toHaveAttribute('id', 'game-canvas-container');
    
    expect(gameContainer).toHaveStyle('--canvas-width: 800px');
  });

  test('renders container with fullscreen class when in fullscreen mode', () => {
    render(<GameArea {...baseProps} isFullscreen={true} />);
    const gameContainer = screen.getByTestId('game-area-container');
    expect(gameContainer).toBeInTheDocument();
    expect(gameContainer).toHaveClass('fullscreen');
    expect(gameContainer).toHaveStyle('--canvas-width: 800px');
  });

  test('does not render connecting overlay when connected and loaded', () => {
    render(<GameArea {...baseProps} isConnected={true} profileStatus='loaded' />);
    expect(screen.queryByText(/Connecting.../)).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading Profile.../)).not.toBeInTheDocument();
  });

  test('renders Connecting... overlay when not connected', () => {
    render(<GameArea {...baseProps} isConnected={false} profileStatus='needed' />);
    expect(screen.getByText(/Connecting.../)).toBeInTheDocument();
    expect(screen.getByText(/Connecting.../)).toHaveClass('connecting-overlay');
    expect(screen.queryByText(/Loading Profile.../)).not.toBeInTheDocument();
  });

  test('renders Loading Profile... overlay when profile is loading', () => {
    render(<GameArea {...baseProps} isConnected={false} profileStatus='loading' />);
    expect(screen.getByText(/Loading Profile.../)).toBeInTheDocument();
    expect(screen.getByText(/Loading Profile.../)).toHaveClass('connecting-overlay');
    expect(screen.queryByText(/Connecting.../)).not.toBeInTheDocument();
  });

  test('does not render connecting overlay if profile modal is open', () => {
    render(
      <GameArea
        {...baseProps}
        isConnected={false}
        profileStatus='needed'
        isProfileModalOpen={true}
      />
    );
    expect(screen.queryByText(/Connecting.../)).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading Profile.../)).not.toBeInTheDocument();
  });

  test('renders player count badge when connected and players exist', () => {
    const gameStateWithPlayers: GameState = {
      ...baseMockGameState,
      snakes: [],
      playerCount: 3,
      playerStats: {
        p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true },
        p2: { id: 'p2', color: 'blue', score: 0, deaths: 0, isConnected: true },
        p3: { id: 'p3', color: 'green', score: 0, deaths: 0, isConnected: false }
      }
    };
    render(<GameArea {...baseProps} isConnected={true} syncedGameState={gameStateWithPlayers} />);
    const badge = screen.getByText(/Players: 3/);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('player-count-badge');
    expect(badge).toHaveClass('status-badge');
  });

  test('does not render player count badge when not connected', () => {
    const gameStateWithPlayers: GameState = {
      ...baseMockGameState,
      snakes: [],
      playerCount: 1,
      playerStats: { p1: { id: 'p1', color: 'red', score: 0, deaths: 0, isConnected: true } }
    };
    render(<GameArea {...baseProps} isConnected={false} syncedGameState={gameStateWithPlayers} />);
    expect(screen.queryByText(/Players:/)).not.toBeInTheDocument();
  });

  test('does not render player count badge when game state is null', () => {
    render(<GameArea {...baseProps} isConnected={true} syncedGameState={null} />);
    expect(screen.queryByText(/Players:/)).not.toBeInTheDocument();
  });

  test('does not render player count badge when player count is zero', () => {
    const gameStateNoPlayers: GameState = {
      ...baseMockGameState,
      snakes: [],
      playerCount: 0,
      playerStats: {}
    };
    render(<GameArea {...baseProps} isConnected={true} syncedGameState={gameStateNoPlayers} />);
    expect(screen.queryByText(/Players:/)).not.toBeInTheDocument();
  });

  test('renders current user score below player count when connected and local player exists', () => {
    const localPlayerId = 'p1';
    const gameStateWithScores: GameState = {
      ...baseMockGameState,
      snakes: [],
      playerCount: 2,
      playerStats: {
        p1: { id: 'p1', color: 'red', score: 10, deaths: 0, isConnected: true },
        p2: { id: 'p2', color: 'blue', score: 15, deaths: 0, isConnected: true }
      }
    };
    render(
      <GameArea
        {...baseProps}
        isConnected={true}
        syncedGameState={gameStateWithScores}
        localPlayerId={localPlayerId}
      />
    );

    const playerCount = screen.getByText(/Players: 2/);
    expect(playerCount).toBeInTheDocument();
    expect(playerCount).toHaveClass('status-badge');

    const scoreDisplay = screen.getByText(/Score: 10/);
    expect(scoreDisplay).toBeInTheDocument();
    const scoreBadgeElement = screen.getByTestId('score-badge');
    expect(scoreBadgeElement).toHaveClass('score-badge');
    expect(scoreBadgeElement).toHaveClass('status-badge');
    expect(scoreBadgeElement).not.toHaveClass('score-changed');
  });

  test('does not render score badge when not connected', () => {
    const gameStateWithScores: GameState = {
      ...baseMockGameState,
      snakes: [],
      playerCount: 2,
      playerStats: {
        p1: { id: 'p1', color: 'red', score: 10, deaths: 0, isConnected: true },
        p2: { id: 'p2', color: 'blue', score: 15, deaths: 0, isConnected: true }
      }
    };
    render(<GameArea {...baseProps} isConnected={false} syncedGameState={gameStateWithScores} />);
    expect(screen.queryByText(/Score:/)).not.toBeInTheDocument();
  });

  test('passes the ref to the container div', () => {
    const testRef = React.createRef<HTMLDivElement>();
    render(<GameArea {...baseProps} gameContainerRef={testRef} />);
    expect(testRef.current).toBeInTheDocument();
    expect(testRef.current?.id).toBe('game-canvas-container');
  });
});
