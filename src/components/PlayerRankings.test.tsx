import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerRankings from './PlayerRankings';
import { GameState } from '../game/state/types';

const baseMockGameState: Omit<GameState, 'playerStats' | 'playerCount'> = {
  snakes: [],
  food: [],
  powerUps: [],
  activePowerUps: [],
  gridSize: { width: 20, height: 20 },
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
      ...baseMockGameState,
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
          deaths: undefined as any,
          isConnected: true
        },
        player2: {
          id: 'player2',
          name: 'Bob',
          color: 'blue',
          score: null as any,
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
    expect(rows).toHaveLength(4);

    const aliceRow = rows[1];
    const charlieRow = rows[2];
    const bobRow = rows[3];

    expect(within(aliceRow).getByText(/^Alice/)).toBeInTheDocument();
    expect(within(aliceRow).getByText('100')).toBeInTheDocument();
    expect(within(aliceRow).getByText('0')).toBeInTheDocument();
    expect(within(aliceRow).getByText('Online')).toHaveClass('status-online');

    expect(within(charlieRow).getByText(/^Charlie$/)).toBeInTheDocument();
    expect(within(charlieRow).getByText('50')).toBeInTheDocument();
    expect(within(charlieRow).getByText('2')).toBeInTheDocument();
    expect(within(charlieRow).getByText('Offline')).toHaveClass('status-offline');

    expect(within(bobRow).getByText(/^Bob$/)).toBeInTheDocument();

    const bobCells = within(bobRow).getAllByRole('cell');
    expect(bobCells).toHaveLength(4);

    expect(bobCells[1]).toHaveTextContent('0');

    expect(bobCells[2]).toHaveTextContent('0');

    expect(bobCells[3]).toHaveTextContent('Online');
    expect(bobCells[3]).toHaveClass('status-online');
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
          deaths: undefined as any,
          isConnected: true
        },
        player2: {
          id: 'player2',
          name: 'Bob',
          color: 'blue',
          score: null as any,
          deaths: 0,
          isConnected: true
        }
      },
      playerCount: 2
    };
    render(
      <PlayerRankings
        syncedGameState={gameStateWithPlayers}
        localPlayerId={localPlayerId}
        isConnected={true}
      />
    );

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
          deaths: undefined as any,
          isConnected: true
        },
        player2: {
          id: 'player2',
          name: 'Bob',
          color: 'blue',
          score: null as any,
          deaths: 0,
          isConnected: true
        }
      },
      playerCount: 2
    };
    render(
      <PlayerRankings
        syncedGameState={gameStateWithPlayers}
        localPlayerId={localPlayerId}
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
        localPlayerId='otherPlayer'
        isConnected={true}
      />
    );

    expect(screen.getByText('player')).toBeInTheDocument();

    expect(screen.queryByText('player1longid')).not.toBeInTheDocument();
  });
});
