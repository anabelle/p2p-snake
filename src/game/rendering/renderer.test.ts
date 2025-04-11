import { jest } from '@jest/globals';
import { drawGame, drawSnakeEyes, drawFood, drawPowerUp, drawSnake } from './renderer';
import { GameState, Direction, PowerUpType, Snake, Food, PowerUp, Point } from '../state/types';
import { CELL_SIZE, GRID_SIZE } from '../constants';

// --- Mock Canvas Context Setup ---

// Type definitions for tracking mock calls
type MockCall = {
  method: string;
  args: any[];
  // Capture relevant context state at the time of the call
  fillStyle?: string | CanvasGradient | CanvasPattern;
  strokeStyle?: string | CanvasGradient | CanvasPattern;
  lineWidth?: number;
  font?: string;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
};

// More specific types for common drawing methods
type MockFillRectCall = MockCall & { method: 'fillRect' };
type MockStrokeRectCall = MockCall & { method: 'strokeRect' };
type MockFillTextCall = MockCall & { method: 'fillText' };
type MockArcCall = MockCall & { method: 'arc' };
type MockFillCall = MockCall & { method: 'fill' };
type MockClearRectCall = MockCall & { method: 'clearRect' };
type MockBeginPathCall = MockCall & { method: 'beginPath' };
type MockMoveToCall = MockCall & { method: 'moveTo' };
type MockLineToCall = MockCall & { method: 'lineTo' };
type MockStrokeCall = MockCall & { method: 'stroke' };

// Define the return type for createMockContext
type MockContext = CanvasRenderingContext2D & {
  _getMockCalls: () => MockCall[];
  _getFillRectCalls: () => MockFillRectCall[];
  _getStrokeRectCalls: () => MockStrokeRectCall[];
  _getFillTextCalls: () => MockFillTextCall[];
  _getArcCalls: () => MockArcCall[];
  _getFillCalls: () => MockFillCall[];
  _getClearRectCalls: () => MockClearRectCall[];
  _getBeginPathCalls: () => MockBeginPathCall[];
  _getMoveToCalls: () => MockMoveToCall[];
  _getLineToCalls: () => MockLineToCall[];
  _getStrokeCalls: () => MockStrokeCall[];
  // Add other specific getters as needed
};

