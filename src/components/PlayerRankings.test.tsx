import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerRankings from './PlayerRankings';
import { GameState } from '../game/state/types';
// No direct import from __mocks__ needed here

// Mock the game state data structure we expect
// We aren't mocking a specific module export here, but rather providing mock data
// to be used in the tests where GameState is expected.
const baseMockGameState: Omit<GameState, 'playerStats' | 'playerCount'> = {
  snakes: [],
  food: [],
  powerUps: [],
  activePowerUps: [],
  gridSize: { width: 20, height: 20 }, // Example size
  timestamp: 1234567890,
  sequence: 0,
  rngSeed: 12345,
  powerUpCounter: 0
};

describe('PlayerRankings', () => {
  const localPlayerId = 'player1';

  test('renders loading state when game state is null', () => {
    render(
      <PlayerRankings syncedGameState={null} localPlayerId={localPlayerId} isConnected={true} />
    );
    expect(screen.getByText(/Loading...|Waiting for players...|Connecting.../)).toBeInTheDocument();
  });

  test('renders connecting message when not connected', () => {
    render(
      <PlayerRankings syncedGameState={null} localPlayerId={localPlayerId} isConnected={false} />
    );
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  test('renders waiting message when connected but no players', () => {
    const emptyGameState: GameState = {
      ...baseMockGameState, // Use the base mock
      playerStats: {},
      playerCount: 0
    };
    render(
      <PlayerRankings
        syncedGameState={emptyGameState}
        localPlayerId={localPlayerId}
        isConnected={true}
      />
    );
    expect(screen.getByText('Waiting for players...')).toBeInTheDocument();
  });

  test('renders player stats correctly sorted by score', () => {
    const gameStateWithPlayers: GameState = {
      ...baseMockGameState,
      playerStats: {
        player1: {
          id: 'player1',
          name: 'Alice',
          color: 'red',
          score: 100,
          deaths: 1,
          isConnected: true
        },
        player2: {
          id: 'player2',
          name: 'Bob',
          color: 'blue',
          score: 150,
          deaths: 0,
          isConnected: true
        },
        player3: {
          id: 'player3',
          name: 'Charlie',
          color: 'green',
          score: 50,
          deaths: 2,
          isConnected: false
        }
      },
      playerCount: 3
    };
    render(
      <PlayerRankings
        syncedGameState={gameStateWithPlayers}
        localPlayerId={localPlayerId}
        isConnected={true}
      />
    );

    const rows = screen.getAllByRole('row');
    // Header + 3 players = 4 rows
    expect(rows).toHaveLength(4);

    // Row 0 is the header
    const bobRow = rows[1];
    const aliceRow = rows[2];
    const charlieRow = rows[3];

    // Check sorting and content within each row
    expect(within(bobRow).getByText(/^Bob$/)).toBeInTheDocument();
    expect(within(bobRow).getByText('150')).toBeInTheDocument();
    expect(within(aliceRow).getByText(/^Alice/)).toBeInTheDocument(); // Match start for "Alice (You)"
    expect(within(aliceRow).getByText('100')).toBeInTheDocument();
    expect(within(charlieRow).getByText(/^Charlie$/)).toBeInTheDocument();
    expect(within(charlieRow).getByText('50')).toBeInTheDocument();

    // Check status indicators using within
    expect(within(bobRow).getByText('Online')).toHaveClass('status-online');
    expect(within(aliceRow).getByText('Online')).toHaveClass('status-online');
    expect(within(charlieRow).getByText('Offline')).toHaveClass('status-offline');
  });

  test('highlights the local player row', () => {
    const gameStateWithPlayers: GameState = {
      ...baseMockGameState,
      playerStats: {
        player1: {
          id: 'player1',
          name: 'Alice',
          color: 'red',
          score: 100,
          deaths: 1,
          isConnected: true
        },
        player2: {
          id: 'player2',
          name: 'Bob',
          color: 'blue',
          score: 150,
          deaths: 0,
          isConnected: true
        }
      },
      playerCount: 2
    };
    render(
      <PlayerRankings
        syncedGameState={gameStateWithPlayers}
        localPlayerId={localPlayerId} // Alice is local
        isConnected={true}
      />
    );

    // Find rows by unique content within them using getAllByRole and within
    const rows = screen.getAllByRole('row');
    let aliceRow: HTMLElement | null = null;
    let bobRow: HTMLElement | null = null;

    rows.forEach((row) => {
      if (within(row).queryByText(/^Alice/)) {
        aliceRow = row;
      }
      if (within(row).queryByText(/^Bob$/)) {
        bobRow = row;
      }
    });

    expect(aliceRow).not.toBeNull();
    expect(bobRow).not.toBeNull();
    expect(aliceRow).toHaveClass('highlight-row');
    expect(bobRow).not.toHaveClass('highlight-row');
  });

  test('displays "(You)" next to the local player name', () => {
    const gameStateWithPlayers: GameState = {
      ...baseMockGameState,
      playerStats: {
        player1: {
          id: 'player1',
          name: 'Alice',
          color: 'red',
          score: 100,
          deaths: 1,
          isConnected: true
        },
        player2: {
          id: 'player2',
          name: 'Bob',
          color: 'blue',
          score: 150,
          deaths: 0,
          isConnected: true
        }
      },
      playerCount: 2
    };
    render(
      <PlayerRankings
        syncedGameState={gameStateWithPlayers}
        localPlayerId={localPlayerId} // Alice is local
        isConnected={true}
      />
    );

    expect(screen.getByText(/Alice.*\(You\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Bob.*\(You\)/)).not.toBeInTheDocument();
  });

  test('renders player ID substring if name is missing', () => {
    const gameStateWithoutName: GameState = {
      ...baseMockGameState,
      playerStats: {
        player1: { id: 'player1longid', color: 'red', score: 100, deaths: 1, isConnected: true }
      },
      playerCount: 1
    };
    render(
      <PlayerRankings
        syncedGameState={gameStateWithoutName}
        localPlayerId='otherPlayer' // Not the local player
        isConnected={true}
      />
    );

    // Check for the specific substring (first 6 chars of 'player1longid')
    expect(screen.getByText('player')).toBeInTheDocument();
    // Ensure the full ID isn't shown
    expect(screen.queryByText('player1longid')).not.toBeInTheDocument();
  });
});
