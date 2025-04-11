import { Direction, GameState, Snake } from '../state/types';
import { AI_SNAKE_ID, getAIDirection } from './aiSnake';
import * as collision from './collision';

describe('AI Snake Logic', () => {
  // Create a basic game state for testing
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
    // Snake at (5,5) with food at (10,5) should move right
    const gameState = createTestGameState([{ x: 5, y: 5 }], Direction.RIGHT, [
      { position: { x: 10, y: 5 }, value: 1 }
    ]);

    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.RIGHT);
  });

  test('AI snake avoids walls', () => {
    // Snake at the edge of the grid should not move into the wall
    const gameState = createTestGameState([{ x: 0, y: 5 }], Direction.LEFT, [
      { position: { x: 10, y: 5 }, value: 1 }
    ]);

    const aiDirection = getAIDirection(gameState);
    // Should not go left (into the wall)
    expect(aiDirection).not.toBe(Direction.LEFT);
  });

  test('AI snake avoids other snakes', () => {
    const gameState = createTestGameState();

    // Add another snake in the path
    gameState.snakes.push({
      id: 'other-snake',
      color: '#00FF00',
      body: [
        { x: 6, y: 5 },
        { x: 7, y: 5 }
      ], // Right in front of AI snake
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: []
    });

    const aiDirection = getAIDirection(gameState);
    // Should not go right (into the other snake)
    expect(aiDirection).not.toBe(Direction.RIGHT);
  });

  test('AI snake chooses valid direction when blocked', () => {
    const gameState = createTestGameState([{ x: 1, y: 1 }], Direction.RIGHT);

    // Block all directions except up
    gameState.snakes.push({
      id: 'blocker-1',
      color: '#00FF00',
      body: [{ x: 2, y: 1 }], // Block right
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: []
    });

    gameState.snakes.push({
      id: 'blocker-2',
      color: '#0000FF',
      body: [{ x: 1, y: 2 }], // Block down
      direction: Direction.UP,
      score: 0,
      activePowerUps: []
    });

    gameState.snakes.push({
      id: 'blocker-3',
      color: '#FFFF00',
      body: [{ x: 0, y: 1 }], // Block left
      direction: Direction.RIGHT,
      score: 0,
      activePowerUps: []
    });

    const aiDirection = getAIDirection(gameState);
    // Should go up (the only available direction)
    expect(aiDirection).toBe(Direction.UP);
  });

  test('AI snake behavior is deterministic', () => {
    // Create two identical game states
    const gameState1 = createTestGameState(
      [{ x: 2, y: 2 }],
      Direction.RIGHT,
      [
        { position: { x: 10, y: 5 }, value: 1 },
        { position: { x: 8, y: 7 }, value: 1 }
      ],
      54321, // Specific seed
      5 // Specific sequence number
    );

    const gameState2 = createTestGameState(
      [{ x: 2, y: 2 }],
      Direction.RIGHT,
      [
        { position: { x: 10, y: 5 }, value: 1 },
        { position: { x: 8, y: 7 }, value: 1 }
      ],
      54321, // Same seed
      5 // Same sequence
    );

    // Direction should be the same for identical game states
    const direction1 = getAIDirection(gameState1);
    const direction2 = getAIDirection(gameState2);

    expect(direction1).toBe(direction2);

    // Changing sequence should change the direction when random choice is involved
    const gameState3 = createTestGameState(
      [{ x: 2, y: 2 }],
      Direction.RIGHT,
      [
        { position: { x: 10, y: 5 }, value: 1 },
        { position: { x: 8, y: 7 }, value: 1 }
      ],
      54321,
      6 // Different sequence
    );

    // With valid paths to both foods, when there's a random component,
    // different sequences might lead to different decisions
    const direction3 = getAIDirection(gameState3);
    // We don't test direction3 !== direction1 as it might randomly be the same
    // but we ensure the function returns a valid direction
    expect(Object.values(Direction)).toContain(direction3);
  });

  test('AI prefers horizontal movement when xDiff > yDiff', () => {
    // AI at (5,5), Food at (10, 6) -> xDiff=5, yDiff=1. Should prefer RIGHT.
    const gameState = createTestGameState([{ x: 5, y: 5 }], Direction.UP, [
      { position: { x: 10, y: 6 }, value: 1 }
    ]);
    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.RIGHT); // Covers line 165
  });

  test('AI moves vertically (DOWN) as secondary when horizontal (RIGHT) is blocked', () => {
    // AI at (5,5), Food at (10, 6) -> Prefers RIGHT, then DOWN.
    // Block RIGHT with another snake body part.
    const gameState = createTestGameState([{ x: 5, y: 5 }], Direction.UP, [
      { position: { x: 10, y: 6 }, value: 1 }
    ]);
    // Add blocker snake
    gameState.snakes.push({
      id: 'blocker',
      color: 'blue',
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: [],
      body: [{ x: 6, y: 5 }] // Block cell to the right
    });
    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.DOWN); // Covers line 171
  });

  test('AI prefers vertical movement UP when yDiff > xDiff and UP is valid', () => {
    // AI at (5, 10), Food at (6, 5) -> xDiff=1, yDiff=-5. Prefers UP.
    const gameState = createTestGameState([{ x: 5, y: 10 }], Direction.LEFT, [
      { position: { x: 6, y: 5 }, value: 1 }
    ]);
    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.UP); // Covers line 178
  });

  test('AI prefers vertical movement DOWN when yDiff > xDiff and DOWN is valid', () => {
    // AI at (5, 5), Food at (6, 10) -> xDiff=1, yDiff=5. Prefers DOWN.
    const gameState = createTestGameState([{ x: 5, y: 5 }], Direction.RIGHT, [
      { position: { x: 6, y: 10 }, value: 1 }
    ]);
    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.DOWN); // Covers line 180
  });

  test('AI moves horizontally (LEFT) as secondary when vertical (UP) is blocked', () => {
    // AI at (6, 10), Food at (5, 5) -> Prefers UP, then LEFT.
    // Block UP.
    const gameState = createTestGameState([{ x: 6, y: 10 }], Direction.DOWN, [
      { position: { x: 5, y: 5 }, value: 1 }
    ]);
    // Add blocker
    gameState.snakes.push({
      id: 'blocker',
      color: 'blue',
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: [],
      body: [{ x: 6, y: 9 }] // Block cell UP
    });
    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.LEFT); // Covers line 183
  });

  test('AI moves horizontally (RIGHT) as secondary when vertical (UP) is blocked', () => {
    // AI at (5, 10), Food at (6, 5) -> Prefers UP, then RIGHT.
    // Block UP.
    const gameState = createTestGameState([{ x: 5, y: 10 }], Direction.DOWN, [
      { position: { x: 6, y: 5 }, value: 1 }
    ]);
    // Add blocker
    gameState.snakes.push({
      id: 'blocker',
      color: 'blue',
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: [],
      body: [{ x: 5, y: 9 }] // Block cell UP
    });
    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.RIGHT); // Covers line 185
  });

  test('AI snake occasionally makes mistakes that could lead to collisions', () => {
    // Create a mock snake with a long body to increase mistake probability
    const aiSnake: Snake = {
      id: AI_SNAKE_ID,
      color: '#FF5500',
      body: [
        { x: 5, y: 5 }, // head
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
        { x: 5, y: 30 } // Long body to increase mistake probability
      ],
      direction: Direction.UP,
      score: 0,
      activePowerUps: []
    };

    const otherSnake: Snake = {
      id: 'other-snake',
      color: '#00FF00',
      body: [
        { x: 6, y: 5 }, // Right next to AI snake's head
        { x: 7, y: 5 }
      ],
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: []
    };

    // Create game state
    const gameState: GameState = {
      snakes: [aiSnake, otherSnake],
      food: [{ position: { x: 10, y: 5 }, value: 1 }],
      powerUps: [],
      activePowerUps: [],
      gridSize: { width: 40, height: 40 },
      timestamp: Date.now(),
      sequence: 0,
      rngSeed: 123456, // Fixed seed for deterministic testing
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

    // Spy on collision detection to see if it's called with directions that would cause collision
    const hasCollidedWithSnakeSpy = jest.spyOn(collision, 'hasCollidedWithSnake');

    // Run multiple iterations with different sequences to trigger different random behaviors
    let madeRiskyChoice = false;

    // Try multiple iterations to increase chance of seeing a mistake
    for (let i = 0; i < 100; i++) {
      // Update the sequence to get different random behavior
      gameState.sequence = i;

      // Reset the spy counts
      hasCollidedWithSnakeSpy.mockClear();

      // Get AI direction
      const direction = getAIDirection(gameState);

      // If we chose to move right, that would be a mistake (collision with other snake)
      if (direction === Direction.RIGHT) {
        madeRiskyChoice = true;
        break;
      }
    }

    // Assert that the AI snake made at least one risky choice
    expect(madeRiskyChoice).toBe(true);

    // Clean up
    hasCollidedWithSnakeSpy.mockRestore();
  });
});
