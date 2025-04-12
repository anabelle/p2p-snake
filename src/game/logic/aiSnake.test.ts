// @ts-nocheck
import { Direction, GameState, Snake } from '../state/types';
import { AI_SNAKE_ID, getAIDirection } from './aiSnake';
import * as collision from './collision';

describe('AI Snake Logic', () => {
  const createTestGameState = (
    aiSnakeBody = [{ x: 5, y: 5 }],
    aiDirection = Direction.RIGHT,
    food = [{ position: { x: 10, y: 5 }, value: 1 }],
    seed = 12345,
    sequence = 0
  ): GameState => {
    const aiSnake: Snake = {
      id: AI_SNAKE_ID,
      color: '#FF5500',
      body: aiSnakeBody,
      direction: aiDirection,
      score: 0,
      activePowerUps: []
    };

    return {
      snakes: [aiSnake],
      food: food,
      powerUps: [],
      activePowerUps: [],
      gridSize: { width: 30, height: 30 },
      timestamp: Date.now(),
      sequence: sequence,
      rngSeed: seed,
      playerCount: 1,
      powerUpCounter: 0,
      playerStats: {
        [AI_SNAKE_ID]: {
          id: AI_SNAKE_ID,
          name: 'AI Snake',
          color: '#FF5500',
          score: 0,
          deaths: 0,
          isConnected: true
        }
      }
    };
  };

  test('AI snake exists in game state', () => {
    const gameState = createTestGameState();
    expect(gameState.snakes.length).toBe(1);
    expect(gameState.snakes[0].id).toBe(AI_SNAKE_ID);
  });

  test('AI snake moves toward food', () => {
    const gameState = createTestGameState([{ x: 5, y: 5 }], Direction.RIGHT, [
      { position: { x: 10, y: 5 }, value: 1 }
    ]);

    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.RIGHT);
  });

  test('AI snake avoids walls', () => {
    const gameState = createTestGameState([{ x: 0, y: 5 }], Direction.LEFT, [
      { position: { x: 10, y: 5 }, value: 1 }
    ]);

    const aiDirection = getAIDirection(gameState);

    expect(aiDirection).not.toBe(Direction.LEFT);
  });

  test('AI snake avoids other snakes', () => {
    const gameState = createTestGameState();

    gameState.snakes.push({
      id: 'other-snake',
      color: '#00FF00',
      body: [
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ],
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: []
    });

    const aiDirection = getAIDirection(gameState);

    expect(aiDirection).not.toBe(Direction.RIGHT);
  });

  test('AI snake chooses valid direction when blocked', () => {
    const gameState = createTestGameState([{ x: 1, y: 1 }], Direction.RIGHT);

    gameState.snakes.push({
      id: 'blocker-1',
      color: '#00FF00',
      body: [{ x: 2, y: 1 }],
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: []
    });

    gameState.snakes.push({
      id: 'blocker-2',
      color: '#0000FF',
      body: [{ x: 1, y: 2 }],
      direction: Direction.UP,
      score: 0,
      activePowerUps: []
    });

    gameState.snakes.push({
      id: 'blocker-3',
      color: '#FFFF00',
      body: [{ x: 0, y: 1 }],
      direction: Direction.RIGHT,
      score: 0,
      activePowerUps: []
    });

    const aiDirection = getAIDirection(gameState);

    expect(aiDirection).toBe(Direction.UP);
  });

  test('AI snake behavior is deterministic', () => {
    const gameState1 = createTestGameState(
      [{ x: 2, y: 2 }],
      Direction.RIGHT,
      [
        { position: { x: 10, y: 5 }, value: 1 },
        { position: { x: 8, y: 7 }, value: 1 }
      ],
      54321,
      5
    );

    const gameState2 = createTestGameState(
      [{ x: 2, y: 2 }],
      Direction.RIGHT,
      [
        { position: { x: 10, y: 5 }, value: 1 },
        { position: { x: 8, y: 7 }, value: 1 }
      ],
      54321,
      5
    );

    const direction1 = getAIDirection(gameState1);
    const direction2 = getAIDirection(gameState2);

    expect(direction1).toBe(direction2);

    const gameState3 = createTestGameState(
      [{ x: 2, y: 2 }],
      Direction.RIGHT,
      [
        { position: { x: 10, y: 5 }, value: 1 },
        { position: { x: 8, y: 7 }, value: 1 }
      ],
      54321,
      6
    );

    const direction3 = getAIDirection(gameState3);

    expect(Object.values(Direction)).toContain(direction3);
  });

  test('AI prefers horizontal movement when xDiff > yDiff', () => {
    const gameState = createTestGameState([{ x: 5, y: 5 }], Direction.UP, [
      { position: { x: 10, y: 6 }, value: 1 }
    ]);
    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.RIGHT);
  });

  test('AI moves vertically (DOWN) as secondary when horizontal (RIGHT) is blocked', () => {
    const gameState = createTestGameState([{ x: 5, y: 5 }], Direction.UP, [
      { position: { x: 10, y: 6 }, value: 1 }
    ]);

    gameState.snakes.push({
      id: 'blocker',
      color: 'blue',
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: [],
      body: [{ x: 6, y: 5 }]
    });
    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.DOWN);
  });

  test('AI prefers vertical movement UP when yDiff > xDiff and UP is valid', () => {
    const gameState = createTestGameState([{ x: 5, y: 10 }], Direction.LEFT, [
      { position: { x: 6, y: 5 }, value: 1 }
    ]);
    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.UP);
  });

  test('AI prefers vertical movement DOWN when yDiff > xDiff and DOWN is valid', () => {
    const gameState = createTestGameState([{ x: 5, y: 5 }], Direction.RIGHT, [
      { position: { x: 6, y: 10 }, value: 1 }
    ]);
    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.DOWN);
  });

  test('AI moves horizontally (LEFT) as secondary when vertical (UP) is blocked', () => {
    const gameState = createTestGameState([{ x: 6, y: 10 }], Direction.DOWN, [
      { position: { x: 5, y: 5 }, value: 1 }
    ]);

    gameState.snakes.push({
      id: 'blocker',
      color: 'blue',
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: [],
      body: [{ x: 6, y: 9 }]
    });
    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.LEFT);
  });

  test('AI moves horizontally (RIGHT) as secondary when vertical (UP) is blocked', () => {
    const gameState = createTestGameState([{ x: 5, y: 10 }], Direction.DOWN, [
      { position: { x: 6, y: 5 }, value: 1 }
    ]);

    gameState.snakes.push({
      id: 'blocker',
      color: 'blue',
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: [],
      body: [{ x: 5, y: 9 }]
    });
    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.RIGHT);
  });

  test('AI snake occasionally makes mistakes that could lead to collisions', () => {
    const aiSnake: Snake = {
      id: AI_SNAKE_ID,
      color: '#FF5500',
      body: [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 5, y: 7 },
        { x: 5, y: 8 },
        { x: 5, y: 9 },
        { x: 5, y: 10 },
        { x: 5, y: 11 },
        { x: 5, y: 12 },
        { x: 5, y: 13 },
        { x: 5, y: 14 },
        { x: 5, y: 15 },
        { x: 5, y: 16 },
        { x: 5, y: 17 },
        { x: 5, y: 18 },
        { x: 5, y: 19 },
        { x: 5, y: 20 },
        { x: 5, y: 21 },
        { x: 5, y: 22 },
        { x: 5, y: 23 },
        { x: 5, y: 24 },
        { x: 5, y: 25 },
        { x: 5, y: 26 },
        { x: 5, y: 27 },
        { x: 5, y: 28 },
        { x: 5, y: 29 },
        { x: 5, y: 30 }
      ],
      direction: Direction.UP,
      score: 0,
      activePowerUps: []
    };

    const otherSnake: Snake = {
      id: 'other-snake',
      color: '#00FF00',
      body: [
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ],
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: []
    };

    const gameState: GameState = {
      snakes: [aiSnake, otherSnake],
      food: [{ position: { x: 10, y: 5 }, value: 1 }],
      powerUps: [],
      activePowerUps: [],
      gridSize: { width: 40, height: 40 },
      timestamp: Date.now(),
      sequence: 0,
      rngSeed: 123456,
      playerCount: 1,
      powerUpCounter: 0,
      playerStats: {
        [AI_SNAKE_ID]: {
          id: AI_SNAKE_ID,
          name: 'AI Snake',
          color: '#FF5500',
          score: 0,
          deaths: 0,
          isConnected: true
        },
        'other-snake': {
          id: 'other-snake',
          name: 'Other Snake',
          color: '#00FF00',
          score: 0,
          deaths: 0,
          isConnected: true
        }
      }
    };

    const hasCollidedWithSnakeSpy = jest.spyOn(collision, 'hasCollidedWithSnake');

    let madeRiskyChoice = false;

    for (let i = 0; i < 100; i++) {
      gameState.sequence = i;

      hasCollidedWithSnakeSpy.mockClear();

      const direction = getAIDirection(gameState);

      if (direction === Direction.RIGHT) {
        madeRiskyChoice = true;
        break;
      }
    }

    expect(madeRiskyChoice).toBe(true);

    hasCollidedWithSnakeSpy.mockRestore();
  });
});