// Helper function to create a mock 2D rendering context
function createMockContext(gridSize: { width: number; height: number } = GRID_SIZE): MockContext {
  const calls: MockCall[] = [];
  let currentFillStyle: string | CanvasGradient | CanvasPattern = '';
  let currentStrokeStyle: string | CanvasGradient | CanvasPattern = '';
  let currentLineWidth: number = 1;
  let currentFont: string = '';
  let currentTextAlign: CanvasTextAlign = 'start';
  let currentTextBaseline: CanvasTextBaseline = 'alphabetic';

  const mockContext: Partial<MockContext> = {
    // --- Canvas Properties ---
    canvas: {
      width: gridSize.width * CELL_SIZE,
      height: gridSize.height * CELL_SIZE
    } as HTMLCanvasElement, // Mock basic canvas properties

    // --- Context Properties (getters/setters to track changes) ---
    get fillStyle(): string | CanvasGradient | CanvasPattern {
      return currentFillStyle;
    },
    set fillStyle(value: string | CanvasGradient | CanvasPattern) {
      currentFillStyle = value;
    },
    get strokeStyle(): string | CanvasGradient | CanvasPattern {
      return currentStrokeStyle;
    },
    set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
      currentStrokeStyle = value;
    },
    get lineWidth(): number {
      return currentLineWidth;
    },
    set lineWidth(value: number) {
      currentLineWidth = value;
    },
    get font(): string {
      return currentFont;
    },
    set font(value: string) {
      currentFont = value;
    },
    get textAlign(): CanvasTextAlign {
      return currentTextAlign;
    },
    set textAlign(value: CanvasTextAlign) {
      currentTextAlign = value;
    },
    get textBaseline(): CanvasTextBaseline {
      return currentTextBaseline;
    },
    set textBaseline(value: CanvasTextBaseline) {
      currentTextBaseline = value;
    },

    // --- Mocked Methods ---
    fillRect: jest.fn((...args: any[]): void => {
      calls.push({ method: 'fillRect', args, fillStyle: currentFillStyle });
    }),
    strokeRect: jest.fn((...args: any[]): void => {
      calls.push({
        method: 'strokeRect',
        args,
        strokeStyle: currentStrokeStyle,
        lineWidth: currentLineWidth
      });
    }),
    fillText: jest.fn((...args: any[]): void => {
      calls.push({
        method: 'fillText',
        args,
        fillStyle: currentFillStyle,
        font: currentFont,
        textAlign: currentTextAlign,
        textBaseline: currentTextBaseline
      });
    }),
    clearRect: jest.fn((...args: any[]): void => {
      calls.push({ method: 'clearRect', args });
    }),
    beginPath: jest.fn((): void => {
      calls.push({ method: 'beginPath', args: [] });
    }),
    moveTo: jest.fn((...args: any[]): void => {
      calls.push({ method: 'moveTo', args });
    }),
    lineTo: jest.fn((...args: any[]): void => {
      calls.push({ method: 'lineTo', args });
    }),
    arc: jest.fn((...args: any[]): void => {
      calls.push({ method: 'arc', args });
    }),
    fill: jest.fn((): void => {
      calls.push({ method: 'fill', args: [], fillStyle: currentFillStyle });
    }),
    stroke: jest.fn((): void => {
      calls.push({
        method: 'stroke',
        args: [],
        strokeStyle: currentStrokeStyle,
        lineWidth: currentLineWidth
      });
    }),
    closePath: jest.fn((): void => {
      calls.push({ method: 'closePath', args: [] });
    }),
    save: jest.fn((): void => {
      calls.push({ method: 'save', args: [] });
    }), // Mock save/restore if needed
    restore: jest.fn((): void => {
      calls.push({ method: 'restore', args: [] });
    }),
    measureText: jest.fn((text: string) => ({ width: text.length * 6 })) as any, // Basic text measurement mock

    // --- Mock Call Getters ---
    _getMockCalls: () => calls,
    _getFillRectCalls: () => calls.filter((c) => c.method === 'fillRect') as MockFillRectCall[],
    _getStrokeRectCalls: () =>
      calls.filter((c) => c.method === 'strokeRect') as MockStrokeRectCall[],
    _getFillTextCalls: () => calls.filter((c) => c.method === 'fillText') as MockFillTextCall[],
    _getArcCalls: () => calls.filter((c) => c.method === 'arc') as MockArcCall[],
    _getFillCalls: () => calls.filter((c) => c.method === 'fill') as MockFillCall[],
    _getClearRectCalls: () => calls.filter((c) => c.method === 'clearRect') as MockClearRectCall[],
    _getBeginPathCalls: () => calls.filter((c) => c.method === 'beginPath') as MockBeginPathCall[],
    _getMoveToCalls: () => calls.filter((c) => c.method === 'moveTo') as MockMoveToCall[],
    _getLineToCalls: () => calls.filter((c) => c.method === 'lineTo') as MockLineToCall[],
    _getStrokeCalls: () => calls.filter((c) => c.method === 'stroke') as MockStrokeCall[]
  };

  // Return the fully typed mock context
  return mockContext as MockContext;
}

// --- Test Suites ---

