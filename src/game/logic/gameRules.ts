import { GameState, Direction, Food, PowerUp, ActivePowerUp, Snake } from '../state/types';
import { mulberry32, getOccupiedPositions } from './prng';
import { checkFoodCollision, checkPowerUpCollision, hasCollidedWithSnake } from './collision';
import { moveSnakeBody, growSnake, generateNewSnake, getNextHeadPosition } from './snakeLogic';
import { generateFood } from './foodLogic';
import {
  generatePowerUp,
  activatePowerUp,
  cleanupExpiredActivePowerUps,
  cleanupExpiredGridPowerUps,
  getScoreMultiplier,
  isInvincible,
  getSpeedFactor
} from './powerUpLogic';
import { POWERUP_SPAWN_CHANCE } from '../constants';
import { AI_SNAKE_ID, getAIDirection } from './aiSnake';
import logger from '../../utils/logger';

export type PlayerInputs = Map<string, Direction>;

export const updateGame = (
  currentState: GameState,
  inputs: PlayerInputs,
  currentTime: number,
  currentPlayerIDs: Set<string>
): GameState => {
  const randomFunc = mulberry32(currentState.rngSeed);

  let nextRngSeed = randomFunc() * 4294967296;

  let nextPowerUpCounter = currentState.powerUpCounter;

  let nextPowerUps = currentState.powerUps;
  let nextActivePowerUps = currentState.activePowerUps;
  let nextFood = currentState.food;
  let nextSnakes = currentState.snakes;
  let nextPlayerStats = { ...currentState.playerStats };

  const existingSnakeIDs = new Set(currentState.snakes.map((s) => s.id));

  if (!existingSnakeIDs.has(AI_SNAKE_ID) && currentPlayerIDs.size > 0) {
    const occupied = getOccupiedPositions({
      snakes: nextSnakes,
      food: nextFood,
      powerUps: nextPowerUps
    });

    const aiSnake = generateNewSnake(
      AI_SNAKE_ID,
      currentState.gridSize,
      occupied,
      randomFunc,
      '#FF5500'
    );

    nextSnakes = [...nextSnakes, aiSnake];

    const existingAIStats = nextPlayerStats[AI_SNAKE_ID];
    nextPlayerStats[AI_SNAKE_ID] = {
      id: AI_SNAKE_ID,
      name: 'AI Snake',
      color: aiSnake.color,
      score: existingAIStats ? existingAIStats.score : 0,

      deaths: existingAIStats ? existingAIStats.deaths : 0,
      isConnected: true
    };

    if (existingAIStats && existingAIStats.score > 0) {
      aiSnake.score = existingAIStats.score;
    }

    nextRngSeed = randomFunc() * 4294967296;
  }

  if (existingSnakeIDs.has(AI_SNAKE_ID) && currentPlayerIDs.size === 0) {
    nextSnakes = nextSnakes.filter((snake) => snake.id !== AI_SNAKE_ID);
  }

  const snakesToAdd: Snake[] = [];

  for (const playerId of Array.from(currentPlayerIDs)) {
    if (!existingSnakeIDs.has(playerId)) {
      const occupied = getOccupiedPositions({
        snakes: nextSnakes,
        food: nextFood,
        powerUps: nextPowerUps
      });

      const preferredColor = nextPlayerStats[playerId]?.color;

      const newSnake = generateNewSnake(
        playerId,
        currentState.gridSize,
        occupied,
        randomFunc,
        preferredColor
      );

      if (nextPlayerStats[playerId] && nextPlayerStats[playerId].score > 0) {
        newSnake.score = nextPlayerStats[playerId].score;
      }

      snakesToAdd.push(newSnake);

      if (!nextPlayerStats[playerId]) {
        nextPlayerStats[playerId] = {
          id: playerId,
          name: `Player_${playerId.substring(0, 4)}`,
          color: newSnake.color,
          score: newSnake.score,
          deaths: 0,
          isConnected: true
        };
      } else {
        nextPlayerStats[playerId] = {
          ...nextPlayerStats[playerId],
          isConnected: true,
          color: newSnake.color
        };
      }

      occupied.push(...newSnake.body);

      nextRngSeed = randomFunc() * 4294967296;
    } else {
      const existingSnake = nextSnakes.find((snake) => snake.id === playerId);
      if (existingSnake && !nextPlayerStats[playerId]) {
        nextPlayerStats[playerId] = {
          id: playerId,
          name: `Player_${playerId.substring(0, 4)}`,
          color: existingSnake.color,
          score: existingSnake.score,
          deaths: 0,
          isConnected: true
        };
      } else if (existingSnake && nextPlayerStats[playerId]) {
        if (existingSnake.score !== nextPlayerStats[playerId].score) {
          logger.debug(
            `Syncing score for ${playerId}: Snake=${existingSnake.score}, Stats=${nextPlayerStats[playerId].score}`
          );

          const highestScore = Math.max(existingSnake.score, nextPlayerStats[playerId].score);
          existingSnake.score = highestScore;
          nextPlayerStats[playerId].score = highestScore;
        }

        nextPlayerStats[playerId].isConnected = true;
      }
    }
  }
  if (snakesToAdd.length > 0) {
    nextSnakes = [...nextSnakes, ...snakesToAdd];
  }

  const originalSnakeCount = nextSnakes.length;

  const disconnectedSnakes = nextSnakes.filter(
    (snake) =>
      (!currentPlayerIDs.has(snake.id) && snake.id !== AI_SNAKE_ID) ||
      (snake.id === AI_SNAKE_ID && currentPlayerIDs.size === 0)
  );

  for (const snake of disconnectedSnakes) {
    if (nextPlayerStats[snake.id]) {
      nextPlayerStats[snake.id] = {
        ...nextPlayerStats[snake.id],
        score: snake.score,
        isConnected: false
      };
    }
  }

  nextSnakes = nextSnakes.filter(
    (snake) =>
      currentPlayerIDs.has(snake.id) || (snake.id === AI_SNAKE_ID && currentPlayerIDs.size > 0)
  );

  if (nextSnakes.length !== originalSnakeCount) {
  }

  for (const playerId of Object.keys(nextPlayerStats)) {
    if (playerId === AI_SNAKE_ID) {
      const aiConnected = currentPlayerIDs.size > 0;
      if (nextPlayerStats[playerId].isConnected !== aiConnected) {
        nextPlayerStats[playerId] = {
          ...nextPlayerStats[playerId],
          isConnected: aiConnected
        };
      }
      continue;
    }

    const isConnected = currentPlayerIDs.has(playerId);
    if (nextPlayerStats[playerId].isConnected !== isConnected) {
      nextPlayerStats[playerId] = {
        ...nextPlayerStats[playerId],
        isConnected
      };
    }
  }

  const nextPlayerCount = currentPlayerIDs.size;

  const cleanedGridPowerUps = cleanupExpiredGridPowerUps(nextPowerUps, currentTime);
  if (cleanedGridPowerUps !== nextPowerUps) {
    nextPowerUps = cleanedGridPowerUps;
  }
  const cleanedActivePowerUps = cleanupExpiredActivePowerUps(nextActivePowerUps, currentTime);
  if (cleanedActivePowerUps !== nextActivePowerUps) {
    nextActivePowerUps = cleanedActivePowerUps;
  }

  const snakesToRemove: string[] = [];
  const newActivePowerUps: ActivePowerUp[] = [];
  const foodToRemove: Food[] = [];
  const powerUpsToRemove: PowerUp[] = [];

  const aiDirection = getAIDirection(currentState);
  if (aiDirection) {
    inputs.set(AI_SNAKE_ID, aiDirection);
  }

  const updatedSnakes = nextSnakes.map((snake) => {
    let currentSnake = { ...snake };
    // Define a type for the intermediate snake state with the temporary flag
    type SnakeWithCollisionFlag = Snake & { collided?: boolean };
    let snakeState: SnakeWithCollisionFlag = { ...snake };

    const intendedDirection = inputs.get(snake.id);
    if (intendedDirection) {
      const isOpposite =
        (intendedDirection === Direction.UP && snake.direction === Direction.DOWN) ||
        (intendedDirection === Direction.DOWN && snake.direction === Direction.UP) ||
        (intendedDirection === Direction.LEFT && snake.direction === Direction.RIGHT) ||
        (intendedDirection === Direction.RIGHT && snake.direction === Direction.LEFT);
      if (!isOpposite || snakeState.body.length === 1) {
        snakeState.direction = intendedDirection;
      }
    }

    const speedFactor = getSpeedFactor(snakeState.id, nextActivePowerUps, currentTime);
    let shouldMoveThisTick = true;
    let movesThisTick = 1;

    if (speedFactor < 1) {
      shouldMoveThisTick = currentState.sequence % 2 !== 0;
    } else if (speedFactor > 1) {
      movesThisTick = Math.round(speedFactor);
    }

    const intendedHeadPos = getNextHeadPosition(snakeState, currentState.gridSize);
    const invincible = isInvincible(snakeState.id, nextActivePowerUps, currentTime);
    let fatalCollision = false;

    if (!invincible) {
      if (hasCollidedWithSnake(intendedHeadPos, nextSnakes, snakeState.id)) {
        fatalCollision = true;
      }
    }

    const eatenFood = checkFoodCollision(intendedHeadPos, nextFood);
    const collectedPowerUp = checkPowerUpCollision(intendedHeadPos, nextPowerUps);

    if (fatalCollision) {
      snakesToRemove.push(snakeState.id);
      if (nextPlayerStats[snakeState.id]) {
        nextPlayerStats[snakeState.id] = {
          ...nextPlayerStats[snakeState.id],
          deaths: nextPlayerStats[snakeState.id].deaths + 1
        };
      }

      snakeState = { ...snakeState, collided: true };
    } else if (shouldMoveThisTick) {
      for (let i = 0; i < movesThisTick; i++) {
        if (i === 0) {
          if (eatenFood) {
            foodToRemove.push(eatenFood);
            snakeState = growSnake(snakeState);
            const scoreMultiplier = getScoreMultiplier(
              snakeState.id,
              nextActivePowerUps,
              currentTime
            );
            const points = eatenFood.value * scoreMultiplier;
            snakeState = { ...snakeState, score: snakeState.score + points };
            if (nextPlayerStats[snakeState.id]) {
              nextPlayerStats[snakeState.id] = {
                ...nextPlayerStats[snakeState.id],
                score: nextPlayerStats[snakeState.id].score + points
              };
            }
          }

          if (collectedPowerUp) {
            powerUpsToRemove.push(collectedPowerUp);
            const newActive = activatePowerUp(snakeState, collectedPowerUp, currentTime);
            newActivePowerUps.push(newActive);
          }
        }

        snakeState = moveSnakeBody(snakeState, currentState.gridSize);
      }
    } else {
      if (eatenFood) {
        foodToRemove.push(eatenFood);
        snakeState = growSnake(snakeState);
        const scoreMultiplier = getScoreMultiplier(snakeState.id, nextActivePowerUps, currentTime);
        const points = eatenFood.value * scoreMultiplier;
        snakeState = { ...snakeState, score: snakeState.score + points };
        if (nextPlayerStats[snakeState.id]) {
          nextPlayerStats[snakeState.id] = {
            ...nextPlayerStats[snakeState.id],
            score: nextPlayerStats[snakeState.id].score + points
          };
        }
      }

      if (collectedPowerUp) {
        powerUpsToRemove.push(collectedPowerUp);
        const newActive = activatePowerUp(snakeState, collectedPowerUp, currentTime);
        newActivePowerUps.push(newActive);
      }
    }

    const { collided, ...finalSnakeState } = snakeState;
    currentSnake = finalSnakeState as Snake;

    if (nextPlayerStats[currentSnake.id]) {
      nextPlayerStats[currentSnake.id].score = currentSnake.score;
    }

    return currentSnake;
  });

  nextSnakes = updatedSnakes;

  nextSnakes.forEach((snake) => {
    if (!nextPlayerStats[snake.id]) {
      nextPlayerStats[snake.id] = {
        id: snake.id,
        color: snake.color,
        score: snake.score,
        deaths: 0,
        isConnected: true
      };
    }
  });

  if (snakesToRemove.length > 0) {
    nextSnakes = nextSnakes.filter((snake) => !snakesToRemove.includes(snake.id));
  }

  if (foodToRemove.length > 0) {
    const eatenFoodPositions = new Set(foodToRemove.map((f) => `${f.position.x},${f.position.y}`));

    nextFood = nextFood.filter((f) => !eatenFoodPositions.has(`${f.position.x},${f.position.y}`));
  }
  if (powerUpsToRemove.length > 0) {
    const collectedPowerUpIds = new Set(powerUpsToRemove.map((p) => p.id));

    nextPowerUps = nextPowerUps.filter((p) => !collectedPowerUpIds.has(p.id));
  }

  if (newActivePowerUps.length > 0) {
    nextActivePowerUps = [...nextActivePowerUps, ...newActivePowerUps];
  }

  const desiredFoodCount = 3;
  const currentFoodCount = nextFood.length;
  const foodToAdd: Food[] = [];
  if (currentFoodCount < desiredFoodCount) {
    const occupied = getOccupiedPositions({
      snakes: nextSnakes,
      food: nextFood,
      powerUps: nextPowerUps
    });
    for (let i = 0; i < desiredFoodCount - currentFoodCount; i++) {
      const newFood = generateFood(currentState.gridSize, occupied, randomFunc);
      if (newFood) {
        foodToAdd.push(newFood);
        occupied.push(newFood.position);
        nextRngSeed = randomFunc() * 4294967296;
      }
    }
  }

  if (foodToAdd.length > 0) {
    nextFood = [...nextFood, ...foodToAdd];
  }

  const powerUpsToAdd: PowerUp[] = [];
  if (randomFunc() < POWERUP_SPAWN_CHANCE && nextPowerUps.length < 2) {
    const occupied = getOccupiedPositions({
      snakes: nextSnakes,
      food: nextFood,
      powerUps: nextPowerUps
    });

    const newPowerUp = generatePowerUp(
      currentState.gridSize,
      occupied,
      randomFunc,
      currentTime,
      nextPowerUpCounter
    );
    if (newPowerUp) {
      powerUpsToAdd.push(newPowerUp);
      nextPowerUpCounter++;

      nextRngSeed = randomFunc() * 4294967296;
    }
  }
  if (powerUpsToAdd.length > 0) {
    nextPowerUps = [...nextPowerUps, ...powerUpsToAdd];
  }

  const finalNextState: GameState = {
    ...currentState,

    rngSeed: nextRngSeed,
    powerUps: nextPowerUps,
    activePowerUps: nextActivePowerUps,
    snakes: nextSnakes,
    food: nextFood,
    timestamp: currentTime,
    sequence: currentState.sequence + 1,
    powerUpCounter: nextPowerUpCounter,
    playerCount: nextPlayerCount,
    playerStats: nextPlayerStats
  };

  return finalNextState;
};
