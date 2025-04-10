import { Direction, GameState, Snake } from "../state/types";
import { AI_SNAKE_ID, getAIDirection } from "./aiSnake";

describe("AI Snake Logic", () => {
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
      color: "#FF5500",
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
          name: "AI Snake",
          color: "#FF5500",
          score: 0,
          deaths: 0,
          isConnected: true
        }
      }
    };
  };

  test("AI snake exists in game state", () => {
    const gameState = createTestGameState();
    expect(gameState.snakes.length).toBe(1);
    expect(gameState.snakes[0].id).toBe(AI_SNAKE_ID);
  });

  test("AI snake moves toward food", () => {
    // Snake at (5,5) with food at (10,5) should move right
    const gameState = createTestGameState(
      [{ x: 5, y: 5 }],
      Direction.RIGHT,
      [{ position: { x: 10, y: 5 }, value: 1 }]
    );

    const aiDirection = getAIDirection(gameState);
    expect(aiDirection).toBe(Direction.RIGHT);
  });

  test("AI snake avoids walls", () => {
    // Snake at the edge of the grid should not move into the wall
    const gameState = createTestGameState(
      [{ x: 0, y: 5 }],
      Direction.LEFT,
      [{ position: { x: 10, y: 5 }, value: 1 }]
    );

    const aiDirection = getAIDirection(gameState);
    // Should not go left (into the wall)
    expect(aiDirection).not.toBe(Direction.LEFT);
  });

  test("AI snake avoids other snakes", () => {
    const gameState = createTestGameState();
    
    // Add another snake in the path
    gameState.snakes.push({
      id: "other-snake",
      color: "#00FF00",
      body: [{ x: 6, y: 5 }, { x: 7, y: 5 }], // Right in front of AI snake
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: []
    });

    const aiDirection = getAIDirection(gameState);
    // Should not go right (into the other snake)
    expect(aiDirection).not.toBe(Direction.RIGHT);
  });

  test("AI snake chooses valid direction when blocked", () => {
    const gameState = createTestGameState([{ x: 1, y: 1 }], Direction.RIGHT);
    
    // Block all directions except up
    gameState.snakes.push({
      id: "blocker-1",
      color: "#00FF00",
      body: [{ x: 2, y: 1 }], // Block right
      direction: Direction.LEFT,
      score: 0,
      activePowerUps: []
    });
    
    gameState.snakes.push({
      id: "blocker-2",
      color: "#0000FF",
      body: [{ x: 1, y: 2 }], // Block down
      direction: Direction.UP,
      score: 0,
      activePowerUps: []
    });
    
    gameState.snakes.push({
      id: "blocker-3",
      color: "#FFFF00",
      body: [{ x: 0, y: 1 }], // Block left
      direction: Direction.RIGHT,
      score: 0,
      activePowerUps: []
    });

    const aiDirection = getAIDirection(gameState);
    // Should go up (the only available direction)
    expect(aiDirection).toBe(Direction.UP);
  });
  
  test("AI snake behavior is deterministic", () => {
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
}); 