import React from 'react';
import { GameState, PowerUpType } from '../game/state/types';

interface GameInfoProps {
  gameState: GameState;
  localPlayerId: string;
  connectedPlayers: number;
}

// Function to get a user-friendly name for power-up types
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
  // Find the local player's snake
  const localSnake = gameState.snakes.find((snake) => snake.id === localPlayerId);

  // Format the power-ups with user-friendly names
  const formatPowerUps = () => {
    if (!localSnake || localSnake.activePowerUps.length === 0) {
      return 'None';
    }

    return localSnake.activePowerUps.map((powerUp) => getPowerUpName(powerUp.type)).join(', ');
  };

  return (
    <div className='game-info'>
      <h2>Snake Game</h2>
      <div>
        <strong>Your Score:</strong> {localSnake ? localSnake.score : 0}
      </div>
      <div>
        <strong>Players Connected:</strong> {connectedPlayers}
      </div>
      <div>
        <strong>Active Power-ups:</strong> {formatPowerUps()}
      </div>
      <div aria-live='polite' className='visually-hidden'>
        Game state updated. Your score: {localSnake ? localSnake.score : 0}.
        {localSnake &&
          localSnake.activePowerUps.length > 0 &&
          ` Active power-ups: ${formatPowerUps()}.`}
      </div>
    </div>
  );
};

export default GameInfo;
