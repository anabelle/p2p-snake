import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameInfo from './GameInfo';
import { GameState, Direction, PowerUpType, Snake, PowerUp } from '../game/state/types';
import { GRID_SIZE } from '../game/constants';

const createBaseMockGameState = (playerId: string): GameState => ({
  snakes: [
    {
      id: playerId,
      body: [{ x: 1, y: 1 }],
      direction: Direction.RIGHT,
      color: '#ff0000',
      score: 10,
      activePowerUps: []
    },
    {
      id: 'other-player',
      body: [{ x: 5, y: 5 }],
      direction: Direction.LEFT,
      color: '#0000ff',
      score: 5,
      activePowerUps: []
    }
  ],
  food: [{ position: { x: 10, y: 10 }, value: 1 }],
  powerUps: [],
  activePowerUps: [],
  gridSize: GRID_SIZE,
  playerStats: {
    [playerId]: {
      id: playerId,
      name: 'Local Player',
      color: '#ff0000',
      score: 10,
      deaths: 0,
      isConnected: true
    },
    'other-player': {
      id: 'other-player',
      name: 'Opponent',
      color: '#0000ff',
      score: 5,
      deaths: 0,
      isConnected: true
    }
  },
  timestamp: Date.now(),
  sequence: 1,
  rngSeed: 123,
  playerCount: 2,
  powerUpCounter: 0
});

describe('GameInfo Component', () => {
  const localPlayerId = 'player-1';
  let baseGameState: GameState;

  beforeEach(() => {
    baseGameState = createBaseMockGameState(localPlayerId);
  });

  it('should render the game title', () => {
    render(
      <GameInfo gameState={baseGameState} localPlayerId={localPlayerId} connectedPlayers={2} />
    );
    expect(screen.getByRole('heading', { name: /snake game/i })).toBeInTheDocument();
  });

  it("should display the local player's score", () => {
    render(
      <GameInfo gameState={baseGameState} localPlayerId={localPlayerId} connectedPlayers={2} />
    );
    expect(screen.getByTestId('score-display')).toHaveTextContent('Your Score: 10');
  });

  it('should display 0 score if local player snake is not found (should not happen in normal flow)', () => {
    const stateWithoutLocal = {
      ...baseGameState,
      snakes: baseGameState.snakes.filter((s: Snake) => s.id !== localPlayerId)
    };
    render(
      <GameInfo gameState={stateWithoutLocal} localPlayerId={localPlayerId} connectedPlayers={1} />
    );
    expect(screen.getByTestId('score-display')).toHaveTextContent('Your Score: 0');
  });

  it('should display the number of connected players', () => {
    render(
      <GameInfo gameState={baseGameState} localPlayerId={localPlayerId} connectedPlayers={3} />
    );
    expect(screen.getByTestId('players-connected-display')).toHaveTextContent(
      'Players Connected: 3'
    );
  });

  it('should display "None" when no active power-ups', () => {
    render(
      <GameInfo gameState={baseGameState} localPlayerId={localPlayerId} connectedPlayers={2} />
    );
    expect(screen.getByTestId('powerups-display')).toHaveTextContent('Active Power-ups: None');
  });

  it('should display the correct name for a single active power-up', () => {
    const mockPowerUp: PowerUp = {
      id: 'p1',
      type: PowerUpType.SPEED,
      position: { x: 0, y: 0 },
      expiresAt: Date.now() + 60000
    };
    const stateWithPowerUp = {
      ...baseGameState,
      snakes: baseGameState.snakes.map((s: Snake) =>
        s.id === localPlayerId ? { ...s, activePowerUps: [mockPowerUp] } : s
      ),
      activePowerUps: []
    };
    render(
      <GameInfo gameState={stateWithPowerUp} localPlayerId={localPlayerId} connectedPlayers={2} />
    );
    expect(screen.getByTestId('powerups-display')).toHaveTextContent(
      'Active Power-ups: Speed Boost'
    );
  });

  it('should display comma-separated names for multiple active power-ups', () => {
    const mockPowerUp1: PowerUp = {
      id: 'p2',
      type: PowerUpType.INVINCIBILITY,
      position: { x: 1, y: 1 },
      expiresAt: Date.now() + 60000
    };
    const mockPowerUp2: PowerUp = {
      id: 'p3',
      type: PowerUpType.DOUBLE_SCORE,
      position: { x: 2, y: 2 },
      expiresAt: Date.now() + 60000
    };
    const stateWithPowerUps = {
      ...baseGameState,
      snakes: baseGameState.snakes.map((s: Snake) =>
        s.id === localPlayerId ? { ...s, activePowerUps: [mockPowerUp1, mockPowerUp2] } : s
      ),
      activePowerUps: []
    };
    render(
      <GameInfo gameState={stateWithPowerUps} localPlayerId={localPlayerId} connectedPlayers={2} />
    );
    expect(screen.getByTestId('powerups-display')).toHaveTextContent(
      'Active Power-ups: Invincibility, Double Score'
    );
  });

  it('should render the aria-live region with score', () => {
    render(
      <GameInfo gameState={baseGameState} localPlayerId={localPlayerId} connectedPlayers={2} />
    );
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveClass('visually-hidden');
    expect(liveRegion).toHaveTextContent(/your score: 10/i);
    expect(liveRegion).not.toHaveTextContent(/active power-ups/i);
  });

  it('should include power-ups in the aria-live region when active', () => {
    const mockPowerUp: PowerUp = {
      id: 'p4',
      type: PowerUpType.SLOW,
      position: { x: 3, y: 3 },
      expiresAt: Date.now() + 60000
    };
    const stateWithPowerUp = {
      ...baseGameState,
      snakes: baseGameState.snakes.map((s: Snake) =>
        s.id === localPlayerId ? { ...s, activePowerUps: [mockPowerUp] } : s
      ),
      activePowerUps: []
    };
    render(
      <GameInfo gameState={stateWithPowerUp} localPlayerId={localPlayerId} connectedPlayers={2} />
    );
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent(/your score: 10/i);
    expect(liveRegion).toHaveTextContent(/active power-ups: slow motion/i);
  });

  it('should display the raw type name for unknown power-ups', () => {
    const unknownPowerUpType = 'UNKNOWN_TEST_TYPE' as PowerUpType;
    const mockUnknownPowerUp: PowerUp = {
      id: 'p-unknown',
      type: unknownPowerUpType,
      position: { x: 4, y: 4 },
      expiresAt: Date.now() + 60000
    };
    const stateWithUnknownPowerUp = {
      ...baseGameState,
      snakes: baseGameState.snakes.map((s: Snake) =>
        s.id === localPlayerId ? { ...s, activePowerUps: [mockUnknownPowerUp] } : s
      ),
      activePowerUps: []
    };
    render(
      <GameInfo
        gameState={stateWithUnknownPowerUp}
        localPlayerId={localPlayerId}
        connectedPlayers={2}
      />
    );

    expect(screen.getByTestId('powerups-display')).toHaveTextContent(
      `Active Power-ups: ${unknownPowerUpType}`
    );

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent(/your score: 10/i);
    expect(liveRegion).toHaveTextContent(`Active power-ups: ${unknownPowerUpType}.`);
  });
});
