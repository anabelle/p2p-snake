import { GameState, Snake, Food, PowerUp, Point, Direction } from '../state/types';
import { CELL_SIZE, GRID_SIZE } from '../constants';

// Helper function to calculate scale factors and scaled cell size
function getScaleFactors(ctx: CanvasRenderingContext2D) {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  const baseWidth = GRID_SIZE.width * CELL_SIZE;
  const baseHeight = GRID_SIZE.height * CELL_SIZE;

  const scaleX = canvasWidth / baseWidth;
  const scaleY = canvasHeight / baseHeight;

  // Use the minimum scale factor to maintain aspect ratio if scaling non-uniformly
  // For squares, scaleX and scaleY should ideally be the same if aspect ratio is maintained
  const scale = Math.min(scaleX, scaleY);

  return {
    scaleX,
    scaleY,
    scale, // Overall scale factor
    cellWidth: CELL_SIZE * scaleX,
    cellHeight: CELL_SIZE * scaleY
  };
}

// Modified draw function using scale factors
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

// Function to draw snake eyes (now uses scale factors)
export function drawSnakeEyes(
  ctx: CanvasRenderingContext2D,
  snake: Snake,
  scaleFactors: ReturnType<typeof getScaleFactors>
) {
  const head = snake.body[0];
  const eyeSize = scaleFactors.cellWidth / 4; // Scale eye size
  const eyeOffset = scaleFactors.cellWidth / 5; // Scale eye offset

  let eye1: Point = { x: 0, y: 0 };
  let eye2: Point = { x: 0, y: 0 };

  const headCenterX = head.x * scaleFactors.cellWidth + scaleFactors.cellWidth / 2;
  const headCenterY = head.y * scaleFactors.cellHeight + scaleFactors.cellHeight / 2;

  // Simplified eye positioning based on direction
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

// Modified drawSnake function
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: Snake,
  isLocalPlayer: boolean,
  scaleFactors: ReturnType<typeof getScaleFactors>
) {
  if (!snake || snake.body.length === 0) {
    return; // Don't draw if snake is invalid or has no body
  }

  snake.body.forEach((segment, index) => {
    // Base color
    let segmentColor = snake.color;

    // Darken body segments slightly
    if (index > 0) {
      // Check if color is a valid 6-digit hex before darkening
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (hexColorRegex.test(segmentColor)) {
        try {
          // Crude darkening: reduce each RGB component
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
        } catch (e) {
          /* Ignore parsing errors, use original color */
        }
      } else {
        // If color is not a valid hex (e.g., 'cyan'), skip darkening
        // console.warn(`Could not darken invalid color format: ${segmentColor}`);
      }
    }

    // Draw the segment fill
    drawSquare(ctx, segment, segmentColor, scaleFactors);

    // Draw borders for all segments
    ctx.lineWidth = 1 * scaleFactors.scale; // Use 1 as base width, then scale
    if (isLocalPlayer) {
      // Local player always gets a white border
      ctx.strokeStyle = '#FFFFFF';
      if (index === 0) {
        // Local player head: Use thicker white border
        ctx.lineWidth = 2 * scaleFactors.scale;
      } else {
        // Local player body: Use the same thicker border for visibility
        ctx.lineWidth = 2 * scaleFactors.scale;
      }
    } else {
      // Non-local player: Standard dark border
      ctx.strokeStyle = '#333333';
    }

    // Apply the stroke
    ctx.strokeRect(
      segment.x * scaleFactors.cellWidth,
      segment.y * scaleFactors.cellHeight,
      scaleFactors.cellWidth,
      scaleFactors.cellHeight
    );
  });

  // Draw eyes after body
  drawSnakeEyes(ctx, snake, scaleFactors);
}

// Modified drawFood function
export function drawFood(
  ctx: CanvasRenderingContext2D,
  food: Food,
  scaleFactors: ReturnType<typeof getScaleFactors>
) {
  const centerX = food.position.x * scaleFactors.cellWidth + scaleFactors.cellWidth / 2;
  const centerY = food.position.y * scaleFactors.cellHeight + scaleFactors.cellHeight / 2;
  const radius = (CELL_SIZE / 2.8) * scaleFactors.scale; // Scale radius
  const stemWidth = (CELL_SIZE / 8) * scaleFactors.scaleX; // Scale stem width
  const stemHeight = (CELL_SIZE / 4) * scaleFactors.scaleY; // Scale stem height
  const stemX = centerX - stemWidth / 2;
  // Adjust stem Y position based on scaled radius and height
  const stemY = centerY - radius - stemHeight + 2 * scaleFactors.scaleY;

  // Draw apple body
  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw apple stem
  ctx.fillStyle = 'green';
  ctx.fillRect(stemX, stemY, stemWidth, stemHeight);
}

