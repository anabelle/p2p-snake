import React, { useRef, useEffect } from 'react';
import { GameState } from '../game/state/types';
import { CELL_SIZE } from '../game/constants';
import { drawGame } from '../game/rendering/renderer';

interface GameCanvasProps {
  gameState: GameState;
  localPlayerId: string;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, localPlayerId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawGame(ctx, gameState, localPlayerId);
  }, [gameState, localPlayerId]);

  return (
    <canvas
      ref={canvasRef}
      style={{ border: '2px solid white', backgroundColor: '#282c34' }}
      aria-label='Snake game board'
      role='img'
      width={gameState.gridSize.width * CELL_SIZE}
      height={gameState.gridSize.height * CELL_SIZE}
    />
  );
};

export default GameCanvas;
