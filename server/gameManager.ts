import { GameState, Direction, PlayerStats } from '../src/game/state/types';
import { GAME_SPEED_MS, GRID_SIZE } from '../src/game/constants';
import { updateGame, PlayerInputs } from '../src/game/logic/gameRules';
import { generateFood } from '../src/game/logic/foodLogic';
import { getOccupiedPositions, mulberry32 } from '../src/game/logic/prng';
import { AI_SNAKE_ID } from '../src/game/logic/aiSnake';

// --- Types ---
interface PlayerInputData {
  dx: number;
  dy: number;
}

interface ProfileUpdate {
  playerId: string;
  name: string;
  color: string;
}

// --- GameManager Class ---
export class GameManager {
  private currentGameState!: GameState; // Definite assignment in initializeGame
  private connectedPlayerIds = new Set<string>();
  private playerInputs = new Map<string, PlayerInputData>();
  private profileUpdateQueue: ProfileUpdate[] = [];
  private lastTickTime: number = 0;

  constructor() {
    this.initializeGame();
  }

  // --- Initialization ---
  initializeGame(): void {
    const initialSeed = Date.now();
    const initialRandomFunc = mulberry32(initialSeed);
    const initialState: GameState = {
        snakes: [],
        food: [],
        powerUps: [],
        activePowerUps: [],
        gridSize: GRID_SIZE,
        timestamp: performance.now(),
        sequence: 0,
        rngSeed: initialSeed,
        playerCount: 0,
        powerUpCounter: 0,
        playerStats: {}
    };

    // Add AI snake stats
    initialState.playerStats[AI_SNAKE_ID] = {
        id: AI_SNAKE_ID,
        name: "AI Snake",
        color: "#FF5500",
        score: this.currentGameState?.playerStats?.[AI_SNAKE_ID]?.score || 0, // Preserve score?
        deaths: this.currentGameState?.playerStats?.[AI_SNAKE_ID]?.deaths || 0, // Preserve deaths?
        isConnected: true // AI is always 'connected'
    };

    // Generate initial food
    const occupiedInitial = getOccupiedPositions(initialState);
    const foodCount = 3;
    for (let i = 0; i < foodCount; i++) {
        const food = generateFood(initialState.gridSize, occupiedInitial, initialRandomFunc);
        if (food) {
            initialState.food.push(food);
            occupiedInitial.push(food.position);
        }
    }
    initialState.rngSeed = initialRandomFunc() * 4294967296;

    this.currentGameState = initialState;
    this.lastTickTime = performance.now();

    // Force an initial game tick to ensure AI snake is created immediately
    // Note: updateGame needs the set of *currently connected* player IDs.
    // Since no players are connected yet, we pass an empty set initially.
    // The AI snake logic within updateGame should handle its creation.
    const emptyInputs = new Map<string, Direction>();
    const emptyPlayerSet = new Set<string>(); // No real players yet
    this.currentGameState = updateGame(this.currentGameState, emptyInputs, this.currentGameState.timestamp, emptyPlayerSet);
  }

  // --- Player Management ---
  addPlayer(playerId: string, name: string, color: string): void {
    if (this.connectedPlayerIds.has(playerId)) {
      console.warn(`Player ${playerId} already connected.`);
      // Update connection status if they were previously disconnected
      if(this.currentGameState.playerStats[playerId]) {
          this.currentGameState.playerStats[playerId].isConnected = true;
          this.currentGameState.playerStats[playerId].name = name; // Update name on reconnect
          // We don't force color here, let profile update handle changes
      }
    } else {
      this.connectedPlayerIds.add(playerId);
      this.playerInputs.set(playerId, { dx: 0, dy: 0 }); // Initialize input

       if (!this.currentGameState.playerStats) {
          this.currentGameState.playerStats = {};
       }

       if (this.currentGameState.playerStats[playerId]) {
         // Player reconnecting, update status and name
         this.currentGameState.playerStats[playerId] = {
           ...this.currentGameState.playerStats[playerId],
           isConnected: true,
           name: name // Update name in case it changed
           // Keep existing score/deaths
         };
       } else {
          // Initial stats for a completely new player
          this.currentGameState.playerStats[playerId] = {
              id: playerId,
              name: name,
              color: color, // Store preferred color
              score: 0,
              deaths: 0,
              isConnected: true
          };
       }
    }
     // Update player count in game state
    this.currentGameState.playerCount = this.connectedPlayerIds.size;
  }

  removePlayer(playerId: string): void {
    this.connectedPlayerIds.delete(playerId);
    this.playerInputs.delete(playerId);
    // Update player count in game state
    this.currentGameState.playerCount = this.connectedPlayerIds.size;

    // Mark player as disconnected in playerStats but keep their data
    if (this.currentGameState.playerStats && this.currentGameState.playerStats[playerId]) {
      this.currentGameState.playerStats[playerId].isConnected = false;
    }
    // updateGame logic will handle removing the snake based on the missing ID in the connected set
  }

