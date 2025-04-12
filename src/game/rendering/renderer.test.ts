import { jest } from '@jest/globals';
import { drawGame, drawSnakeEyes, drawFood, drawPowerUp, drawSnake } from './renderer';
import { GameState, Direction, PowerUpType, Snake, Food, PowerUp, Point } from '../state/types';
import { CELL_SIZE, GRID_SIZE } from '../constants';

const defaultScaleFactors = {
  scaleX: 1,
  scaleY: 1,
  scale: 1,
  cellWidth: CELL_SIZE,
  cellHeight: CELL_SIZE
};

type MockCall = {
  method: string;
  args: any[];

  fillStyle?: string | CanvasGradient | CanvasPattern;
  strokeStyle?: string | CanvasGradient | CanvasPattern;
  lineWidth?: number;
  font?: string;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
};

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
};

function createMockContext(
  gridSize: { width: number; height: number } = GRID_SIZE,

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

describe('Game Renderer', () => {
  let mockCtx: MockContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    jest.clearAllMocks();
  });

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

      expect(fillCalls[0].fillStyle).toBe('red');

      const fillRectCalls = mockCtx._getFillRectCalls();
      expect(fillRectCalls.length).toBe(1);
      expect(fillRectCalls[0].args).toEqual([
        expectedStemX,
        expectedStemY,
        expectedStemWidth,
        expectedStemHeight
      ]);

      expect(fillRectCalls[0].fillStyle).toBe('green');
    });
  });

  describe('drawPowerUp', () => {
    const testPowerUpDrawing = (
      type: PowerUpType,
      expectedSymbol: string,
      expectedBgColor: string,
      expectedTextColor: string = 'white'
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

      const fillRectCalls = mockCtx._getFillRectCalls();
      expect(fillRectCalls.length).toBe(1);
      expect(fillRectCalls[0].args).toEqual([expectedRectX, expectedRectY, CELL_SIZE, CELL_SIZE]);
      expect(fillRectCalls[0].fillStyle).toBe(expectedBgColor);

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
  });

  describe('drawSnakeEyes', () => {
    const headPos = { x: 10, y: 12 };

    const testSnake: Snake = {
      id: 'test',
      color: 'green',
      direction: Direction.UP,
      score: 0,
      activePowerUps: [],
      body: [headPos]
    };

    const testEyeDirection = (
      direction: Direction,
      expectedEye1Center: Point,
      expectedEye2Center: Point
    ) => {
      const currentTestSnake = { ...testSnake, direction: direction };
      drawSnakeEyes(mockCtx, currentTestSnake, defaultScaleFactors);

      const arcCalls = mockCtx._getArcCalls();

      expect(arcCalls.length).toBe(4);

      const whiteEyeCalls = arcCalls.filter((_, i) => i < 2);
      const blackPupilCalls = arcCalls.filter((_, i) => i >= 2);

      expect(whiteEyeCalls.length).toBe(2);
      const whiteRadius = defaultScaleFactors.cellWidth / 4 / 2;
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

      expect(
        (JSON.stringify(call1ArgsWhite) === JSON.stringify(expectedArgs1White) &&
          JSON.stringify(call2ArgsWhite) === JSON.stringify(expectedArgs2White)) ||
          (JSON.stringify(call1ArgsWhite) === JSON.stringify(expectedArgs2White) &&
            JSON.stringify(call2ArgsWhite) === JSON.stringify(expectedArgs1White))
      ).toBe(true);

      expect(blackPupilCalls.length).toBe(2);
      const blackRadius = whiteRadius / 2;
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

      expect(
        (JSON.stringify(call1ArgsBlack) === JSON.stringify(expectedArgs1Black) &&
          JSON.stringify(call2ArgsBlack) === JSON.stringify(expectedArgs2Black)) ||
          (JSON.stringify(call1ArgsBlack) === JSON.stringify(expectedArgs2Black) &&
            JSON.stringify(call2ArgsBlack) === JSON.stringify(expectedArgs1Black))
      ).toBe(true);

      const fillCalls = mockCtx._getFillCalls();
      expect(fillCalls[0].fillStyle).toBe('white');
      expect(fillCalls[1].fillStyle).toBe('black');
    };

    const headCenterX =
      headPos.x * defaultScaleFactors.cellWidth + defaultScaleFactors.cellWidth / 2;
    const headCenterY =
      headPos.y * defaultScaleFactors.cellHeight + defaultScaleFactors.cellHeight / 2;
    const scaledEyeOffset = defaultScaleFactors.cellWidth / 5;

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

      expect(fillRectCalls.length).toBe(3);

      expect(strokeRectCalls.length).toBe(3);

      expect(fillRectCalls[0].fillStyle).toBe(snake.color);

      for (let i = 1; i < fillRectCalls.length; i++) {
        expect(fillRectCalls[i].fillStyle).toMatch(/#[0-9a-fA-F]{6}|cyan/);
      }

      strokeRectCalls.forEach((call) => {
        expect(call.strokeStyle).toBe('#333333');
        expect(call.lineWidth).toBe(1 * defaultScaleFactors.scale);
      });

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

      strokeRectCalls.forEach((call, i) => {
        expect(call.strokeStyle).toBe('#FFFFFF');
        expect(call.lineWidth).toBe(2 * defaultScaleFactors.scale);
      });

      expect(fillRectCalls[0].fillStyle).toBe(snake.color);

      for (let i = 1; i < fillRectCalls.length; i++) {
        expect(fillRectCalls[i].fillStyle).toMatch(/#[0-9a-fA-F]{6}|cyan/);
      }

      expect(fillCalls[0].fillStyle).toBe('white');
      expect(fillCalls[1].fillStyle).toBe('black');
    });

    it('should not draw if snake body is empty', () => {
      const snake: Snake = {
        ...snakeBase,
        body: [],
        direction: Direction.RIGHT
      };

      drawSnake(mockCtx, snake, false, defaultScaleFactors);

      expect(mockCtx._getMockCalls().length).toBe(0);
    });
  });

  describe('drawGame', () => {
    let state: GameState;
    const localPlayerId = 'p1';

    beforeEach(() => {
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

      const clearRectCalls = mockCtx._getClearRectCalls();
      expect(clearRectCalls.length).toBe(1);
      expect(clearRectCalls[0].args).toEqual([0, 0, mockCtx.canvas.width, mockCtx.canvas.height]);
    });

    it('should draw grid lines', () => {
      drawGame(mockCtx, state, localPlayerId);
      const moveToCalls = mockCtx._getMoveToCalls();
      const lineToCalls = mockCtx._getLineToCalls();
      const strokeCalls = mockCtx._getStrokeCalls();
      const beginPathCalls = mockCtx._getBeginPathCalls();

      const expectedVerticalLines = state.gridSize.width + 1;
      const expectedHorizontalLines = state.gridSize.height + 1;
      const expectedTotalLines = expectedVerticalLines + expectedHorizontalLines;

      expect(moveToCalls.length).toBe(expectedTotalLines);
      expect(lineToCalls.length).toBe(expectedTotalLines);
      expect(strokeCalls.length).toBe(1);
      expect(beginPathCalls.length).toBeGreaterThanOrEqual(1);

      expect(strokeCalls[0].strokeStyle).toBe('#333');

      expect(strokeCalls[0].lineWidth).toBe(1 * defaultScaleFactors.scale);
    });

    it('should make canvas calls corresponding to drawing food items', () => {
      drawGame(mockCtx, state, localPlayerId);
      const arcCalls = mockCtx._getArcCalls();
      const foodFillRectCalls = mockCtx._getFillRectCalls().filter((c) => c.fillStyle === 'green');

      expect(arcCalls.length).toBeGreaterThanOrEqual(state.food.length);
      expect(foodFillRectCalls.length).toBe(state.food.length);
    });

    it('should make canvas calls corresponding to drawing power-ups', () => {
      drawGame(mockCtx, state, localPlayerId);

      const powerUpBgColors = ['lightblue', '#FFB74D', '#BA68C8', 'gold'];

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
        .filter((c) => c.fillStyle === 'red' || c.fillStyle === 'blue');
      const snakeStrokeRects = mockCtx
        ._getStrokeRectCalls()
        .filter((c) => c.strokeStyle === '#FFFFFF' || c.strokeStyle === '#333333');

      const arcCalls = mockCtx._getArcCalls();
      const whiteFills = mockCtx._getFillCalls().filter((c) => c.fillStyle === 'white');
      const blackFills = mockCtx._getFillCalls().filter((c) => c.fillStyle === 'black');

      const expectedSegments = state.snakes.reduce((sum, s) => sum + s.body.length, 0);
      const expectedHeads = state.snakes.length;

      expect(snakeFillRects.length).toBe(expectedSegments);
      expect(snakeStrokeRects.length).toBe(expectedSegments);

      expect(arcCalls.length).toBeGreaterThanOrEqual(expectedHeads * 4);
      expect(whiteFills.length).toBeGreaterThanOrEqual(expectedHeads);
      expect(blackFills.length).toBeGreaterThanOrEqual(expectedHeads);

      const localSnakeStrokes = snakeStrokeRects.filter((c) => c.strokeStyle === '#FFFFFF');
      expect(localSnakeStrokes.length).toBe(
        state.snakes.find((s) => s.id === localPlayerId)?.body.length
      );

      localSnakeStrokes.forEach((c) => expect(c.lineWidth).toBe(2 * defaultScaleFactors.scale));

      const nonLocalSnakeStrokes = snakeStrokeRects.filter((c) => c.strokeStyle === '#333333');
      expect(nonLocalSnakeStrokes.length).toBe(
        state.snakes.find((s) => s.id !== localPlayerId)?.body.length
      );
      nonLocalSnakeStrokes.forEach((c) => expect(c.lineWidth).toBe(1 * defaultScaleFactors.scale));
    });
  });
});

