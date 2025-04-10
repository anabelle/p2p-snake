import { GameState, Direction } from "../state/types";
import { GRID_SIZE, CELL_SIZE, GAME_SPEED_MS } from "../constants";
import { drawGame } from "../rendering/renderer";
import * as netplayjs from 'netplayjs'; // Still needed for JsonValue type

// NOTE: This class NO LONGER inherits from netplayjs.Game
// It's a client-side helper for state deserialization and drawing.
export class NetplayAdapter {
  // Static properties removed
  static canvasSize = { width: GRID_SIZE.width * CELL_SIZE, height: GRID_SIZE.height * CELL_SIZE };

  state: GameState;

  // Simplified constructor for client-side adapter
  constructor(canvas: HTMLCanvasElement /* Canvas might not even be needed here if draw gets it */) {
    // Initialize with a minimal default state.
    // The actual state will come from the server via deserialize().
    this.state = {
      snakes: [],
      food: [],
      powerUps: [],
      activePowerUps: [],
      gridSize: GRID_SIZE,
      timestamp: 0,
      sequence: 0,
      rngSeed: 0,
      playerCount: 0,
      powerUpCounter: 0
    };
    console.log("Client NetplayAdapter (Helper) initialized.");
  }

  deserialize(value: netplayjs.JsonValue): void {
    // Client receives state from server and applies it
    this.state = value as unknown as GameState;
  }

  draw(canvas: HTMLCanvasElement): void {
    // Drawing logic remains the same, renders this.state
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawGame(ctx, this.state);

    // Draw player count (or other UI info based on state)
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Players: ${this.state.playerCount}`, 10, 10);
  }
} 