  // --- Input and Profile Updates ---
  setPlayerInput(playerId: string, input: PlayerInputData): void {
     if (this.connectedPlayerIds.has(playerId) && // Ensure player is still connected
         typeof input?.dx === 'number' && typeof input?.dy === 'number') {
       this.playerInputs.set(playerId, input);
     }
  }

  queueProfileUpdate(update: ProfileUpdate): void {
      // Basic validation (can be enhanced)
      if (!this.currentGameState.playerStats || !this.currentGameState.playerStats[update.playerId]) {
          console.warn(`Received updateProfile for unknown or disconnected player: ${update.playerId}`);
          return;
      }
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      if (!update.name || !update.color || !hexColorRegex.test(update.color)) {
          console.warn(`Invalid profile update data for ${update.playerId}:`, update);
          return;
      }
      this.profileUpdateQueue.push(update);
  }

  // --- Game Loop Tick ---
  runGameTick(): GameState | null {
    if (this.connectedPlayerIds.size === 0 && !this.currentGameState.playerStats[AI_SNAKE_ID]?.isConnected) {
        // No human players AND AI seems gone (or never initialized?), can truly sleep
        // Or maybe we always run the tick for the AI? Let's assume we run if AI exists.
         this.lastTickTime = performance.now(); // Prevent large time jump
         // console.log("No players, skipping tick."); // Optional logging
         return null; // Indicate no update occurred
    }

    const now = performance.now();
    // Avoid huge time jumps if server was paused (e.g., debugging)
    const deltaTime = Math.min(now - this.lastTickTime, GAME_SPEED_MS * 5);
    const logicalTime = this.currentGameState.timestamp + deltaTime;
    this.lastTickTime = now;

    // Process Profile Update Queue
    this.processProfileUpdates();

    // Prepare inputs map for updateGame
    const currentTickPlayerInputs: PlayerInputs = new Map();
    this.playerInputs.forEach((input, pId) => {
      if (this.connectedPlayerIds.has(pId)) { // Only include inputs from connected players
        let requestedDirection: Direction | null = null;
        if (input.dx === -1) requestedDirection = Direction.LEFT;
        else if (input.dx === 1) requestedDirection = Direction.RIGHT;
        else if (input.dy === 1) requestedDirection = Direction.UP; // Assuming +y is up based on client? Check consistency.
        else if (input.dy === -1) requestedDirection = Direction.DOWN; // Assuming -y is down

        if (requestedDirection !== null) {
          currentTickPlayerInputs.set(pId, requestedDirection);
        }
      } else {
         // Clean up inputs for players who disconnected between ticks?
         this.playerInputs.delete(pId);
      }
    });

    // Call updateGame with the current state and inputs
    try {
      // Pass the set of *currently connected* player IDs. updateGame uses this
      // to know which snakes correspond to active players.
      this.currentGameState = updateGame(
          this.currentGameState,
          currentTickPlayerInputs,
          logicalTime,
          this.connectedPlayerIds // Pass the actual connected player IDs
      );
      // TODO: Add recovery logic/validation as seen in the original file if needed
    } catch (e) {
      console.error("!!! Error during updateGame in GameManager:", e);
      // Potentially reset state or log more details
      return null; // Indicate error, no new state to broadcast
    }

    return this.currentGameState;
  }

  // --- Helpers ---
  private processProfileUpdates(): void {
     if (this.profileUpdateQueue.length === 0) return;

     this.profileUpdateQueue.forEach(update => {
         if (this.currentGameState.playerStats && this.currentGameState.playerStats[update.playerId]) {
             const stats = this.currentGameState.playerStats[update.playerId];
             let updated = false;
             if (stats.name !== update.name) {
                 stats.name = update.name;
                 updated = true;
             }
             if (stats.color !== update.color) {
                 stats.color = update.color;
                 // Update the active snake's color if it exists
                 const snake = this.currentGameState.snakes.find(s => s.id === update.playerId);
                 if (snake) {
                     snake.color = update.color;
                 }
                 updated = true;
             }
             // if (updated) { console.log(`Applied queued profile update for ${update.playerId}`); }
         } else {
             // console.warn(`Skipping queued update for unknown/disconnected player: ${update.playerId}`);
         }
     });
     // Clear the queue after processing
     this.profileUpdateQueue.length = 0;
  }

  // --- Accessors ---
  getGameState(): GameState {
    return this.currentGameState;
  }

  getPlayerCount(): number {
      // Only count human players for the sleep check logic perhaps?
      // Or total players including AI? Let's count humans for now.
      return this.connectedPlayerIds.size;
  }

   getPlayerStats(): Record<string, PlayerStats> {
       return this.currentGameState.playerStats || {};
   }
} 