describe('Game Renderer Scaling', () => {
  it('should scale drawing coordinates correctly when canvas size differs from grid size', () => {
    const baseWidth = GRID_SIZE.width * CELL_SIZE;
    const baseHeight = GRID_SIZE.height * CELL_SIZE;
    const scaledWidth = baseWidth * 2;
    const scaledHeight = baseHeight * 2;

    const mockCtx = createMockContext(GRID_SIZE, scaledWidth, scaledHeight);

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
        } as Snake
      ],
      food: [foodItem],
      powerUps: [],
      activePowerUps: [],
      gridSize: GRID_SIZE,
      timestamp: Date.now(),
      sequence: 0,
      rngSeed: 123,
      playerCount: 1,
      powerUpCounter: 0,
      playerStats: {
        player1: { id: 'player1', color: '#00ff00', score: 0, deaths: 0, isConnected: true }
      }
    };

    drawGame(mockCtx, gameState as GameState, 'player1');

    const scaleX = scaledWidth / baseWidth;
    const scaleY = scaledHeight / baseHeight;
    const scaledCellSizeX = CELL_SIZE * scaleX;
    const scaledCellSizeY = CELL_SIZE * scaleY;

    const clearRectCalls = mockCtx._getClearRectCalls();
    expect(clearRectCalls.length).toBeGreaterThan(0);
    expect(clearRectCalls[0].args).toEqual([0, 0, scaledWidth, scaledHeight]);

    const snakeRectCalls = mockCtx
      ._getFillRectCalls()
      .filter((call) => call.fillStyle === '#00ff00');
    expect(snakeRectCalls.length).toBeGreaterThan(0);
    const headCall = snakeRectCalls[0];
    const expectedHeadX = snakeHead.x * scaledCellSizeX;
    const expectedHeadY = snakeHead.y * scaledCellSizeY;
    expect(headCall.args[0]).toBeCloseTo(expectedHeadX);
    expect(headCall.args[1]).toBeCloseTo(expectedHeadY);
    expect(headCall.args[2]).toBeCloseTo(scaledCellSizeX);
    expect(headCall.args[3]).toBeCloseTo(scaledCellSizeY);

    const foodArcCalls = mockCtx._getArcCalls();

    const foodFillCallIndex = mockCtx._getFillCalls().findIndex((call) => call.fillStyle === 'red');
    expect(foodFillCallIndex).toBeGreaterThan(-1);

    const relevantArcCall = foodArcCalls[foodFillCallIndex];
    expect(relevantArcCall).toBeDefined();

    const expectedFoodCenterX = foodItem.position.x * scaledCellSizeX + scaledCellSizeX / 2;
    const expectedFoodCenterY = foodItem.position.y * scaledCellSizeY + scaledCellSizeY / 2;
    const expectedFoodRadius = (CELL_SIZE / 2.8) * Math.min(scaleX, scaleY);

    expect(relevantArcCall.args[0]).toBeCloseTo(expectedFoodCenterX);
    expect(relevantArcCall.args[1]).toBeCloseTo(expectedFoodCenterY);
    expect(relevantArcCall.args[2]).toBeCloseTo(expectedFoodRadius);
  });
});
