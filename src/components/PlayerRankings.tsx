import React from 'react';
import { GameState } from '../game/state/types';

interface PlayerRankingsProps {
  syncedGameState: GameState | null;
  localPlayerId: string | null;
  isConnected: boolean;
}

const PlayerRankings: React.FC<PlayerRankingsProps> = ({
  syncedGameState,
  localPlayerId,
  isConnected
}) => {
  const renderTableBody = () => {
    const playerStats = syncedGameState?.playerStats || {};
    const players = Object.values(playerStats).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    if (players.length > 0) {
      return players.map((player) => (
        <tr key={player.id} className={player.id === localPlayerId ? 'highlight-row' : ''}>
          <td>
            <div>
              <span className='player-color-swatch' style={{ backgroundColor: player.color }} />
              {player.name || player.id.substring(0, 6)} {}
              {player.id === localPlayerId ? ' (You)' : ''} {/* Add "(You)" indicator */}
            </div>
          </td>
          <td>{player.score ?? 0}</td>
          <td>{player.deaths ?? 0}</td>
          <td className={player.isConnected ? 'status-online' : 'status-offline'}>
            {player.isConnected ? 'Online' : 'Offline'}
          </td>
        </tr>
      ));
    } else {
      const statusMessage = isConnected ? 'Waiting for players...' : 'Connecting...';
      return (
        <tr>
          <td colSpan={4}>{statusMessage}</td>
        </tr>
      );
    }
  };

  return (
    <div className='info-section' id='player-rankings'>
      <h3>Player Rankings</h3>
      <div className='table-scroll-wrapper'>
        <table role='table'>
          <thead>
            <tr>
              <th scope='col'>Player</th>
              <th scope='col'>Score</th>
              <th scope='col'>Deaths</th>
              <th scope='col'>Status</th>
            </tr>
          </thead>
          {}
          <tbody>{renderTableBody()}</tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerRankings;