describe('Game Renderer', () => {
  let mockCtx: MockContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    jest.clearAllMocks();
  });

  // --- drawFood Tests ---
  describe('drawFood', () => {
    it('should draw a food item (apple) correctly', () => {
      const foodItem: Food = { position: { x: 5, y: 8 }, value: 1 };
      const expectedCenterX = foodItem.position.x * CELL_SIZE + CELL_SIZE / 2;
      const expectedCenterY = foodItem.position.y * CELL_SIZE + CELL_SIZE / 2;
      const expectedRadius = CELL_SIZE / 2.8;
      const expectedStemWidth = CELL_SIZE / 8;
      const expectedStemHeight = CELL_SIZE / 4;
      const expectedStemX = expectedCenterX - expectedStemWidth / 2;
      const expectedStemY = expectedCenterY - expectedRadius - expectedStemHeight + 2;

      drawFood(mockCtx, foodItem);

      // Check beginPath, arc, and fill were called for the apple body
      const beginPathCalls = mockCtx._getBeginPathCalls();
      expect(beginPathCalls.length).toBe(1);
      const arcCalls = mockCtx._getArcCalls();
      expect(arcCalls.length).toBe(1);
      expect(arcCalls[0].args).toEqual([
        expectedCenterX,
        expectedCenterY,
        expectedRadius,
        0,
        Math.PI * 2
      ]);
      const fillCalls = mockCtx._getFillCalls();
      expect(fillCalls.length).toBe(1);
      // Check fillStyle was 'red' when fill() was called for the apple body
      expect(fillCalls[0].fillStyle).toBe('red');

      // Check fillRect was called for the stem
      const fillRectCalls = mockCtx._getFillRectCalls();
      expect(fillRectCalls.length).toBe(1);
      expect(fillRectCalls[0].args).toEqual([
        expectedStemX,
        expectedStemY,
        expectedStemWidth,
        expectedStemHeight
      ]);
      // Check fillStyle was 'green' when fillRect() was called for the stem
      expect(fillRectCalls[0].fillStyle).toBe('green');
    });
  });

  // --- drawPowerUp Tests ---
  describe('drawPowerUp', () => {
    // Helper to test common power-up drawing logic
    const testPowerUpDrawing = (
      type: PowerUpType,
      expectedSymbol: string,
      expectedBgColor: string,
      expectedTextColor: string = 'white' // Most power-ups use white text
    ) => {
      const powerUpItem: PowerUp = {
        id: `pu-${type}`,
        type: type,
        position: { x: 3, y: 4 },
        expiresAt: Date.now() + 5000
      };
      const expectedRectX = powerUpItem.position.x * CELL_SIZE;
      const expectedRectY = powerUpItem.position.y * CELL_SIZE;
      const expectedCenterX = expectedRectX + CELL_SIZE / 2;
      const expectedCenterY = expectedRectY + CELL_SIZE / 2;
      const expectedFontSize = expectedSymbol === '2x' ? CELL_SIZE * 0.5 : CELL_SIZE * 0.6;

      drawPowerUp(mockCtx, powerUpItem);

      // Check background rectangle fill
      const fillRectCalls = mockCtx._getFillRectCalls();
      expect(fillRectCalls.length).toBe(1);
      expect(fillRectCalls[0].args).toEqual([expectedRectX, expectedRectY, CELL_SIZE, CELL_SIZE]);
      expect(fillRectCalls[0].fillStyle).toBe(expectedBgColor);

      // Check border stroke
      const strokeRectCalls = mockCtx._getStrokeRectCalls();
      expect(strokeRectCalls.length).toBe(1);
      expect(strokeRectCalls[0].args).toEqual([expectedRectX, expectedRectY, CELL_SIZE, CELL_SIZE]);
      expect(strokeRectCalls[0].strokeStyle).toBe('rgba(255, 255, 255, 0.3)');
      expect(strokeRectCalls[0].lineWidth).toBe(1);

      // Check symbol text fill
      const fillTextCalls = mockCtx._getFillTextCalls();
      expect(fillTextCalls.length).toBe(1);
      expect(fillTextCalls[0].args).toEqual([expectedSymbol, expectedCenterX, expectedCenterY]);
      expect(fillTextCalls[0].fillStyle).toBe(expectedTextColor);
      expect(fillTextCalls[0].font).toBe(`bold ${expectedFontSize}px Arial`);
      expect(fillTextCalls[0].textAlign).toBe('center');
      expect(fillTextCalls[0].textBaseline).toBe('middle');
    };

    it('should draw a SPEED power-up', () => {
      testPowerUpDrawing(PowerUpType.SPEED, 'S', '#64B5F6');
    });

    it('should draw a SLOW power-up', () => {
      testPowerUpDrawing(PowerUpType.SLOW, 'W', '#FFB74D');
    });

    it('should draw an INVINCIBILITY power-up', () => {
      testPowerUpDrawing(PowerUpType.INVINCIBILITY, 'I', '#BA68C8');
    });

    it('should draw a DOUBLE_SCORE power-up', () => {
      testPowerUpDrawing(PowerUpType.DOUBLE_SCORE, '2x', '#4DB6AC');
    });

    // Optional: Test default/unknown case if the switch had a default
    // it('should draw a default power-up symbol for unknown types', () => {
    //   testPowerUpDrawing('UNKNOWN' as PowerUpType, '?', 'gold', 'black');
    // });
  });

  // --- drawSnakeEyes Tests ---
  describe('drawSnakeEyes', () => {
    const headPos = { x: 10, y: 12 };
    const eyeSize = CELL_SIZE / 5;
    const eyeOffset = CELL_SIZE / 4;

    // Helper to test eye drawing for a specific direction
    const testEyeDirection = (direction: Direction, expectedEye1: Point, expectedEye2: Point) => {
      drawSnakeEyes(mockCtx, headPos, direction);

      const fillRectCalls = mockCtx._getFillRectCalls();
      expect(fillRectCalls.length).toBe(2); // Should draw two eyes
      expect(mockCtx.fillStyle).toBe('white'); // Eyes should be white

      // Check the positions and sizes of the fillRect calls
      // Note: The order of the calls might not be guaranteed, so check both possibilities
      const call1Args = [
        fillRectCalls[0].args[0],
        fillRectCalls[0].args[1],
        fillRectCalls[0].args[2],
        fillRectCalls[0].args[3]
      ];
      const call2Args = [
        fillRectCalls[1].args[0],
        fillRectCalls[1].args[1],
        fillRectCalls[1].args[2],
        fillRectCalls[1].args[3]
      ];
      const expectedArgs1 = [expectedEye1.x, expectedEye1.y, eyeSize, eyeSize];
      const expectedArgs2 = [expectedEye2.x, expectedEye2.y, eyeSize, eyeSize];

      expect(
        (JSON.stringify(call1Args) === JSON.stringify(expectedArgs1) &&
          JSON.stringify(call2Args) === JSON.stringify(expectedArgs2)) ||
          (JSON.stringify(call1Args) === JSON.stringify(expectedArgs2) &&
            JSON.stringify(call2Args) === JSON.stringify(expectedArgs1))
      ).toBe(true);

      // Check fillStyle was white when eyes were drawn
      expect(fillRectCalls[0].fillStyle).toBe('white');
      expect(fillRectCalls[1].fillStyle).toBe('white');
    };

    it('should draw eyes correctly for Direction.UP', () => {
      const eye1X = headPos.x * CELL_SIZE + eyeOffset;
      const eye1Y = headPos.y * CELL_SIZE + eyeOffset;
      const eye2X = headPos.x * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize;
      testEyeDirection(Direction.UP, { x: eye1X, y: eye1Y }, { x: eye2X, y: eye1Y });
    });

    it('should draw eyes correctly for Direction.DOWN', () => {
      const eye1X = headPos.x * CELL_SIZE + eyeOffset;
      const eye1Y = headPos.y * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize;
      const eye2X = headPos.x * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize;
      testEyeDirection(Direction.DOWN, { x: eye1X, y: eye1Y }, { x: eye2X, y: eye1Y });
    });

    it('should draw eyes correctly for Direction.LEFT', () => {
      const eye1X = headPos.x * CELL_SIZE + eyeOffset;
      const eye1Y = headPos.y * CELL_SIZE + eyeOffset;
      const eye2Y = headPos.y * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize;
      testEyeDirection(Direction.LEFT, { x: eye1X, y: eye1Y }, { x: eye1X, y: eye2Y });
    });

    it('should draw eyes correctly for Direction.RIGHT', () => {
      const eye1X = headPos.x * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize;
      const eye1Y = headPos.y * CELL_SIZE + eyeOffset;
      const eye2Y = headPos.y * CELL_SIZE + CELL_SIZE - eyeOffset - eyeSize;
      testEyeDirection(Direction.RIGHT, { x: eye1X, y: eye1Y }, { x: eye1X, y: eye2Y });
    });
  });

  // --- drawSnake Tests ---
  describe('drawSnake', () => {
    const snakeBase: Omit<Snake, 'body' | 'direction'> = {
      id: 'player1',
      color: 'cyan',
      score: 0,
      activePowerUps: []
    };

    it('should draw a non-local snake correctly', () => {
      const snake: Snake = {
        ...snakeBase,
        body: [
          { x: 5, y: 5 },
          { x: 4, y: 5 },
          { x: 3, y: 5 }
        ],
        direction: Direction.RIGHT
      };

      drawSnake(mockCtx, snake, false);

      const fillRectCalls = mockCtx._getFillRectCalls();
      const strokeRectCalls = mockCtx._getStrokeRectCalls();
      const eyeCalls = mockCtx._getFillRectCalls().filter((call) => call.fillStyle === 'white'); // Eyes are white

      // Expect 1 fillRect for head + 2 for body segments = 3
      expect(fillRectCalls.length - eyeCalls.length).toBe(3);
      // Expect 1 strokeRect for head + 2 for body segments = 3
      expect(strokeRectCalls.length).toBe(3);

      // Check fill color for snake
      // Filter out eye calls to get only body/head segments
      const bodyFillCalls = fillRectCalls.filter((call) => call.fillStyle !== 'white');
      // Ensure we have body segments before asserting their color
      expect(bodyFillCalls.length).toBeGreaterThan(0);
      bodyFillCalls.forEach((call) => {
        // Now assert on the filtered calls
        expect(call.fillStyle).toBe(snake.color);
      });

      // Check non-local stroke style and line width
      strokeRectCalls.forEach((call) => {
        expect(call.strokeStyle).toBe('#333');
        expect(call.lineWidth).toBe(1);
      });

      // Check coordinates (example: check head and one segment)
      const head = snake.body[0];
      const segment1 = snake.body[1];
      expect(
        fillRectCalls.some(
          (call) => call.args[0] === head.x * CELL_SIZE && call.args[1] === head.y * CELL_SIZE
        )
      ).toBe(true);
      expect(
        strokeRectCalls.some(
          (call) => call.args[0] === head.x * CELL_SIZE && call.args[1] === head.y * CELL_SIZE
        )
      ).toBe(true);
      expect(
        fillRectCalls.some(
          (call) =>
            call.args[0] === segment1.x * CELL_SIZE && call.args[1] === segment1.y * CELL_SIZE
        )
      ).toBe(true);
      expect(
        strokeRectCalls.some(
          (call) =>
            call.args[0] === segment1.x * CELL_SIZE && call.args[1] === segment1.y * CELL_SIZE
        )
      ).toBe(true);

      // Ensure eyes were drawn (implicitly tested by drawSnakeEyes tests, but good check)
      expect(eyeCalls.length).toBe(2);
    });

    it('should draw a local snake correctly (with highlight)', () => {
      const snake: Snake = {
        ...snakeBase,
        body: [
          { x: 8, y: 2 },
          { x: 8, y: 3 }
        ],
        direction: Direction.UP
      };

      drawSnake(mockCtx, snake, true);

      const fillRectCalls = mockCtx._getFillRectCalls();
      const strokeRectCalls = mockCtx._getStrokeRectCalls();
      const eyeCalls = mockCtx._getFillRectCalls().filter((call) => call.fillStyle === 'white');

      expect(fillRectCalls.length - eyeCalls.length).toBe(2);
      expect(strokeRectCalls.length).toBe(2);

      // Check local stroke style and line width
      strokeRectCalls.forEach((call) => {
        expect(call.strokeStyle).toBe('#fff'); // White highlight
        expect(call.lineWidth).toBe(2); // Thicker line
      });

      // Check fill color for snake
      // Filter out eye calls to get only body/head segments
      const bodyFillCalls = fillRectCalls.filter((call) => call.fillStyle !== 'white');
      // Ensure we have body segments before asserting their color
      expect(bodyFillCalls.length).toBeGreaterThan(0);
      bodyFillCalls.forEach((call) => {
        // Now assert on the filtered calls
        expect(call.fillStyle).toBe(snake.color);
      });

      expect(eyeCalls.length).toBe(2);
    });

    it('should not draw if snake body is empty', () => {
      const snake: Snake = {
        ...snakeBase,
        body: [], // Empty body
        direction: Direction.RIGHT
      };

      drawSnake(mockCtx, snake, false);

      // No drawing calls should have been made
      expect(mockCtx._getMockCalls().length).toBe(0);
    });
  });

  // --- drawGame Tests ---
  describe('drawGame', () => {
    let state: GameState;
    const localPlayerId = 'p1';

    beforeEach(() => {
      // Create state for testing drawGame
      state = {
        snakes: [
          {
            id: localPlayerId,
            body: [{ x: 1, y: 1 }],
            direction: Direction.RIGHT,
            color: 'red',
            score: 0,
            activePowerUps: []
          },
          {
            id: 'p2',
            body: [{ x: 5, y: 5 }],
            direction: Direction.LEFT,
            color: 'blue',
            score: 0,
            activePowerUps: []
          }
        ],
        food: [
          { position: { x: 10, y: 10 }, value: 1 },
          { position: { x: 15, y: 15 }, value: 1 }
        ],
        powerUps: [{ id: 'pu1', type: PowerUpType.SPEED, position: { x: 2, y: 2 }, expiresAt: 0 }],
        activePowerUps: [],
        gridSize: GRID_SIZE,
        playerStats: {
          [localPlayerId]: {
            id: localPlayerId,
            name: 'Player 1',
            color: 'red',
            score: 0,
            deaths: 0,
            isConnected: true
          },
          p2: { id: 'p2', name: 'Player 2', color: 'blue', score: 0, deaths: 0, isConnected: true }
        },
        timestamp: 0,
        sequence: 0,
        rngSeed: 0,
        playerCount: 2,
        powerUpCounter: 1
      };
    });

    it('should clear the canvas', () => {
      drawGame(mockCtx, state, localPlayerId);
      const clearRectCalls = mockCtx._getClearRectCalls();
      expect(clearRectCalls.length).toBe(1);
      expect(clearRectCalls[0].args).toEqual([0, 0, mockCtx.canvas.width, mockCtx.canvas.height]);
    });

    it('should draw the background', () => {
      drawGame(mockCtx, state, localPlayerId);
      const fillRectCalls = mockCtx._getFillRectCalls();
      // Find the background fill call (first fillRect, specific color)
      const backgroundCall = fillRectCalls.find(
        (call) =>
          call.args[0] === 0 &&
          call.args[1] === 0 &&
          call.args[2] === mockCtx.canvas.width &&
          call.args[3] === mockCtx.canvas.height &&
          call.fillStyle === '#222'
      );
      expect(backgroundCall).toBeDefined();
    });

    it('should draw grid lines', () => {
      drawGame(mockCtx, state, localPlayerId);
      const moveToCalls = mockCtx._getMoveToCalls();
      const lineToCalls = mockCtx._getLineToCalls();
      const strokeCalls = mockCtx._getStrokeCalls().filter((call) => call.strokeStyle === '#444'); // Filter for grid line strokes
      const expectedVerticalLines = state.gridSize.width + 1;
      const expectedHorizontalLines = state.gridSize.height + 1;
      const expectedTotalLines = expectedVerticalLines + expectedHorizontalLines;

      // Check if the correct number of lines were started and drawn
      expect(moveToCalls.length).toBe(expectedTotalLines);
      expect(lineToCalls.length).toBe(expectedTotalLines);
      expect(strokeCalls.length).toBe(expectedTotalLines);

      // Check strokeStyle and lineWidth for grid lines (check one representative call)
      expect(strokeCalls[0].strokeStyle).toBe('#444');
      expect(strokeCalls[0].lineWidth).toBe(0.5);
    });

    it('should make canvas calls corresponding to drawing food items', () => {
      drawGame(mockCtx, state, localPlayerId);
      const arcCalls = mockCtx._getArcCalls();
      const foodFillRectCalls = mockCtx._getFillRectCalls().filter((c) => c.fillStyle === 'green'); // Food stems are green
      expect(arcCalls.length).toBe(state.food.length);
      expect(foodFillRectCalls.length).toBe(state.food.length);
      // Add more specific checks for coordinates if needed
    });

    it('should make canvas calls corresponding to drawing power-ups', () => {
      drawGame(mockCtx, state, localPlayerId);

      const powerUpBgColors = ['#64B5F6', '#FFB74D', '#BA68C8', '#4DB6AC']; // SPEED, SLOW, INVINCIBILITY, DOUBLE_SCORE

      const powerUpFillRects = mockCtx
        ._getFillRectCalls()
        .filter((c) => powerUpBgColors.includes(c.fillStyle?.toString() ?? ''));

      const powerUpStrokes = mockCtx
        ._getStrokeRectCalls()
        .filter((c) => c.strokeStyle === 'rgba(255, 255, 255, 0.3)');
      const powerUpTexts = mockCtx._getFillTextCalls();
      expect(powerUpFillRects.length).toBe(state.powerUps.length);
      expect(powerUpStrokes.length).toBe(state.powerUps.length);
      expect(powerUpTexts.length).toBe(state.powerUps.length);
      // Add more specific checks for coordinates, colors, text if needed
    });

    it('should make canvas calls corresponding to drawing snakes', () => {
      drawGame(mockCtx, state, localPlayerId);

      const snakeFillRects = mockCtx
        ._getFillRectCalls()
        .filter((c) => c.fillStyle === 'red' || c.fillStyle === 'blue'); // Filter by snake colors
      const snakeStrokeRects = mockCtx
        ._getStrokeRectCalls()
        .filter((c) => c.strokeStyle === '#fff' || c.strokeStyle === '#333');
      const eyeCalls = mockCtx._getFillRectCalls().filter((c) => c.fillStyle === 'white');

      const expectedSegments = state.snakes.reduce((sum, s) => sum + s.body.length, 0);
      const expectedHeads = state.snakes.length;

      expect(snakeFillRects.length).toBe(expectedSegments); // Head + body fills
      expect(snakeStrokeRects.length).toBe(expectedSegments); // Head + body strokes
      expect(eyeCalls.length).toBe(expectedHeads * 2);

      // Check for local snake highlight (stroke = #fff, lineWidth = 2)
      const localSnakeStrokes = snakeStrokeRects.filter((c) => c.strokeStyle === '#fff');
      expect(localSnakeStrokes.length).toBe(
        state.snakes.find((s) => s.id === localPlayerId)?.body.length
      );
      localSnakeStrokes.forEach((c) => expect(c.lineWidth).toBe(2));

      // Check for non-local snake style (stroke = #333, lineWidth = 1)
      const nonLocalSnakeStrokes = snakeStrokeRects.filter((c) => c.strokeStyle === '#333');
      expect(nonLocalSnakeStrokes.length).toBe(
        state.snakes.find((s) => s.id !== localPlayerId)?.body.length
      );
      nonLocalSnakeStrokes.forEach((c) => expect(c.lineWidth).toBe(1));
    });
  });
});