// Modified drawPowerUp function
export function drawPowerUp(
  ctx: CanvasRenderingContext2D,
  powerUp: PowerUp,
  scaleFactors: ReturnType<typeof getScaleFactors>
) {
  let symbol = '?';
  let bgColor = 'purple';
  let textColor = 'white';

  switch (powerUp.type) {
    case 'SPEED':
      symbol = 'S';
      bgColor = 'lightblue';
      textColor = 'black';
      break;
    case 'SLOW':
      symbol = 'W';
      bgColor = '#FFB74D'; // Orange (matches legend CSS)
      textColor = 'white';
      break;
    case 'INVINCIBILITY':
      symbol = 'I';
      bgColor = '#BA68C8'; // Purple (matches legend CSS)
      textColor = 'white';
      break;
    case 'DOUBLE_SCORE':
      symbol = 'x2';
      bgColor = 'gold';
      textColor = 'black';
      break;
  }

  const rectX = powerUp.position.x * scaleFactors.cellWidth;
  const rectY = powerUp.position.y * scaleFactors.cellHeight;
  const rectSizeX = scaleFactors.cellWidth;
  const rectSizeY = scaleFactors.cellHeight;

  // Draw background square
  ctx.fillStyle = bgColor;
  ctx.fillRect(rectX, rectY, rectSizeX, rectSizeY);

  // Draw symbol text (scaled)
  ctx.fillStyle = textColor;
  // Scale font size based on average cell dimension
  const fontSize = Math.min(rectSizeX, rectSizeY) * 0.6;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, rectX + rectSizeX / 2, rectY + rectSizeY / 2);
}

// Main draw function - NOW ACCEPTS OPTIONAL width/height, otherwise uses context
export function drawGame(
  ctx: CanvasRenderingContext2D,
  gameState: GameState,
  localPlayerId: string | null,
  // Optional explicit dimensions (e.g., from test or resize)
  canvasWidth?: number,
  canvasHeight?: number
) {
  // Use provided dimensions or context dimensions
  const currentCanvasWidth = canvasWidth ?? ctx.canvas.width;
  const currentCanvasHeight = canvasHeight ?? ctx.canvas.height;

  // If dimensions are zero, cannot draw
  if (currentCanvasWidth <= 0 || currentCanvasHeight <= 0) {
    console.warn('Cannot draw game with zero dimensions');
    return;
  }

  // Create a temporary context object with the correct dimensions for getScaleFactors
  // This avoids modifying the original context if dimensions were passed explicitly
  const effectiveCtx = {
    canvas: { width: currentCanvasWidth, height: currentCanvasHeight }
  } as CanvasRenderingContext2D;

  const scaleFactors = getScaleFactors(effectiveCtx);

  // Clear canvas with actual dimensions
  ctx.clearRect(0, 0, currentCanvasWidth, currentCanvasHeight);

  // Draw grid (optional, can be heavy, consider CSS background)
  drawGrid(ctx, scaleFactors);

  // Draw food
  gameState.food.forEach((food) => drawFood(ctx, food, scaleFactors));

  // Draw power-ups
  gameState.powerUps.forEach((powerUp) => drawPowerUp(ctx, powerUp, scaleFactors));

  // Draw snakes (draw local player last)
  gameState.snakes.forEach((snake) => {
    if (snake.id !== localPlayerId) {
      drawSnake(ctx, snake, false, scaleFactors);
    }
  });
  const localPlayerSnake = gameState.snakes.find((s) => s.id === localPlayerId);
  if (localPlayerSnake) {
    drawSnake(ctx, localPlayerSnake, true, scaleFactors);
  }

  // TODO: Draw active power-up effects (visual indicators on snakes?)
  // gameState.activePowerUps.forEach(ap => drawActivePowerUpEffect(ctx, ap, gameState, scaleFactors));

  // TODO: Draw score, game over message, etc. (scaled)
}

// Optional: drawGrid function (if needed)
function drawGrid(ctx: CanvasRenderingContext2D, scaleFactors: ReturnType<typeof getScaleFactors>) {
  ctx.strokeStyle = '#333'; // Dark grey grid lines
  ctx.lineWidth = 1 * scaleFactors.scale; // Scale line width, base 1px
  ctx.beginPath();

  // Vertical lines
  for (let x = 0; x <= GRID_SIZE.width; x++) {
    const drawX = x * scaleFactors.cellWidth;
    ctx.moveTo(drawX, 0);
    ctx.lineTo(drawX, ctx.canvas.height);
  }

  // Horizontal lines
  for (let y = 0; y <= GRID_SIZE.height; y++) {
    const drawY = y * scaleFactors.cellHeight;
    ctx.moveTo(0, drawY);
    ctx.lineTo(ctx.canvas.width, drawY);
  }

  ctx.stroke();
}
