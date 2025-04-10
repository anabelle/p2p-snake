import { GameState, Direction, Food, PowerUp, ActivePowerUp, Snake } from "../state/types";
import { mulberry32, getOccupiedPositions } from "./prng";
import { checkFoodCollision, checkPowerUpCollision, hasCollidedWithSnake, hasCollidedWithWall } from "./collision";
import { moveSnakeBody, growSnake, generateNewSnake } from "./snakeLogic";
import { generateFood } from "./foodLogic";
import { generatePowerUp, activatePowerUp, cleanupExpiredActivePowerUps, cleanupExpiredGridPowerUps, getScoreMultiplier, isInvincible, getSpeedFactor } from "./powerUpLogic";
import { POWERUP_SPAWN_CHANCE } from "../constants"; // Import the constant
import { AI_SNAKE_ID, getAIDirection } from "./aiSnake"; // Import AI snake functions

// Define the structure for player inputs for a single tick
export type PlayerInputs = Map<string, Direction>; // Map<playerId, intendedDirection>

// The main game logic tick function
// Takes the current state and player inputs, returns the next state
// This function should be PURE and DETERMINISTIC
export const updateGame = (currentState: GameState, inputs: PlayerInputs, currentTime: number, currentPlayerIDs: Set<string>): GameState => {
    // --- Start Optimization ---
    // Use a shallow copy + immutable updates instead of deep copy
    // const nextState: GameState = JSON.parse(JSON.stringify(currentState)); // Deep copy to avoid mutation - REMOVED
    const randomFunc = mulberry32(currentState.rngSeed); // Get PRNG function for this tick

    // 1. Update RNG seed for next tick (do this first)
    let nextRngSeed = randomFunc() * 4294967296; // Calculate new seed FIRST

    // Track the next counter value
    let nextPowerUpCounter = currentState.powerUpCounter;

    // Keep track of changes to arrays to avoid unnecessary copying if nothing changes
    let nextPowerUps = currentState.powerUps;
    let nextActivePowerUps = currentState.activePowerUps;
    let nextFood = currentState.food;
    let nextSnakes = currentState.snakes;
    let nextPlayerStats = { ...currentState.playerStats }; // Add player stats tracking
    // --- End Optimization ---

    // --- Deterministic Player Handling --- 
    const existingSnakeIDs = new Set(currentState.snakes.map(s => s.id));
    let snakesChanged = false;

    // Add AI snake if it doesn't exist AND there are real players connected
    if (!existingSnakeIDs.has(AI_SNAKE_ID) && currentPlayerIDs.size > 0) {
        const occupied = getOccupiedPositions({ snakes: nextSnakes, food: nextFood, powerUps: nextPowerUps });
        
        // Create an AI snake with a distinct color
        const aiSnake = generateNewSnake(
            AI_SNAKE_ID, 
            currentState.gridSize, 
            occupied, 
            randomFunc, 
            "#FF5500" // Distinct orange color for AI
        );
        
        // Add AI snake to the game
        nextSnakes = [...nextSnakes, aiSnake];
        snakesChanged = true;
        
        // Initialize AI player stats - Preserve death count if it exists
        const existingAIStats = nextPlayerStats[AI_SNAKE_ID];
        nextPlayerStats[AI_SNAKE_ID] = {
            id: AI_SNAKE_ID,
            name: "AI Snake",
            color: aiSnake.color,
            score: existingAIStats ? existingAIStats.score : 0, // Keep existing score when respawning
            // Keep existing death count when respawning
            deaths: existingAIStats ? existingAIStats.deaths : 0,
            isConnected: true
        };
        
        // If we have existing stats and score, restore it to the snake
        if (existingAIStats && existingAIStats.score > 0) {
            aiSnake.score = existingAIStats.score;
        }
        
        // Update RNG seed after AI snake generation
        nextRngSeed = randomFunc() * 4294967296;
    }
    
    // Remove AI snake if no actual players are connected
    if (existingSnakeIDs.has(AI_SNAKE_ID) && currentPlayerIDs.size === 0) {
        nextSnakes = nextSnakes.filter(snake => snake.id !== AI_SNAKE_ID);
        snakesChanged = true;
    }

    // Add new players
    const snakesToAdd: Snake[] = [];
    // Convert Set to Array for iteration to support older TS targets
    for (const playerId of Array.from(currentPlayerIDs)) {
        if (!existingSnakeIDs.has(playerId)) {
            const occupied = getOccupiedPositions({ snakes: nextSnakes, food: nextFood, powerUps: nextPowerUps });

            // --- Use preferred color from playerStats if available ---
            const preferredColor = nextPlayerStats[playerId]?.color; // Get color from stats

            // Use the tick's randomFunc and potentially the preferred color
            const newSnake = generateNewSnake(playerId, currentState.gridSize, occupied, randomFunc, preferredColor);

            // Important: Restore score from playerStats if available (for reconnecting players)
            if (nextPlayerStats[playerId] && nextPlayerStats[playerId].score > 0) {
                newSnake.score = nextPlayerStats[playerId].score;
            }

            snakesToAdd.push(newSnake);
            snakesChanged = true;

            // Initialize or update player stats
            if (!nextPlayerStats[playerId]) {
                nextPlayerStats[playerId] = {
                    id: playerId,
                    name: `Player_${playerId.substring(0, 4)}`, // Add default name here too
                    color: newSnake.color, // Use the *actual* color assigned to the snake
                    score: newSnake.score,
                    deaths: 0,
                    isConnected: true
                };
            } else {
                nextPlayerStats[playerId] = {
                    ...nextPlayerStats[playerId],
                    isConnected: true,
                    color: newSnake.color, // Update color in stats to match the snake's actual color
                };
            }

            // Update occupied positions locally for subsequent spawns *within this handler only*
            occupied.push(...newSnake.body);
            // Since RNG was used, update the seed *if* generateNewSnake used it
            // Assuming generateNewSnake uses randomFunc passed to it
            nextRngSeed = randomFunc() * 4294967296;
        } else {
            // Player already exists, ensure they're in playerStats
            const existingSnake = nextSnakes.find(snake => snake.id === playerId);
            if (existingSnake && !nextPlayerStats[playerId]) {
                // Add missing player to playerStats
                nextPlayerStats[playerId] = {
                    id: playerId,
                    name: `Player_${playerId.substring(0, 4)}`, // Default name if stats are missing
                    color: existingSnake.color,
                    score: existingSnake.score,
                    deaths: 0,
                    isConnected: true
                };
            } else if (existingSnake && nextPlayerStats[playerId]) {
                // Sync score between snake and playerStats (in case they got out of sync)
                if (existingSnake.score !== nextPlayerStats[playerId].score) {
                    console.log(`Syncing score for ${playerId}: Snake=${existingSnake.score}, Stats=${nextPlayerStats[playerId].score}`);
                    // Prefer the higher score to avoid losing progress
                    const highestScore = Math.max(existingSnake.score, nextPlayerStats[playerId].score);
                    existingSnake.score = highestScore;
                    nextPlayerStats[playerId].score = highestScore;
                }

                // Ensure connected status is set correctly
                nextPlayerStats[playerId].isConnected = true;
            }
        }
    }
    if (snakesToAdd.length > 0) {
        nextSnakes = [...nextSnakes, ...snakesToAdd];
    }

    // Remove players who left
    const originalSnakeCount = nextSnakes.length;
    
    // Get disconnected snakes - AI snake is disconnected when no players are connected
    const disconnectedSnakes = nextSnakes.filter(snake => 
        (!currentPlayerIDs.has(snake.id) && snake.id !== AI_SNAKE_ID) || 
        (snake.id === AI_SNAKE_ID && currentPlayerIDs.size === 0)
    );

    // Update disconnected snake stats before removing them
    for (const snake of disconnectedSnakes) {
        if (nextPlayerStats[snake.id]) {
            //console.log(`Preserving stats for disconnected player: ${snake.id}, score: ${snake.score}`);
            nextPlayerStats[snake.id] = {
                ...nextPlayerStats[snake.id],
                score: snake.score, // Save the latest score
                isConnected: false
            };
        }
    }

    // Now filter out the disconnected snakes
    nextSnakes = nextSnakes.filter(snake => 
        (currentPlayerIDs.has(snake.id) || (snake.id === AI_SNAKE_ID && currentPlayerIDs.size > 0))
    );
    
    if (nextSnakes.length !== originalSnakeCount) {
        //console.log(`updateGame: Players left. Snake count changed.`);
        snakesChanged = true;
    }

    // Update connected status for players
    for (const playerId of Object.keys(nextPlayerStats)) {
        // AI snake is only connected when real players are present
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

    // Update player count state
    const nextPlayerCount = currentPlayerIDs.size;
    // --- End Deterministic Player Handling ---

    // 2. Cleanup expired power-ups (grid and active)
    // These functions should ideally return the original array if no changes were made
    const cleanedGridPowerUps = cleanupExpiredGridPowerUps(nextPowerUps, currentTime);
    if (cleanedGridPowerUps !== nextPowerUps) {
        nextPowerUps = cleanedGridPowerUps;
    }
    const cleanedActivePowerUps = cleanupExpiredActivePowerUps(nextActivePowerUps, currentTime);
    if (cleanedActivePowerUps !== nextActivePowerUps) {
        nextActivePowerUps = cleanedActivePowerUps;
    }


    // 3. Process snake updates (direction changes, movement, collisions)
    const snakesToRemove: string[] = [];
    const newActivePowerUps: ActivePowerUp[] = [];
    const foodToRemove: Food[] = []; // Store actual food objects to remove
    const powerUpsToRemove: PowerUp[] = []; // Store actual powerup objects to remove

    // Add AI direction to inputs
    const aiDirection = getAIDirection(currentState);
    if (aiDirection) {
        inputs.set(AI_SNAKE_ID, aiDirection);
    }

    // Map returns a new array, update snakes based on current state arrays
    const updatedSnakes = nextSnakes.map(snake => {
        let currentSnake = { ...snake }; // Shallow copy snake for modification

        // Apply intended direction change from input
        const intendedDirection = inputs.get(snake.id);
        if (intendedDirection) {
            const isOpposite =
                (intendedDirection === Direction.UP && snake.direction === Direction.DOWN) ||
                (intendedDirection === Direction.DOWN && snake.direction === Direction.UP) ||
                (intendedDirection === Direction.LEFT && snake.direction === Direction.RIGHT) ||
                (intendedDirection === Direction.RIGHT && snake.direction === Direction.LEFT);
            if (!isOpposite || snake.body.length === 1) {
                currentSnake.direction = intendedDirection; // Modify the copy
            }
        }

        // --- Check Speed Factor and Conditionally Move --- 
        const speedFactor = getSpeedFactor(snake.id, nextActivePowerUps, currentTime);
        let shouldMoveThisTick = true;
        if (speedFactor < 1) { // Currently only handles SLOW (0.5)
            // Move every 1 / speedFactor ticks. For 0.5, move every 2 ticks.
            // Move on odd sequence numbers for simplicity.
            if (currentState.sequence % Math.round(1 / speedFactor) === 0) {
                shouldMoveThisTick = false;
            }
        }
        // Note: SPEED power-up (factor > 1) doesn't require extra moves here,
        // it's just faster relative to slowed snakes.

        if (shouldMoveThisTick) {
            // Calculate next position and move snake
            currentSnake = moveSnakeBody(currentSnake, currentState.gridSize);
        }
        // --- End Conditional Move --- 

        const movedHead = currentSnake.body[0]; // Head position (might be same as last tick if !shouldMoveThisTick)

        // Invincibility check (using potentially updated active powerups)
        const invincible = isInvincible(snake.id, nextActivePowerUps, currentTime);

        // Collision Checks (check against *original* snake list for this tick)
        // REMOVE wall collision check if wrapping is enabled
        if (!invincible) {
            // Pass currentState.snakes here for consistent collision checks within the tick
            if (/*hasCollidedWithWall(movedHead, currentState.gridSize) ||*/
                hasCollidedWithSnake(movedHead, nextSnakes, snake.id)) {
                //console.log(`Snake ${snake.id} collided!`);
                snakesToRemove.push(snake.id);

                // Update player death count
                if (nextPlayerStats[snake.id]) {
                    nextPlayerStats[snake.id] = {
                        ...nextPlayerStats[snake.id],
                        deaths: nextPlayerStats[snake.id].deaths + 1
                    };
                }

                return currentSnake; // Return the moved snake state before filtering
            }
        }

        // Food Collision Check (use potentially updated food list)
        const eatenFood = checkFoodCollision(movedHead, nextFood);
        if (eatenFood) {
            // Only grow/score if the snake actually moved into the food this tick
            if (shouldMoveThisTick) {
                foodToRemove.push(eatenFood);
                currentSnake = growSnake(currentSnake); // Assume returns new snake
                const scoreMultiplier = getScoreMultiplier(snake.id, nextActivePowerUps, currentTime);
                // Update score immutably on the copied snake
                const points = eatenFood.value * scoreMultiplier;
                currentSnake = { ...currentSnake, score: currentSnake.score + points };

                // Also update in player stats
                if (nextPlayerStats[snake.id]) {
                    nextPlayerStats[snake.id] = {
                        ...nextPlayerStats[snake.id],
                        score: nextPlayerStats[snake.id].score + points
                    };
                }
            }
        }

        // Power-up Collision Check (use potentially updated powerup list)
        const collectedPowerUp = checkPowerUpCollision(movedHead, nextPowerUps);
        if (collectedPowerUp) {
            // Only activate if the snake actually moved into the power-up this tick
            if (shouldMoveThisTick) {
                powerUpsToRemove.push(collectedPowerUp);
                const newActive = activatePowerUp(currentSnake, collectedPowerUp, currentTime);
                newActivePowerUps.push(newActive);
            }
        }

        // Update score in playerStats from each snake's current score
        // (Do this regardless of movement, as score might change from previous ticks)
        if (nextPlayerStats[snake.id]) {
            nextPlayerStats[snake.id].score = currentSnake.score;
        }

        return currentSnake; // Return the (potentially modified) snake copy
    });
    // Always assign the result of map
    nextSnakes = updatedSnakes;

    // Ensure all snakes are in playerStats (in case they were added outside this process)
    nextSnakes.forEach(snake => {
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

    // 4. Remove collided snakes
    if (snakesToRemove.length > 0) {
        // Filter creates a new array
        nextSnakes = nextSnakes.filter(snake => !snakesToRemove.includes(snake.id));
    }

    // 5. Remove eaten food and collected power-ups
    if (foodToRemove.length > 0) {
        const eatenFoodPositions = new Set(foodToRemove.map(f => `${f.position.x},${f.position.y}`));
        // Filter creates a new array
        nextFood = nextFood.filter(f => !eatenFoodPositions.has(`${f.position.x},${f.position.y}`));
    }
    if (powerUpsToRemove.length > 0) {
        const collectedPowerUpIds = new Set(powerUpsToRemove.map(p => p.id));
        // Filter creates a new array
        nextPowerUps = nextPowerUps.filter(p => !collectedPowerUpIds.has(p.id));
    }

    // 6. Add newly activated power-ups
    if (newActivePowerUps.length > 0) {
        // Create new array via concat/spread
        nextActivePowerUps = [...nextActivePowerUps, ...newActivePowerUps];
    }

    // 7. Respawn snakes that were removed (Optional - depends on game mode)
    // For now, we just remove them.

    // 8. Generate new food if needed (e.g., keep a constant amount)
    const desiredFoodCount = 3; // Example constant
    const currentFoodCount = nextFood.length; // Use length of the potentially updated array
    const foodToAdd: Food[] = []; // Collect new food items here
    if (currentFoodCount < desiredFoodCount) {
        // Pass the current state snapshot for occupied positions calculation
        const occupied = getOccupiedPositions({ snakes: nextSnakes, food: nextFood, powerUps: nextPowerUps });
        for (let i = 0; i < (desiredFoodCount - currentFoodCount); i++) {
            const newFood = generateFood(currentState.gridSize, occupied, randomFunc);
            if (newFood) {
                foodToAdd.push(newFood); // Collect
                occupied.push(newFood.position); // Update occupied positions *locally* for subsequent spawns in this loop
                nextRngSeed = randomFunc() * 4294967296; // Update seed after RNG use
            }
        }
    }
    // --- Start Optimization ---
    // Create new food array only if items were added
    if (foodToAdd.length > 0) {
        nextFood = [...nextFood, ...foodToAdd];
    }
    // --- End Optimization ---


    // 9. Generate new power-ups periodically
    // const POWERUP_SPAWN_CHANCE = 0.01; // REMOVED local definition
    const powerUpsToAdd: PowerUp[] = [];
    if (randomFunc() < POWERUP_SPAWN_CHANCE && nextPowerUps.length < 2) { // Use imported constant
        const occupied = getOccupiedPositions({ snakes: nextSnakes, food: nextFood, powerUps: nextPowerUps });
        // Pass the current counter value and increment it for the next potential spawn
        const newPowerUp = generatePowerUp(currentState.gridSize, occupied, randomFunc, currentTime, nextPowerUpCounter);
        if (newPowerUp) {
            powerUpsToAdd.push(newPowerUp);
            nextPowerUpCounter++; // Increment counter only if power-up was generated
            // Note: If generatePowerUp could fail AND we wanted to retry in the same tick,
            // we'd need more complex logic to ensure the counter only advances once per SUCCESSFUL generation.
            // Assuming generatePowerUp failure is rare (full grid) and we don't retry in the same tick.
            nextRngSeed = randomFunc() * 4294967296; // Update seed after RNG use
        }
    }
    if (powerUpsToAdd.length > 0) {
        nextPowerUps = [...nextPowerUps, ...powerUpsToAdd];
    }

    // 10. Increment sequence number (or handled by NetplayAdapter)
    // nextState.sequence++;
    // Update timestamp handled during final state construction

    // --- Start Optimization ---
    // Construct the final nextState object immutably
    const finalNextState: GameState = {
        ...currentState, // Start with original state
        // Overwrite with modified properties
        rngSeed: nextRngSeed,
        powerUps: nextPowerUps,
        activePowerUps: nextActivePowerUps,
        snakes: nextSnakes,
        food: nextFood,
        timestamp: currentTime,
        sequence: currentState.sequence + 1, // Increment sequence number
        powerUpCounter: nextPowerUpCounter, // Store the updated counter
        playerCount: nextPlayerCount, // Add player count here
        playerStats: nextPlayerStats // Add updated player stats
    };
    // --- End Optimization ---

    return finalNextState; // Return the new state object
}; 