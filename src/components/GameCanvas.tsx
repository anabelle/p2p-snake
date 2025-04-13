import React, { useRef, useEffect } from 'react';
import { GameState } from '../game/state/types';
import { GRID_SIZE } from '../game/constants';
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

  
  const canvasWidth = 1024;
  const canvasHeight = Math.round(canvasWidth * (GRID_SIZE.height / GRID_SIZE.width));

  return (
    <canvas
      ref={canvasRef}
      style={{ border: '2px solid white', backgroundColor: '#282c34' }}
      aria-label='Snake game board'
      role='img'
      width={canvasWidth}
      height={canvasHeight}
    />
  );
};

export default GameCanvas;
