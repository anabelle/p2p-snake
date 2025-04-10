import React, { useRef, useEffect } from 'react';
import { GameState, Snake, Food, PowerUp, Point } from '../utils/types';
import { CELL_SIZE } from '../utils/gameUtils';

interface GameCanvasProps {
  gameState: GameState;
  localPlayerId: string;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, localPlayerId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Render the game on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = gameState.gridSize;
    
    // Set canvas size
    canvas.width = width * CELL_SIZE;
    canvas.height = height * CELL_SIZE;
    
    // Clear the canvas
    ctx.fillStyle = '#282c34';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines (optional)
    ctx.strokeStyle = '#3a3f4b';
    ctx.lineWidth = 0.5;
    
    // Draw vertical grid lines
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, height * CELL_SIZE);
      ctx.stroke();
    }
    
    // Draw horizontal grid lines
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(width * CELL_SIZE, y * CELL_SIZE);
      ctx.stroke();
    }
    
    // Draw food
    gameState.food.forEach((food) => {
      drawFood(ctx, food);
    });
    
    // Draw power-ups
    gameState.powerUps.forEach((powerUp) => {
      drawPowerUp(ctx, powerUp);
    });
    
    // Draw snakes
    gameState.snakes.forEach((snake) => {
      const isLocalSnake = snake.id === localPlayerId;
      drawSnake(ctx, snake, isLocalSnake);
    });
  }, [gameState, localPlayerId]);
  
  // Draw a snake on the canvas
  const drawSnake = (
    ctx: CanvasRenderingContext2D, 
    snake: Snake, 
    isLocalSnake: boolean
  ) => {
    const { body, color } = snake;
    
    // Draw each segment of the snake
    body.forEach((segment, index) => {
      const { x, y } = segment;
      
      // Fill the cell
      ctx.fillStyle = color;
      ctx.fillRect(
        x * CELL_SIZE, 
        y * CELL_SIZE, 
        CELL_SIZE, 
        CELL_SIZE
      );
      
      // Draw a border
      ctx.strokeStyle = isLocalSnake ? '#ffffff' : '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        x * CELL_SIZE, 
        y * CELL_SIZE, 
        CELL_SIZE, 
        CELL_SIZE
      );
      
      // Draw eyes on the head
      if (index === 0) {
        drawSnakeEyes(ctx, segment, snake.direction);
      }
    });
  };
  
  // Draw snake eyes
  const drawSnakeEyes = (
    ctx: CanvasRenderingContext2D, 
    headPosition: Point, 
    direction: string
  ) => {
    const { x, y } = headPosition;
    const eyeRadius = CELL_SIZE / 8;
    const eyeOffset = CELL_SIZE / 4;
    
    ctx.fillStyle = '#ffffff';
    
    // Left eye
    let leftEyeX = x * CELL_SIZE + CELL_SIZE / 4;
    let leftEyeY = y * CELL_SIZE + CELL_SIZE / 4;
    
    // Right eye
    let rightEyeX = x * CELL_SIZE + (CELL_SIZE - CELL_SIZE / 4);
    let rightEyeY = y * CELL_SIZE + CELL_SIZE / 4;
    
    // Adjust eye positions based on direction
    switch (direction) {
      case 'UP':
        break;
      case 'DOWN':
        leftEyeY = y * CELL_SIZE + (CELL_SIZE - CELL_SIZE / 4);
        rightEyeY = y * CELL_SIZE + (CELL_SIZE - CELL_SIZE / 4);
        break;
      case 'LEFT':
        leftEyeX = x * CELL_SIZE + CELL_SIZE / 4;
        leftEyeY = y * CELL_SIZE + CELL_SIZE / 4;
        rightEyeX = x * CELL_SIZE + CELL_SIZE / 4;
        rightEyeY = y * CELL_SIZE + (CELL_SIZE - CELL_SIZE / 4);
        break;
      case 'RIGHT':
        leftEyeX = x * CELL_SIZE + (CELL_SIZE - CELL_SIZE / 4);
        leftEyeY = y * CELL_SIZE + CELL_SIZE / 4;
        rightEyeX = x * CELL_SIZE + (CELL_SIZE - CELL_SIZE / 4);
        rightEyeY = y * CELL_SIZE + (CELL_SIZE - CELL_SIZE / 4);
        break;
    }
    
    // Draw the eyes
    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw pupils
    ctx.fillStyle = '#000000';
    
    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeRadius / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, eyeRadius / 2, 0, Math.PI * 2);
    ctx.fill();
  };
  
  // Draw food
  const drawFood = (ctx: CanvasRenderingContext2D, food: Food) => {
    const { x, y } = food.position;
    
    // Draw a circle for the food
    const centerX = x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = y * CELL_SIZE + CELL_SIZE / 2;
    const radius = CELL_SIZE / 2 - 2;
    
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add a highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(
      centerX - radius / 3,
      centerY - radius / 3,
      radius / 4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  };
  
  // Draw power-up
  const drawPowerUp = (ctx: CanvasRenderingContext2D, powerUp: PowerUp) => {
    const { x, y } = powerUp.position;
    
    // Draw a star shape for the power-up
    const centerX = x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = y * CELL_SIZE + CELL_SIZE / 2;
    const outerRadius = CELL_SIZE / 2 - 2;
    const innerRadius = outerRadius / 2;
    const spikes = 5;
    
    let powerUpColor;
    
    // Different colors for different power-up types
    switch (powerUp.type) {
      case 'SPEED':
        powerUpColor = '#00ff00';
        break;
      case 'SLOW':
        powerUpColor = '#0000ff';
        break;
      case 'INVINCIBILITY':
        powerUpColor = '#ffff00';
        break;
      case 'DOUBLE_SCORE':
        powerUpColor = '#ff00ff';
        break;
      default:
        powerUpColor = '#ffffff';
    }
    
    ctx.fillStyle = powerUpColor;
    ctx.beginPath();
    
    let rotation = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    
    ctx.moveTo(
      centerX + Math.cos(rotation) * outerRadius,
      centerY + Math.sin(rotation) * outerRadius
    );
    
    for (let i = 0; i < spikes; i++) {
      rotation += step;
      ctx.lineTo(
        centerX + Math.cos(rotation) * innerRadius,
        centerY + Math.sin(rotation) * innerRadius
      );
      rotation += step;
      ctx.lineTo(
        centerX + Math.cos(rotation) * outerRadius,
        centerY + Math.sin(rotation) * outerRadius
      );
    }
    
    ctx.closePath();
    ctx.fill();
    
    // Add a pulsing effect
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  
  return (
    <canvas 
      ref={canvasRef}
      style={{ border: '2px solid white' }}
      aria-label="Snake Game Canvas"
      role="img"
    />
  );
};

export default GameCanvas; 