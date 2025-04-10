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

  constructor(canvas: HTMLCanvasElement, players: Array<netplayjs.NetplayPlayer>) {
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
      playerCount: 0 // Initialize playerCount
    };

    // --- Dynamic Player Handling ---
    // Snakes are now added dynamically in the tick() method
    // based on connected players each tick.
    // The constructor only initializes the core game state.
    // --- End Dynamic Player Handling ---

    // Initialize Food (can still be done here)
    const occupiedInitial = getOccupiedPositions(this.state);
    const foodCount = 3;
    for (let i = 0; i < foodCount; i++) {
      const food = generateFood(this.state.gridSize, occupiedInitial, initialRandomFunc);
      if (food) {
        this.state.food.push(food);
        occupiedInitial.push(food.position);
      }
    }

    this.lastTickTime = performance.now();
    this.state.timestamp = this.lastTickTime;
  }

  tick(playerInputs: Map<netplayjs.NetplayPlayer, Input>): void {
    const now = performance.now();
    const dt = now - this.lastTickTime;
    this.lastTickTime = now;

    // --- Dynamic Player Handling (Before Logic Tick) ---
    const currentPlayerIDs = new Set(Array.from(playerInputs.keys()).map(p => p.getID().toString()));
    const existingSnakeIDs = new Set(this.state.snakes.map(s => s.id));

    let stateChanged = false;
    let nextSnakes = [...this.state.snakes]; // Start with current snakes
    const randomFuncForNewSnakes = mulberry32(this.state.rngSeed); // Use current seed

    // Add new players
    for (const player of Array.from(playerInputs.keys())) {
        const playerId = player.getID().toString();
        if (!existingSnakeIDs.has(playerId)) {
            console.log(`Player joined: ${playerId}. Adding snake.`);
            const occupied = getOccupiedPositions(this.state);
            const newSnake = generateNewSnake(playerId, this.state.gridSize, occupied, randomFuncForNewSnakes);
            nextSnakes.push(newSnake);
            stateChanged = true;
            // Update occupied positions locally for next potential spawn
            occupied.push(...newSnake.body);
        }
    }

    // Remove players who left
    const snakesToRemove = this.state.snakes.filter(snake => !currentPlayerIDs.has(snake.id));
    if (snakesToRemove.length > 0) {
        console.log(`Players left: ${snakesToRemove.map(s => s.id).join(', ')}. Removing snakes.`);
        const idsToRemove = new Set(snakesToRemove.map(s => s.id));
        nextSnakes = nextSnakes.filter(snake => !idsToRemove.has(snake.id));
        stateChanged = true;
    }

    // Update state if players changed
    if (stateChanged) {
        this.state = {
            ...this.state,
            snakes: nextSnakes,
            playerCount: currentPlayerIDs.size,
            // Advance RNG seed because we used it for new snake positions
            rngSeed: randomFuncForNewSnakes() * 4294967296
        };
    } else {
        // If no players joined/left, still update player count in case it's the first tick
        this.state = { ...this.state, playerCount: currentPlayerIDs.size };
    }
    // --- End Dynamic Player Handling ---

    // --- Input Processing (Every Frame) ---
    // Clear previous intentions before processing new ones for this frame
    this.intendedDirections.clear();
    for (const [player, input] of Array.from(playerInputs.entries())) {
        const playerId = player.getID().toString();
        const currentSnake = this.state.snakes.find(s => s.id === playerId);
        if (!currentSnake) continue; // Ignore input if snake doesn't exist (might happen briefly during join/leave)

        const vel = input.arrowKeys();
        let requestedDirection: Direction | null = null;

        if (vel.x === -1) requestedDirection = Direction.LEFT;
        else if (vel.x === 1) requestedDirection = Direction.RIGHT;
        else if (vel.y === 1) requestedDirection = Direction.UP;   // NetplayJS +Y is up
        else if (vel.y === -1) requestedDirection = Direction.DOWN; // NetplayJS -Y is down

        if (requestedDirection) {
            this.intendedDirections.set(playerId, requestedDirection);
        }
    }

    // --- Game Logic Update (Fixed Timestep) ---
    this.gameLogicTickAccumulator += dt;
    let logicalTime = this.state.timestamp;

    while (this.gameLogicTickAccumulator >= this.gameLogicInterval) {
        // Use the collected intended directions for this logic tick
        const currentInputs: PlayerInputs = new Map(this.intendedDirections);

        logicalTime += this.gameLogicInterval;

        // Run the deterministic game update function
        this.state = updateGame(this.state, currentInputs, logicalTime);

        this.gameLogicTickAccumulator -= this.gameLogicInterval;
        // Intended directions persist until the next frame's input processing clears them
    }
    // Timestamp is updated within updateGame
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