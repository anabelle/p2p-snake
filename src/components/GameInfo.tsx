import React from 'react';
import { GameState } from '../utils/types';

interface GameInfoProps {
  gameState: GameState;
  localPlayerId: string;
  connectedPlayers: number;
}

const GameInfo: React.FC<GameInfoProps> = ({ 
  gameState, 
  localPlayerId,
  connectedPlayers
}) => {
  // Find the local player's snake
  const localSnake = gameState.snakes.find(snake => snake.id === localPlayerId);
  
  return (
    <div className="game-info">
      <h2>Snake Game</h2>
      <div>
        <strong>Your Score:</strong> {localSnake ? localSnake.score : 0}
      </div>
      <div>
        <strong>Players Connected:</strong> {connectedPlayers}
      </div>
      <div>
        <strong>Active Power-ups:</strong>{' '}
        {localSnake && localSnake.activePowerUps.length > 0
          ? localSnake.activePowerUps.join(', ')
          : 'None'}
      </div>
      <div aria-live="polite" className="visually-hidden">
        Game state updated. Your score: {localSnake ? localSnake.score : 0}.
        {localSnake && localSnake.activePowerUps.length > 0 && 
          ` Active power-ups: ${localSnake.activePowerUps.join(', ')}.`
        }
      </div>
    </div>
  );
};

export default GameInfo; 