import { GameState, Snake, Food, PowerUp, Direction } from "../state/types";
import { CELL_SIZE } from "../constants";

// Function to draw the entire game state onto a canvas
export const drawGame = (ctx: CanvasRenderingContext2D, state: GameState, localPlayerId?: string) => {
    const { width, height } = ctx.canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background (Optional - maybe add grid lines)
    ctx.fillStyle = '#222'; // Dark background
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Lines (Optional)
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= state.gridSize.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE, 0);
        ctx.lineTo(x * CELL_SIZE, height);
        ctx.stroke();
    }
    for (let y = 0; y <= state.gridSize.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL_SIZE);
        ctx.lineTo(width, y * CELL_SIZE);
        ctx.stroke();
    }

    // Draw Food
    state.food.forEach(food => drawFood(ctx, food));

    // Draw PowerUps
    state.powerUps.forEach(powerUp => drawPowerUp(ctx, powerUp));

    // Draw Snakes
    state.snakes.forEach(snake => {
        const isLocalSnake = localPlayerId ? snake.id === localPlayerId : false;
        drawSnake(ctx, snake, isLocalSnake);
    });

    // Draw player count
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Players: ${state.playerCount}`, 10, 10);
};

// Helper to draw a single snake
const drawSnake = (ctx: CanvasRenderingContext2D, snake: Snake, isLocalSnake: boolean = false) => {
    if (snake.body.length === 0) return;

    // Draw body segments
    ctx.fillStyle = snake.color;
    snake.body.forEach((segment, index) => {
        if (index === 0) return; // Skip head, draw it last with eyes
        ctx.fillRect(
            segment.x * CELL_SIZE,
            segment.y * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE
        );
        // Add slight border to segments for clarity
        ctx.strokeStyle = isLocalSnake ? '#fff' : '#333'; // Highlight local snake
        ctx.lineWidth = isLocalSnake ? 2 : 1;
        ctx.strokeRect(
            segment.x * CELL_SIZE,
            segment.y * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE
        );
    });

    // Draw head
    const head = snake.body[0];
    ctx.fillStyle = snake.color; 
    ctx.fillRect(
        head.x * CELL_SIZE,
        head.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
    );
    
    // Draw border on head
    ctx.strokeStyle = isLocalSnake ? '#fff' : '#333';
    ctx.lineWidth = isLocalSnake ? 2 : 1;
    ctx.strokeRect(
        head.x * CELL_SIZE,
        head.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
    );
    
    // Draw eyes based on direction for visual cue
    drawSnakeEyes(ctx, head, snake.direction);
};

// Helper to draw snake eyes based on direction
const drawSnakeEyes = (ctx: CanvasRenderingContext2D, head: { x: number, y: number }, direction: Direction) => {
    ctx.fillStyle = 'white';
    const eyeSize = CELL_SIZE / 5;
    const eyeOffset = CELL_SIZE / 4;

    let eye1X, eye1Y, eye2X, eye2Y;

    switch (direction) {
        case Direction.UP:
            eye1X = head.x * CELL_SIZE + eyeOffset;
            eye1Y = head.y * CELL_SIZE + eyeOffset;
            eye2X = head.x * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize;
            eye2Y = eye1Y;
            break;
        case Direction.DOWN:
            eye1X = head.x * CELL_SIZE + eyeOffset;
            eye1Y = head.y * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize;
            eye2X = head.x * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize;
            eye2Y = eye1Y;
            break;
        case Direction.LEFT:
            eye1X = head.x * CELL_SIZE + eyeOffset;
            eye1Y = head.y * CELL_SIZE + eyeOffset;
            eye2X = eye1X;
            eye2Y = head.y * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize;
            break;
        case Direction.RIGHT:
            eye1X = head.x * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize;
            eye1Y = head.y * CELL_SIZE + eyeOffset;
            eye2X = eye1X;
            eye2Y = head.y * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize;
            break;
    }

    ctx.fillRect(eye1X, eye1Y, eyeSize, eyeSize);
    ctx.fillRect(eye2X, eye2Y, eyeSize, eyeSize);
};


// Helper to draw a single food item
const drawFood = (ctx: CanvasRenderingContext2D, food: Food) => {
    const centerX = food.position.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = food.position.y * CELL_SIZE + CELL_SIZE / 2;
    const appleRadius = CELL_SIZE / 2.8; // Make apple slightly smaller than cell
    const stemWidth = CELL_SIZE / 8;
    const stemHeight = CELL_SIZE / 4;

    // Draw apple body (red circle)
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(centerX, centerY, appleRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw stem (small green rectangle on top)
    ctx.fillStyle = 'green';
    ctx.fillRect(
        centerX - stemWidth / 2,
        centerY - appleRadius - stemHeight + 2, // Position stem slightly above circle edge
        stemWidth,
        stemHeight
    );
};

// Helper to draw a single power-up item
const drawPowerUp = (ctx: CanvasRenderingContext2D, powerUp: PowerUp) => {
    const rectX = powerUp.position.x * CELL_SIZE;
    const rectY = powerUp.position.y * CELL_SIZE;
    const centerX = rectX + CELL_SIZE / 2;
    const centerY = rectY + CELL_SIZE / 2;

    let bgColor = 'gold'; // Default fallback
    let symbol = '?';
    let textColor = 'black'; // Default text color

    // Determine background color and symbol based on type
    switch (powerUp.type) {
        case 'SPEED': 
            bgColor = '#64B5F6'; // Light Blue (matches legend CSS)
            symbol = 'S'; 
            textColor = 'white';
            break;
        case 'SLOW': 
            bgColor = '#FFB74D'; // Orange (matches legend CSS)
            symbol = 'W'; 
            textColor = 'white';
            break;
        case 'INVINCIBILITY': 
            bgColor = '#BA68C8'; // Purple (matches legend CSS)
            symbol = 'I'; 
            textColor = 'white';
            break;
        case 'DOUBLE_SCORE': 
            bgColor = '#4DB6AC'; // Teal (matches legend CSS)
            symbol = '2x'; 
            textColor = 'white';
            break;
    }

    // Draw background rectangle
    ctx.fillStyle = bgColor;
    ctx.fillRect(rectX, rectY, CELL_SIZE, CELL_SIZE);
    
    // Optional: Add a subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rectX, rectY, CELL_SIZE, CELL_SIZE);

    // Draw the symbol text
    ctx.fillStyle = textColor;
    // Adjust font size slightly for '2x'
    const fontSize = symbol === '2x' ? CELL_SIZE * 0.5 : CELL_SIZE * 0.6;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, centerX, centerY);
}; 