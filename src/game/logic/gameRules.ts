import { GameState, Direction, Food, PowerUp, ActivePowerUp } from "../state/types";
import { mulberry32, getOccupiedPositions } from "./prng";
import { checkFoodCollision, checkPowerUpCollision, hasCollidedWithSnake, hasCollidedWithWall } from "./collision";
import { moveSnakeBody, growSnake } from "./snakeLogic";
import { generateFood } from "./foodLogic";
import { generatePowerUp, activatePowerUp, cleanupExpiredActivePowerUps, cleanupExpiredGridPowerUps, getScoreMultiplier, isInvincible } from "./powerUpLogic";

// Define the structure for player inputs for a single tick
export type PlayerInputs = Map<string, Direction>; // Map<playerId, intendedDirection>

// The main game logic tick function
// Takes the current state and player inputs, returns the next state
// This function should be PURE and DETERMINISTIC
export const updateGame = (currentState: GameState, inputs: PlayerInputs, currentTime: number): GameState => {
    // --- Start Optimization ---
    // Use a shallow copy + immutable updates instead of deep copy
    // const nextState: GameState = JSON.parse(JSON.stringify(currentState)); // Deep copy to avoid mutation - REMOVED
    const randomFunc = mulberry32(currentState.rngSeed); // Get PRNG function for this tick

    // 1. Update RNG seed for next tick (do this first)
    const nextRngSeed = randomFunc() * 4294967296; // Calculate new seed

    // Keep track of changes to arrays to avoid unnecessary copying if nothing changes
    let nextPowerUps = currentState.powerUps;
    let nextActivePowerUps = currentState.activePowerUps;
    let nextFood = currentState.food;
    let nextSnakes = currentState.snakes;
    // --- End Optimization ---

    // 2. Cleanup expired power-ups (grid and active)
    // These functions should ideally return the original array if no changes were made
    const cleanedGridPowerUps = cleanupExpiredGridPowerUps(currentState.powerUps, currentTime);
    if (cleanedGridPowerUps !== currentState.powerUps) {
        nextPowerUps = cleanedGridPowerUps;
    }
    const cleanedActivePowerUps = cleanupExpiredActivePowerUps(currentState.activePowerUps, currentTime);
     if (cleanedActivePowerUps !== currentState.activePowerUps) {
        nextActivePowerUps = cleanedActivePowerUps;
    }


    // 3. Process snake updates (direction changes, movement, collisions)
    const snakesToRemove: string[] = [];
    const newActivePowerUps: ActivePowerUp[] = [];
    const foodToRemove: Food[] = []; // Store actual food objects to remove
    const powerUpsToRemove: PowerUp[] = []; // Store actual powerup objects to remove

    // Map returns a new array, update snakes based on current state arrays
    const updatedSnakes = currentState.snakes.map(snake => {
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

        // Calculate next position and move snake (assume moveSnakeBody returns a new snake)
        // Pass the gridSize for wrapping logic
        currentSnake = moveSnakeBody(currentSnake, currentState.gridSize);
        const movedHead = currentSnake.body[0];

        // Invincibility check (using potentially updated active powerups)
        const invincible = isInvincible(snake.id, nextActivePowerUps, currentTime);

        // Collision Checks (check against *original* snake list for this tick)
        // REMOVE wall collision check if wrapping is enabled
        if (!invincible) {
            // Pass currentState.snakes here for consistent collision checks within the tick
            if (/*hasCollidedWithWall(movedHead, currentState.gridSize) ||*/
                hasCollidedWithSnake(movedHead, currentState.snakes, snake.id)) {
                console.log(`Snake ${snake.id} collided!`);
                snakesToRemove.push(snake.id);
                return currentSnake; // Return the moved snake state before filtering
            }
        }

        // Food Collision Check (use potentially updated food list)
        const eatenFood = checkFoodCollision(movedHead, nextFood);
        if (eatenFood) {
            console.log(`Snake ${snake.id} ate food!`);
            foodToRemove.push(eatenFood);
            currentSnake = growSnake(currentSnake); // Assume returns new snake
            const scoreMultiplier = getScoreMultiplier(snake.id, nextActivePowerUps, currentTime);
             // Update score immutably on the copied snake
            currentSnake = { ...currentSnake, score: currentSnake.score + eatenFood.value * scoreMultiplier };
        }

        // Power-up Collision Check (use potentially updated powerup list)
        const collectedPowerUp = checkPowerUpCollision(movedHead, nextPowerUps);
        if (collectedPowerUp) {
            console.log(`Snake ${snake.id} collected ${collectedPowerUp.type}!`);
            powerUpsToRemove.push(collectedPowerUp);
            const newActive = activatePowerUp(currentSnake, collectedPowerUp, currentTime);
            newActivePowerUps.push(newActive);
        }

        return currentSnake; // Return the (potentially) modified snake copy
    });
    // Always assign the result of map
    nextSnakes = updatedSnakes;


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
            }
        }
    }
    // --- Start Optimization ---
    // Create new food array only if items were added
    if (foodToAdd.length > 0) {
        nextFood = [...nextFood, ...foodToAdd];
    }
    // --- End Optimization ---


    // 9. Generate new power-ups periodically (or based on other logic)
    const POWERUP_SPAWN_CHANCE = 0.01; // Example: 1% chance per tick
    const powerUpsToAdd: PowerUp[] = []; // Collect new powerups here
    // Check length against the potentially updated array
    if (randomFunc() < POWERUP_SPAWN_CHANCE && nextPowerUps.length < 2) {
         // Pass the current state snapshot for occupied positions calculation
         const occupied = getOccupiedPositions({ snakes: nextSnakes, food: nextFood, powerUps: nextPowerUps });
         const newPowerUp = generatePowerUp(currentState.gridSize, occupied, randomFunc, currentTime);
         if (newPowerUp) {
             powerUpsToAdd.push(newPowerUp); // Collect
         }
    }
    // --- Start Optimization ---
    // Create new powerUps array only if items were added
     if (powerUpsToAdd.length > 0) {
        nextPowerUps = [...nextPowerUps, ...powerUpsToAdd];
    }
    // --- End Optimization ---


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
    };
    // --- End Optimization ---

    return finalNextState; // Return the new state object
}; 