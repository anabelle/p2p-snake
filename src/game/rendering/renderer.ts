import { GameState, Snake, Food, PowerUp, Point, Direction } from '../state/types';
import { CELL_SIZE, GRID_SIZE } from '../constants';

function getScaleFactors(ctx: CanvasRenderingContext2D) {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  
  const baseWidth = GRID_SIZE.width * CELL_SIZE;
  const baseHeight = GRID_SIZE.height * CELL_SIZE;

  
  const scaleX = canvasWidth / baseWidth;
  const scaleY = canvasHeight / baseHeight;
  const scale = Math.min(scaleX, scaleY);

  
  const cellWidth = canvasWidth / GRID_SIZE.width;
  const cellHeight = canvasHeight / GRID_SIZE.height;

  return {
    scaleX,
    scaleY,
    scale,
    cellWidth,
    cellHeight
  };
}

function drawSquare(
  ctx: CanvasRenderingContext2D,
  point: Point,
  color: string,
  scaleFactors: ReturnType<typeof getScaleFactors>
) {
  ctx.fillStyle = color;
  ctx.fillRect(
    point.x * scaleFactors.cellWidth,
    point.y * scaleFactors.cellHeight,
    scaleFactors.cellWidth,
    scaleFactors.cellHeight
  );
}

export function drawSnakeEyes(
  ctx: CanvasRenderingContext2D,
  snake: Snake,
  scaleFactors: ReturnType<typeof getScaleFactors>
) {
  const head = snake.body[0];
  const eyeSize = scaleFactors.cellWidth / 4;
  const eyeOffset = scaleFactors.cellWidth / 5;

  let eye1: Point = { x: 0, y: 0 };
  let eye2: Point = { x: 0, y: 0 };

  const headCenterX = head.x * scaleFactors.cellWidth + scaleFactors.cellWidth / 2;
  const headCenterY = head.y * scaleFactors.cellHeight + scaleFactors.cellHeight / 2;

  switch (snake.direction) {
    case Direction.UP:
      eye1 = { x: headCenterX - eyeOffset, y: headCenterY - eyeOffset };
      eye2 = { x: headCenterX + eyeOffset, y: headCenterY - eyeOffset };
      break;
    case Direction.DOWN:
      eye1 = { x: headCenterX - eyeOffset, y: headCenterY + eyeOffset };
      eye2 = { x: headCenterX + eyeOffset, y: headCenterY + eyeOffset };
      break;
    case Direction.LEFT:
      eye1 = { x: headCenterX - eyeOffset, y: headCenterY - eyeOffset };
      eye2 = { x: headCenterX - eyeOffset, y: headCenterY + eyeOffset };
      break;
    case Direction.RIGHT:
      eye1 = { x: headCenterX + eyeOffset, y: headCenterY - eyeOffset };
      eye2 = { x: headCenterX + eyeOffset, y: headCenterY + eyeOffset };
      break;
  }

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(eye1.x, eye1.y, eyeSize / 2, 0, Math.PI * 2);
  ctx.arc(eye2.x, eye2.y, eyeSize / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(eye1.x, eye1.y, eyeSize / 4, 0, Math.PI * 2);
  ctx.arc(eye2.x, eye2.y, eyeSize / 4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: Snake,
  isLocalPlayer: boolean,
  scaleFactors: ReturnType<typeof getScaleFactors>
) {
  if (!snake || snake.body.length === 0) {
    return;
  }

  const canTransform = typeof ctx.translate === 'function' && typeof ctx.scale === 'function';

  snake.body.forEach((segment, index) => {
    let segmentColor = snake.color;

    if (index > 0) {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (hexColorRegex.test(segmentColor)) {
        try {
          const r = parseInt(segmentColor.slice(1, 3), 16);
          const g = parseInt(segmentColor.slice(3, 5), 16);
          const b = parseInt(segmentColor.slice(5, 7), 16);
          const darkenFactor = 0.8;
          segmentColor = `#${Math.floor(r * darkenFactor)
            .toString(16)
            .padStart(2, '0')}${Math.floor(g * darkenFactor)
            .toString(16)
            .padStart(2, '0')}${Math.floor(b * darkenFactor)
            .toString(16)
            .padStart(2, '0')}`;
        } catch (e) {}
      } else {
      }
    }

    if (canTransform && index === 0 && isLocalPlayer) {
      ctx.save();
      const now = Date.now();
      const pulseScale = 1 + Math.sin(now / 200) * 0.05;

      const centerX = segment.x * scaleFactors.cellWidth + scaleFactors.cellWidth / 2;
      const centerY = segment.y * scaleFactors.cellHeight + scaleFactors.cellHeight / 2;

      ctx.translate(centerX, centerY);
      ctx.scale(pulseScale, pulseScale);
      ctx.translate(-centerX, -centerY);
    }

    drawSquare(ctx, segment, segmentColor, scaleFactors);

    ctx.lineWidth = 1 * scaleFactors.scale;
    if (isLocalPlayer) {
      ctx.strokeStyle = '#FFFFFF';
      if (index === 0) {
        ctx.lineWidth = 2 * scaleFactors.scale;
      } else {
        ctx.lineWidth = 2 * scaleFactors.scale;
      }
    } else {
      ctx.strokeStyle = '#333333';
    }

    ctx.strokeRect(
      segment.x * scaleFactors.cellWidth,
      segment.y * scaleFactors.cellHeight,
      scaleFactors.cellWidth,
      scaleFactors.cellHeight
    );

    if (canTransform && index === 0 && isLocalPlayer) {
      ctx.restore();
    }
  });

  drawSnakeEyes(ctx, snake, scaleFactors);
}

export function drawFood(
  ctx: CanvasRenderingContext2D,
  food: Food,
  scaleFactors: ReturnType<typeof getScaleFactors>
) {
  const centerX = food.position.x * scaleFactors.cellWidth + scaleFactors.cellWidth / 2;
  const centerY = food.position.y * scaleFactors.cellHeight + scaleFactors.cellHeight / 2;
  const radius = (CELL_SIZE / 2.8) * scaleFactors.scale;
  const stemWidth = (CELL_SIZE / 8) * scaleFactors.scaleX;
  const stemHeight = (CELL_SIZE / 4) * scaleFactors.scaleY;
  const stemX = centerX - stemWidth / 2;
  const stemY = centerY - radius - stemHeight + 2 * scaleFactors.scaleY;

  const canShadow = typeof ctx.shadowBlur !== 'undefined';

  if (canShadow) ctx.save();

  if (canShadow) {
    ctx.shadowBlur = 6 * scaleFactors.scale;
    ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  if (canShadow) ctx.shadowBlur = 0;

  ctx.fillStyle = 'green';
  ctx.fillRect(stemX, stemY, stemWidth, stemHeight);

  if (canShadow) ctx.restore();
}

export function drawPowerUp(
  ctx: CanvasRenderingContext2D,
  powerUp: PowerUp,
  scaleFactors: ReturnType<typeof getScaleFactors>
) {
  let symbol = '?';
  let bgColor = 'purple';
  let textColor = 'white';
  let glowColor = 'rgba(128, 0, 128, 0.6)';

  switch (powerUp.type) {
    case 'SPEED':
      symbol = 'S';
      bgColor = 'lightblue';
      textColor = 'black';
      glowColor = 'rgba(0, 191, 255, 0.6)';
      break;
    case 'SLOW':
      symbol = 'W';
      bgColor = '#FFB74D';
      textColor = 'white';
      glowColor = 'rgba(255, 183, 77, 0.6)';
      break;
    case 'INVINCIBILITY':
      symbol = 'I';
      bgColor = '#BA68C8';
      textColor = 'white';
      glowColor = 'rgba(186, 104, 200, 0.6)';
      break;
    case 'DOUBLE_SCORE':
      symbol = 'x2';
      bgColor = 'gold';
      textColor = 'black';
      glowColor = 'rgba(255, 215, 0, 0.6)';
      break;
  }

  const canTransform = typeof ctx.translate === 'function' && typeof ctx.scale === 'function';
  const canShadow = typeof ctx.shadowBlur !== 'undefined';

  const now = Date.now();
  const pulseOffset = Math.sin(now / 300) * 0.15;
  const pulseFactor = 1 + pulseOffset;

  const rectX = powerUp.position.x * scaleFactors.cellWidth;
  const rectY = powerUp.position.y * scaleFactors.cellHeight;
  const rectSizeX = scaleFactors.cellWidth;
  const rectSizeY = scaleFactors.cellHeight;

  const centerX = rectX + rectSizeX / 2;
  const centerY = rectY + rectSizeY / 2;

  if (canTransform) ctx.save();

  if (canShadow) {
    ctx.shadowBlur = 8 * scaleFactors.scale;
    ctx.shadowColor = glowColor;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  if (canTransform) {
    ctx.translate(centerX, centerY);
    ctx.scale(pulseFactor, pulseFactor);
    ctx.translate(-centerX, -centerY);
  }

  ctx.fillStyle = bgColor;
  ctx.fillRect(rectX, rectY, rectSizeX, rectSizeY);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 1 * scaleFactors.scale;
  ctx.strokeRect(rectX, rectY, rectSizeX, rectSizeY);

  if (canShadow) ctx.shadowBlur = 0;

  ctx.fillStyle = textColor;
  const fontSize = Math.min(scaleFactors.cellWidth, scaleFactors.cellHeight) * 0.6;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, centerX, centerY);

  if (canTransform) ctx.restore();
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  gameState: GameState,
  localPlayerId: string | null,

  canvasWidth?: number,
  canvasHeight?: number
) {
  const currentCanvasWidth = canvasWidth ?? ctx.canvas.width;
  const currentCanvasHeight = canvasHeight ?? ctx.canvas.height;

  if (currentCanvasWidth <= 0 || currentCanvasHeight <= 0) {
    console.warn('Cannot draw game with zero dimensions');
    return;
  }

  const effectiveCtx = {
    canvas: { width: currentCanvasWidth, height: currentCanvasHeight }
  } as CanvasRenderingContext2D;

  const scaleFactors = getScaleFactors(effectiveCtx);

  ctx.clearRect(0, 0, currentCanvasWidth, currentCanvasHeight);

  drawGrid(ctx, scaleFactors);

  gameState.food.forEach((food) => drawFood(ctx, food, scaleFactors));

  gameState.powerUps.forEach((powerUp) => drawPowerUp(ctx, powerUp, scaleFactors));

  gameState.snakes.forEach((snake) => {
    if (snake.id !== localPlayerId) {
      drawSnake(ctx, snake, false, scaleFactors);
    }
  });
  const localPlayerSnake = gameState.snakes.find((s) => s.id === localPlayerId);
  if (localPlayerSnake) {
    drawSnake(ctx, localPlayerSnake, true, scaleFactors);
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, scaleFactors: ReturnType<typeof getScaleFactors>) {
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1 * scaleFactors.scale;
  ctx.beginPath();

  for (let x = 0; x <= GRID_SIZE.width; x++) {
    const drawX = x * scaleFactors.cellWidth;
    ctx.moveTo(drawX, 0);
    ctx.lineTo(drawX, ctx.canvas.height);
  }

  for (let y = 0; y <= GRID_SIZE.height; y++) {
    const drawY = y * scaleFactors.cellHeight;
    ctx.moveTo(0, drawY);
    ctx.lineTo(ctx.canvas.width, drawY);
  }

  ctx.stroke();
}
