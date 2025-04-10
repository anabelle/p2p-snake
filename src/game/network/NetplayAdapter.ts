import * as netplayjs from "netplayjs";
import { GameState, Direction } from "../state/types";
import { GRID_SIZE, CELL_SIZE, GAME_SPEED_MS } from "../constants";
import { updateGame, PlayerInputs } from "../logic/gameRules";
import { drawGame } from "../rendering/renderer";
import { getOccupiedPositions, mulberry32 } from "../logic/prng";
import { generateNewSnake } from "../logic/snakeLogic";
import { generateFood } from "../logic/foodLogic";

// Define the structure for our game's input state
type Input = netplayjs.DefaultInput; // Use Netplay's default arrow key input

export class NetplayAdapter extends netplayjs.Game {
  static timestep = 1000 / 60; // Aim for 60 FPS rendering/input sampling
  static canvasSize = { width: GRID_SIZE.width * CELL_SIZE, height: GRID_SIZE.height * CELL_SIZE };
  static deterministic = true;

  // Authoritative state managed by NetplayJS
  state: GameState;

  // Non-state variables for adapter logic
  private gameLogicTickAccumulator: number = 0;
  private gameLogicInterval: number = GAME_SPEED_MS; // How often to run game logic (ms)
  private lastTickTime: number = 0;

  // Store intended direction changes between logic ticks
  private intendedDirections: Map<string, Direction> = new Map();

  constructor(canvas: HTMLCanvasElement, players: Array<netplayjs.NetplayPlayer>, isInitiallyHost?: boolean) {
    super();

    // Initialize Authoritative State
    const initialSeed = 0; // Use a fixed seed for deterministic start
    const initialRandomFunc = mulberry32(initialSeed);
    this.state = {
      snakes: [],
      food: [],
      powerUps: [],
      activePowerUps: [],
      gridSize: GRID_SIZE,
      timestamp: 0,
      sequence: 0,
      rngSeed: initialSeed,
      playerCount: 0,
      powerUpCounter: 0 // Initialize the counter
    };

    // Conditional Initialization based on host status
    // If not host initially, don't generate food. Rely on first state sync.
    if (isInitiallyHost !== false) { // Assume host unless explicitly told otherwise
        const occupiedInitial = getOccupiedPositions(this.state);
        const foodCount = 3;
        for (let i = 0; i < foodCount; i++) {
            const food = generateFood(this.state.gridSize, occupiedInitial, initialRandomFunc);
            if (food) {
                this.state.food.push(food);
                occupiedInitial.push(food.position);
            }
        }
        console.log("Adapter Constructor: Initialized food as host.");
    } else {
        console.log("Adapter Constructor: Skipped initial food generation as client.");
    }

    this.lastTickTime = performance.now();
    this.state.timestamp = this.lastTickTime;
  }

  tick(playerInputs: Map<any, any>): void {
    const now = performance.now();
    const dt = now - this.lastTickTime;
    this.lastTickTime = now;

    // --- Input Processing (Every Frame) ---
    this.intendedDirections.clear();
    
    // UNCOMMENT Log: Check received playerInputs map
    console.log("Adapter Tick - Received playerInputs:", playerInputs);

    // Calculate currentPlayerIDs here for passing to updateGame
    const currentPlayerIDs = new Set<string>();
    for (const [player, input] of Array.from(playerInputs.entries())) {
        // UNCOMMENT Log: Check player and input object received in loop
        // console.log(`Adapter Tick - Processing input for player: ${player?.getID ? player.getID() : 'UNKNOWN'}`);
        // console.log(`Adapter Tick - Input object:`, input);
        
        const playerId = player?.getID ? player.getID().toString() : null;
        if (!playerId) continue; 

        // Add player ID to the set for this tick
        currentPlayerIDs.add(playerId);

        const currentSnake = this.state.snakes.find(s => s.id === playerId);
        if (!currentSnake) continue; 

        let vel = { x: 0, y: 0 };
        try {
            if (input && typeof input.arrowKeys === 'function') {
                vel = input.arrowKeys(); // <= Call arrowKeys()
                // UNCOMMENT Log: Check result of arrowKeys()
                console.log(`Adapter Tick - arrowKeys() for ${playerId} returned:`, vel);
            } else {
                console.warn(`Adapter Tick - Invalid input object for ${playerId}:`, input);
            }
        } catch (e) {
             console.error(`Adapter Tick - Error calling arrowKeys() for ${playerId}:`, e);
             continue;
        }
        
        let requestedDirection: Direction | null = null;

        if (vel.x === -1) requestedDirection = Direction.LEFT;
        else if (vel.x === 1) requestedDirection = Direction.RIGHT;
        else if (vel.y === 1) requestedDirection = Direction.UP;   
        else if (vel.y === -1) requestedDirection = Direction.DOWN; 

        if (requestedDirection) {
            console.log(`Adapter Tick - Setting intended direction for ${playerId}: ${requestedDirection}`);
            this.intendedDirections.set(playerId, requestedDirection);
        }
    }

    // UNCOMMENT Log: Show the final intendedDirections map before the logic loop
    // console.log("Adapter Tick - Final intendedDirections:", this.intendedDirections);

    // --- Game Logic Update (Fixed Timestep) ---
    this.gameLogicTickAccumulator += dt;
    let logicalTime = this.state.timestamp;

    while (this.gameLogicTickAccumulator >= this.gameLogicInterval) {
        const currentInputs: PlayerInputs = new Map(this.intendedDirections);
        logicalTime += this.gameLogicInterval;
        
        // Add Log: Check inputs being passed to updateGame
        console.log(`Adapter Tick - Passing to updateGame (Tick ${logicalTime}):`, currentInputs);

        // Add Log: Log state BEFORE update
        const stateBeforeJson = JSON.stringify(this.state); // Stringify the whole state for comparison
        // console.log(`Adapter Tick - State BEFORE updateGame (Tick ${logicalTime}):`, stateBeforeJson);

        // Pass currentPlayerIDs to updateGame
        try {
            this.state = updateGame(this.state, currentInputs, logicalTime, currentPlayerIDs);
        } catch (e) {
            console.error(`Adapter Tick - Error during updateGame (Tick ${logicalTime}):`, e);
            // Prevent infinite loop if updateGame consistently fails
            this.gameLogicTickAccumulator = 0; 
            break; // Exit while loop for this frame
        }
        
        // Add Log: Log state AFTER update
        const stateAfterJson = JSON.stringify(this.state);
        // console.log(`Adapter Tick - State AFTER updateGame (Tick ${logicalTime}):`, stateAfterJson);
        if (stateBeforeJson === stateAfterJson && currentInputs.size > 0) {
             // Only warn if state didn't change AND there were inputs intended for this tick
             console.warn(`Adapter Tick - State did not change after updateGame despite inputs (Tick ${logicalTime}). Inputs:`, currentInputs, "State:", this.state);
        }
        
        this.gameLogicTickAccumulator -= this.gameLogicInterval;
    }
  }

  serialize(): netplayjs.JsonValue {
    return this.state as unknown as netplayjs.JsonValue;
  }

  deserialize(value: netplayjs.JsonValue): void {
    this.state = value as unknown as GameState;
    // No need to re-initialize timers or accumulators here,
    // they are based on performance.now() or derived from the deserialized state.
  }

  draw(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- UI Enhancements ---
    // Border color logic removed - should be handled in the UI layer (e.g., App.tsx)
    // where the local player ID is known.

    // Draw game state
    drawGame(ctx, this.state);

    // Draw player count
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Players: ${this.state.playerCount}`, 10, 10);
    // --- End UI Enhancements ---
  }
} 