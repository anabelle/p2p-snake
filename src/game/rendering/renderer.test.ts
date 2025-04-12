import { jest } from '@jest/globals';
import { drawGame, drawSnakeEyes, drawFood, drawPowerUp, drawSnake } from './renderer';
import { GameState, Direction, PowerUpType, Snake, Food, PowerUp, Point } from '../state/types';
import { CELL_SIZE, GRID_SIZE } from '../constants';

// Helper function to calculate default scale factors (used when not explicitly testing scaling)
const defaultScaleFactors = {
  scaleX: 1,
  scaleY: 1,
  scale: 1,
  cellWidth: CELL_SIZE,
  cellHeight: CELL_SIZE
};

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
function createMockContext(
  gridSize: { width: number; height: number } = GRID_SIZE,
  // Optional explicit canvas dimensions for testing scaling
  canvasWidth?: number,
  canvasHeight?: number
): MockContext {
  const actualCanvasWidth = canvasWidth ?? gridSize.width * CELL_SIZE;
  const actualCanvasHeight = canvasHeight ?? gridSize.height * CELL_SIZE;
  const calls: MockCall[] = [];
  let currentFillStyle: string | CanvasGradient | CanvasPattern = '';
  let currentStrokeStyle: string | CanvasGradient | CanvasPattern = '';
  let currentLineWidth: number = 1;
  let currentFont: string = '';
  let currentTextAlign: CanvasTextAlign = 'start';
  let currentTextBaseline: CanvasTextBaseline = 'alphabetic';

  const mockContext: Partial<MockContext> = {
    canvas: {
      width: actualCanvasWidth,
      height: actualCanvasHeight
    } as HTMLCanvasElement,

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
    }),
    restore: jest.fn((): void => {
      calls.push({ method: 'restore', args: [] });
    }),
    measureText: jest.fn((text: string) => ({ width: text.length * 6 })) as any,

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

      drawFood(mockCtx, foodItem, defaultScaleFactors);

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

      drawPowerUp(mockCtx, powerUpItem, defaultScaleFactors);

      // Check background rectangle fill
      const fillRectCalls = mockCtx._getFillRectCalls();
      expect(fillRectCalls.length).toBe(1);
      expect(fillRectCalls[0].args).toEqual([expectedRectX, expectedRectY, CELL_SIZE, CELL_SIZE]);
      expect(fillRectCalls[0].fillStyle).toBe(expectedBgColor);

      // Check symbol text fill
      const fillTextCalls = mockCtx._getFillTextCalls();
      expect(fillTextCalls.length).toBe(1);
      expect(fillTextCalls[0].args).toEqual([expectedSymbol, expectedCenterX, expectedCenterY]);
      expect(fillTextCalls[0].fillStyle).toBe(expectedTextColor);
      expect(fillTextCalls[0].font).toBe(`bold ${expectedFontSize}px sans-serif`);
      expect(fillTextCalls[0].textAlign).toBe('center');
      expect(fillTextCalls[0].textBaseline).toBe('middle');
    };

    it('should draw a SPEED power-up', () => {
      testPowerUpDrawing(PowerUpType.SPEED, 'S', 'lightblue', 'black');
    });

    it('should draw a SLOW power-up', () => {
      testPowerUpDrawing(PowerUpType.SLOW, 'W', '#FFB74D');
    });

    it('should draw an INVINCIBILITY power-up', () => {
      testPowerUpDrawing(PowerUpType.INVINCIBILITY, 'I', '#BA68C8');
    });

    it('should draw a DOUBLE_SCORE power-up', () => {
      testPowerUpDrawing(PowerUpType.DOUBLE_SCORE, 'x2', 'gold', 'black');
    });

    // Optional: Test default/unknown case if the switch had a default
    // it('should draw a default power-up symbol for unknown types', () => {
    //   testPowerUpDrawing('UNKNOWN' as PowerUpType, '?', 'gold', 'black');
    // });
  });

  // --- drawSnakeEyes Tests ---
  describe('drawSnakeEyes', () => {
    const headPos = { x: 10, y: 12 };
    // Create a minimal snake object for testing eyes
    const testSnake: Snake = {
      id: 'test',
      color: 'green',
      direction: Direction.UP,
      score: 0,
      activePowerUps: [],
      body: [headPos] // Body only needs the head position for eye calculation
    };

    // Helper to test eye drawing for a specific direction
    const testEyeDirection = (
      direction: Direction,
      expectedEye1Center: Point,
      expectedEye2Center: Point
    ) => {
      const currentTestSnake = { ...testSnake, direction: direction };
      drawSnakeEyes(mockCtx, currentTestSnake, defaultScaleFactors);

      // Eyes are now drawn using arc, not fillRect
      const arcCalls = mockCtx._getArcCalls();
      // Expect 4 arc calls: 2 for white outer eyes, 2 for black pupils
      expect(arcCalls.length).toBe(4);

      const whiteEyeCalls = arcCalls.filter((_, i) => i < 2); // First two arcs are white background
      const blackPupilCalls = arcCalls.filter((_, i) => i >= 2); // Last two arcs are black pupils

      // Check white eye positions and sizes
      expect(whiteEyeCalls.length).toBe(2);
      const whiteRadius = defaultScaleFactors.cellWidth / 4 / 2; // Matches eyeSize / 2 in drawSnakeEyes
      const call1ArgsWhite = whiteEyeCalls[0].args;
      const call2ArgsWhite = whiteEyeCalls[1].args;
      const expectedArgs1White = [
        expectedEye1Center.x,
        expectedEye1Center.y,
        whiteRadius,
        0,
        Math.PI * 2
      ];
      const expectedArgs2White = [
        expectedEye2Center.x,
        expectedEye2Center.y,
        whiteRadius,
        0,
        Math.PI * 2
      ];

      // Check positions (order might vary)
      expect(
        (JSON.stringify(call1ArgsWhite) === JSON.stringify(expectedArgs1White) &&
          JSON.stringify(call2ArgsWhite) === JSON.stringify(expectedArgs2White)) ||
          (JSON.stringify(call1ArgsWhite) === JSON.stringify(expectedArgs2White) &&
            JSON.stringify(call2ArgsWhite) === JSON.stringify(expectedArgs1White))
      ).toBe(true);

      // Check black pupil positions and sizes (should be centered on white eyes)
      expect(blackPupilCalls.length).toBe(2);
      const blackRadius = whiteRadius / 2; // Matches eyeSize / 4 in drawSnakeEyes
      const call1ArgsBlack = blackPupilCalls[0].args;
      const call2ArgsBlack = blackPupilCalls[1].args;
      const expectedArgs1Black = [
        expectedEye1Center.x,
        expectedEye1Center.y,
        blackRadius,
        0,
        Math.PI * 2
      ];
      const expectedArgs2Black = [
        expectedEye2Center.x,
        expectedEye2Center.y,
        blackRadius,
        0,
        Math.PI * 2
      ];

      // Check positions (order might vary)
      expect(
        (JSON.stringify(call1ArgsBlack) === JSON.stringify(expectedArgs1Black) &&
          JSON.stringify(call2ArgsBlack) === JSON.stringify(expectedArgs2Black)) ||
          (JSON.stringify(call1ArgsBlack) === JSON.stringify(expectedArgs2Black) &&
            JSON.stringify(call2ArgsBlack) === JSON.stringify(expectedArgs1Black))
      ).toBe(true);

      // Check fillStyle was white when white parts were drawn (checked via fill call after arcs)
      const fillCalls = mockCtx._getFillCalls();
      expect(fillCalls[0].fillStyle).toBe('white'); // First fill is white
      expect(fillCalls[1].fillStyle).toBe('black'); // Second fill is black
    };

    // --- Updated Expected Eye Center Calculations ---
    // These now need to align with the logic in drawSnakeEyes using scaleFactors
    const headCenterX =
      headPos.x * defaultScaleFactors.cellWidth + defaultScaleFactors.cellWidth / 2;
    const headCenterY =
      headPos.y * defaultScaleFactors.cellHeight + defaultScaleFactors.cellHeight / 2;
    const scaledEyeOffset = defaultScaleFactors.cellWidth / 5; // Matches eyeOffset in drawSnakeEyes

    it('should draw eyes correctly for Direction.UP', () => {
      const eye1Center = { x: headCenterX - scaledEyeOffset, y: headCenterY - scaledEyeOffset };
      const eye2Center = { x: headCenterX + scaledEyeOffset, y: headCenterY - scaledEyeOffset };
      testEyeDirection(Direction.UP, eye1Center, eye2Center);
    });

    it('should draw eyes correctly for Direction.DOWN', () => {
      const eye1Center = { x: headCenterX - scaledEyeOffset, y: headCenterY + scaledEyeOffset };
      const eye2Center = { x: headCenterX + scaledEyeOffset, y: headCenterY + scaledEyeOffset };
      testEyeDirection(Direction.DOWN, eye1Center, eye2Center);
    });

    it('should draw eyes correctly for Direction.LEFT', () => {
      const eye1Center = { x: headCenterX - scaledEyeOffset, y: headCenterY - scaledEyeOffset };
      const eye2Center = { x: headCenterX - scaledEyeOffset, y: headCenterY + scaledEyeOffset };
      testEyeDirection(Direction.LEFT, eye1Center, eye2Center);
    });

    it('should draw eyes correctly for Direction.RIGHT', () => {
      const eye1Center = { x: headCenterX + scaledEyeOffset, y: headCenterY - scaledEyeOffset };
      const eye2Center = { x: headCenterX + scaledEyeOffset, y: headCenterY + scaledEyeOffset };
      testEyeDirection(Direction.RIGHT, eye1Center, eye2Center);
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

      drawSnake(mockCtx, snake, false, defaultScaleFactors);

      const fillRectCalls = mockCtx._getFillRectCalls();
      const strokeRectCalls = mockCtx._getStrokeRectCalls();
      const arcCalls = mockCtx._getArcCalls();
      const fillCalls = mockCtx._getFillCalls();

      // Expect 1 fillRect for head + 2 for body segments = 3
      expect(fillRectCalls.length).toBe(3);

      // Expect 1 strokeRect for head + 2 for body segments = 3
      expect(strokeRectCalls.length).toBe(3);

      // Check fill color for snake
      expect(fillRectCalls[0].fillStyle).toBe(snake.color);
      // Check all segments have valid colors
      for (let i = 1; i < fillRectCalls.length; i++) {
        expect(fillRectCalls[i].fillStyle).toMatch(/#[0-9a-fA-F]{6}|cyan/);
      }

      // Check non-local stroke style and line width
      strokeRectCalls.forEach((call) => {
        expect(call.strokeStyle).toBe('#333333');
        expect(call.lineWidth).toBe(1 * defaultScaleFactors.scale);
      });

      // Check coordinates (example: check head and one segment)
      const head = snake.body[0];
      const segment1 = snake.body[1];
      expect(
        fillRectCalls.some(
          (call) =>
            call.args[0] === head.x * defaultScaleFactors.cellWidth &&
            call.args[1] === head.y * defaultScaleFactors.cellHeight
        )
      ).toBe(true);
      expect(
        strokeRectCalls.some(
          (call) =>
            call.args[0] === head.x * defaultScaleFactors.cellWidth &&
            call.args[1] === head.y * defaultScaleFactors.cellHeight
        )
      ).toBe(true);
      expect(
        fillRectCalls.some(
          (call) =>
            call.args[0] === segment1.x * defaultScaleFactors.cellWidth &&
            call.args[1] === segment1.y * defaultScaleFactors.cellHeight
        )
      ).toBe(true);
      expect(
        strokeRectCalls.some(
          (call) =>
            call.args[0] === segment1.x * defaultScaleFactors.cellWidth &&
            call.args[1] === segment1.y * defaultScaleFactors.cellHeight
        )
      ).toBe(true);

      // Check that eyes were drawn with arc calls
      expect(arcCalls.length).toBe(4);
      expect(fillCalls.length).toBe(2);
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

      drawSnake(mockCtx, snake, true, defaultScaleFactors);

      const fillRectCalls = mockCtx._getFillRectCalls();
      const strokeRectCalls = mockCtx._getStrokeRectCalls();
      const arcCalls = mockCtx._getArcCalls();
      const fillCalls = mockCtx._getFillCalls();

      expect(fillRectCalls.length).toBe(2);
      expect(strokeRectCalls.length).toBe(2);
      expect(arcCalls.length).toBe(4);
      expect(fillCalls.length).toBe(2);

      // All segments should have white stroke, but head should have thicker line
      strokeRectCalls.forEach((call, i) => {
        expect(call.strokeStyle).toBe('#FFFFFF'); // White highlight for all segments
        expect(call.lineWidth).toBe(2 * defaultScaleFactors.scale);
      });

      // Check fill color for snake
      expect(fillRectCalls[0].fillStyle).toBe(snake.color);
      // Check all segments have valid colors
      for (let i = 1; i < fillRectCalls.length; i++) {
        expect(fillRectCalls[i].fillStyle).toMatch(/#[0-9a-fA-F]{6}|cyan/);
      }

      // Check that eye fills use correct colors
      expect(fillCalls[0].fillStyle).toBe('white'); // First fill is white
      expect(fillCalls[1].fillStyle).toBe('black'); // Second fill is black
    });

    it('should not draw if snake body is empty', () => {
      const snake: Snake = {
        ...snakeBase,
        body: [], // Empty body
        direction: Direction.RIGHT
      };

      drawSnake(mockCtx, snake, false, defaultScaleFactors);

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
      // Now just checks clearRect since we don't draw a background fill anymore
      const clearRectCalls = mockCtx._getClearRectCalls();
      expect(clearRectCalls.length).toBe(1);
      expect(clearRectCalls[0].args).toEqual([0, 0, mockCtx.canvas.width, mockCtx.canvas.height]);
    });

    it('should draw grid lines', () => {
      drawGame(mockCtx, state, localPlayerId);
      const moveToCalls = mockCtx._getMoveToCalls();
      const lineToCalls = mockCtx._getLineToCalls();
      const strokeCalls = mockCtx._getStrokeCalls(); // All stroke calls (1 batch for grid)
      const beginPathCalls = mockCtx._getBeginPathCalls(); // Should have 1 for the grid

      const expectedVerticalLines = state.gridSize.width + 1;
      const expectedHorizontalLines = state.gridSize.height + 1;
      const expectedTotalLines = expectedVerticalLines + expectedHorizontalLines;

      // Check if the correct number of lines were started and drawn
      expect(moveToCalls.length).toBe(expectedTotalLines);
      expect(lineToCalls.length).toBe(expectedTotalLines);
      expect(strokeCalls.length).toBe(1); // All lines drawn in a single path
      expect(beginPathCalls.length).toBeGreaterThanOrEqual(1); // At least one beginPath

      // Check strokeStyle and lineWidth for grid lines (check one representative call)
      expect(strokeCalls[0].strokeStyle).toBe('#333'); // Dark grey for grid
      // Scale should be applied to line width (1 * scale)
      expect(strokeCalls[0].lineWidth).toBe(1 * defaultScaleFactors.scale);
    });

    it('should make canvas calls corresponding to drawing food items', () => {
      drawGame(mockCtx, state, localPlayerId);
      const arcCalls = mockCtx._getArcCalls();
      const foodFillRectCalls = mockCtx._getFillRectCalls().filter((c) => c.fillStyle === 'green'); // Food stems are green
      // Now should have 2 arc calls per food (one for each food apple)
      // and 1 fillRect for each stem
      expect(arcCalls.length).toBeGreaterThanOrEqual(state.food.length);
      expect(foodFillRectCalls.length).toBe(state.food.length);
      // Add more specific checks for coordinates if needed
    });

    it('should make canvas calls corresponding to drawing power-ups', () => {
      drawGame(mockCtx, state, localPlayerId);

      // Updated colors used in the powerUp implementation
      const powerUpBgColors = ['lightblue', '#FFB74D', '#BA68C8', 'gold']; // SPEED, SLOW, INVINCIBILITY, DOUBLE_SCORE

      const powerUpFillRects = mockCtx
        ._getFillRectCalls()
        .filter((c) => powerUpBgColors.includes(c.fillStyle?.toString() ?? ''));

      const powerUpTexts = mockCtx._getFillTextCalls();
      expect(powerUpFillRects.length).toBe(state.powerUps.length);
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
        .filter((c) => c.strokeStyle === '#FFFFFF' || c.strokeStyle === '#333333');
      // Eyes are now drawn with arc instead of fillRect
      const arcCalls = mockCtx._getArcCalls();
      const whiteFills = mockCtx._getFillCalls().filter((c) => c.fillStyle === 'white');
      const blackFills = mockCtx._getFillCalls().filter((c) => c.fillStyle === 'black');

      const expectedSegments = state.snakes.reduce((sum, s) => sum + s.body.length, 0);
      const expectedHeads = state.snakes.length;

      expect(snakeFillRects.length).toBe(expectedSegments); // Head + body fills
      expect(snakeStrokeRects.length).toBe(expectedSegments); // Head + body strokes
      // Each snake head should have 4 arc calls (2 for white eyes, 2 for black pupils)
      // and 2 fill calls (1 white, 1 black)
      expect(arcCalls.length).toBeGreaterThanOrEqual(expectedHeads * 4);
      expect(whiteFills.length).toBeGreaterThanOrEqual(expectedHeads);
      expect(blackFills.length).toBeGreaterThanOrEqual(expectedHeads);

      // Check for local snake highlight (stroke = #fff, lineWidth = 2)
      const localSnakeStrokes = snakeStrokeRects.filter((c) => c.strokeStyle === '#FFFFFF');
      expect(localSnakeStrokes.length).toBe(
        state.snakes.find((s) => s.id === localPlayerId)?.body.length
      );
      // All local snake segments now have thicker border
      localSnakeStrokes.forEach((c) => expect(c.lineWidth).toBe(2 * defaultScaleFactors.scale));

      // Check for non-local snake style (stroke = #333, lineWidth = 1)
      const nonLocalSnakeStrokes = snakeStrokeRects.filter((c) => c.strokeStyle === '#333333');
      expect(nonLocalSnakeStrokes.length).toBe(
        state.snakes.find((s) => s.id !== localPlayerId)?.body.length
      );
      nonLocalSnakeStrokes.forEach((c) => expect(c.lineWidth).toBe(1 * defaultScaleFactors.scale));
    });
  });
});

