import React from 'react';
import { GameState, PowerUpType } from '../game/state/types';

interface GameInfoProps {
  gameState: GameState;
  localPlayerId: string;
  connectedPlayers: number;
}

const getPowerUpName = (type: PowerUpType): string => {
  switch (type) {
    case PowerUpType.SPEED:
      return 'Speed Boost';
    case PowerUpType.SLOW:
      return 'Slow Motion';
    case PowerUpType.INVINCIBILITY:
      return 'Invincibility';
    case PowerUpType.DOUBLE_SCORE:
      return 'Double Score';
    default:
      return type;
  }
};

const GameInfo: React.FC<GameInfoProps> = ({ gameState, localPlayerId, connectedPlayers }) => {
  const localSnake = gameState.snakes.find((snake) => snake.id === localPlayerId);

  const formatPowerUps = () => {
    if (!localSnake || localSnake.activePowerUps.length === 0) {
      return 'None';
    }

    return localSnake.activePowerUps.map((powerUp) => getPowerUpName(powerUp.type)).join(', ');
  };

  return (
    <div className='game-info'>
      <h2>Snake Game</h2>
      <div data-testid='score-display'>
        <strong>Your Score:</strong> {localSnake ? localSnake.score : 0}
      </div>
      <div data-testid='players-connected-display'>
        <strong>Players Connected:</strong> {connectedPlayers}
      </div>
      <div data-testid='powerups-display'>
        <strong>Active Power-ups:</strong> {formatPowerUps()}
      </div>
      <div aria-live='polite' role='status' className='visually-hidden'>
        Game state updated. Your score: {localSnake ? localSnake.score : 0}.
        {localSnake &&
          localSnake.activePowerUps.length > 0 &&
          ` Active power-ups: ${formatPowerUps()}.`}
      </div>
    </div>
  );
};

export default GameInfo;
