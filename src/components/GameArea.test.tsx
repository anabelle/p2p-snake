import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameArea from './GameArea';
import { GameState, PlayerStats } from '../game/state/types';

// Define base mock state locally
const baseMockGameState: Omit<GameState, 'playerStats' | 'playerCount'> & {
  playerStats: Record<string, Partial<PlayerStats>>;
} = {
  snakes: [],
  food: [],
  powerUps: [],
  activePowerUps: [],
  gridSize: { width: 20, height: 20 }, // Example size
  timestamp: 1234567890,
  sequence: 0,
  rngSeed: 12345,
  powerUpCounter: 0,
  // Allow partial PlayerStats for easier test setup
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

  test('renders the main container div with correct styles and test id', () => {
    render(<GameArea {...baseProps} />);
    // Use getByTestId after adding it to the component
    const gameContainer = screen.getByTestId('game-area-container');

    expect(gameContainer).toBeInTheDocument();
    expect(gameContainer).toHaveAttribute('id', 'game-canvas-container');
    expect(gameContainer).toHaveStyle('width: 800px');
    expect(gameContainer).toHaveStyle('height: 600px');
    expect(gameContainer).toHaveStyle('--canvas-width: 800px');
  });

  test('renders container without inline width/height when isFullscreen is true', () => {
    render(<GameArea {...baseProps} isFullscreen={true} />);
    const gameContainer = screen.getByTestId('game-area-container');
    expect(gameContainer).toBeInTheDocument();
    expect(gameContainer).not.toHaveStyle('width: 800px');
    expect(gameContainer).not.toHaveStyle('height: 600px');
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
    expect(screen.queryByText(/Connecting.../)).not.toBeInTheDocument(); // Should show loading instead
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

  test('passes the ref to the container div', () => {
    const testRef = React.createRef<HTMLDivElement>();
    render(<GameArea {...baseProps} gameContainerRef={testRef} />);
    expect(testRef.current).toBeInTheDocument();
    expect(testRef.current?.id).toBe('game-canvas-container');
  });
});