// --- Scaling Tests --- (New describe block)
describe('Game Renderer Scaling', () => {
  it('should scale drawing coordinates correctly when canvas size differs from grid size', () => {
    const baseWidth = GRID_SIZE.width * CELL_SIZE; // e.g., 600
    const baseHeight = GRID_SIZE.height * CELL_SIZE; // e.g., 360
    const scaledWidth = baseWidth * 2; // 1200
    const scaledHeight = baseHeight * 2; // 720

    // Create a mock context with scaled dimensions
    const mockCtx = createMockContext(GRID_SIZE, scaledWidth, scaledHeight);

    // Define a simple game state to draw
    const snakeHead: Point = { x: 10, y: 5 };
    const foodItem: Food = { position: { x: 20, y: 15 }, value: 1 };
    const gameState: Partial<GameState> = {
      snakes: [
        {
          id: 'player1',
          color: '#00ff00',
          body: [snakeHead],
          direction: Direction.RIGHT,
          score: 0,
          activePowerUps: []
        } as Snake // Type assertion for partial mock
      ],
      food: [foodItem],
      powerUps: [],
      activePowerUps: [], // Add missing required property
      gridSize: GRID_SIZE, // Add missing required property
      timestamp: Date.now(), // Add missing required property
      sequence: 0, // Add missing required property
      rngSeed: 123, // Add missing required property
      playerCount: 1, // Add missing required property
      powerUpCounter: 0, // Add missing required property
      playerStats: {
        // Add missing required property
        player1: { id: 'player1', color: '#00ff00', score: 0, deaths: 0, isConnected: true }
      }
    };

    // Render the game on the scaled context
    drawGame(mockCtx, gameState as GameState, 'player1');

    // --- Assertions ---
    const scaleX = scaledWidth / baseWidth; // Should be 2
    const scaleY = scaledHeight / baseHeight; // Should be 2
    const scaledCellSizeX = CELL_SIZE * scaleX; // e.g., 12 * 2 = 24
    const scaledCellSizeY = CELL_SIZE * scaleY; // e.g., 12 * 2 = 24

    // Check clearRect call (should use scaled canvas dimensions)
    const clearRectCalls = mockCtx._getClearRectCalls();
    expect(clearRectCalls.length).toBeGreaterThan(0);
    expect(clearRectCalls[0].args).toEqual([0, 0, scaledWidth, scaledHeight]);

    // Check snake head fillRect call
    const snakeRectCalls = mockCtx
      ._getFillRectCalls()
      .filter((call) => call.fillStyle === '#00ff00');
    expect(snakeRectCalls.length).toBeGreaterThan(0);
    const headCall = snakeRectCalls[0]; // Assuming first green rect is the head
    const expectedHeadX = snakeHead.x * scaledCellSizeX;
    const expectedHeadY = snakeHead.y * scaledCellSizeY;
    expect(headCall.args[0]).toBeCloseTo(expectedHeadX);
    expect(headCall.args[1]).toBeCloseTo(expectedHeadY);
    expect(headCall.args[2]).toBeCloseTo(scaledCellSizeX);
    expect(headCall.args[3]).toBeCloseTo(scaledCellSizeY);

    // Check food arc call (center position and radius should be scaled)
    const foodArcCalls = mockCtx._getArcCalls();
    // Find the arc call related to food (assuming it's the only red fill)
    const foodFillCallIndex = mockCtx._getFillCalls().findIndex((call) => call.fillStyle === 'red');
    expect(foodFillCallIndex).toBeGreaterThan(-1);
    // Find the arc call preceding the red fill
    const relevantArcCall = foodArcCalls[foodFillCallIndex]; // Assumes arc call immediately precedes fill
    expect(relevantArcCall).toBeDefined();

    const expectedFoodCenterX = foodItem.position.x * scaledCellSizeX + scaledCellSizeX / 2;
    const expectedFoodCenterY = foodItem.position.y * scaledCellSizeY + scaledCellSizeY / 2;
    const expectedFoodRadius = (CELL_SIZE / 2.8) * Math.min(scaleX, scaleY); // Scale radius too

    expect(relevantArcCall.args[0]).toBeCloseTo(expectedFoodCenterX);
    expect(relevantArcCall.args[1]).toBeCloseTo(expectedFoodCenterY);
    expect(relevantArcCall.args[2]).toBeCloseTo(expectedFoodRadius);
  });
});
