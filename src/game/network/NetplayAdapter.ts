import { GameState, Direction } from "../state/types";
import { GRID_SIZE, CELL_SIZE, GAME_SPEED_MS } from "../constants";
import { drawGame } from "../rendering/renderer";
import * as netplayjs from 'netplayjs'; // Still needed for JsonValue type

// NOTE: This class NO LONGER inherits from netplayjs.Game
// It's a client-side helper for state deserialization and drawing.
export class NetplayAdapter {
  // Static properties removed
  static canvasSize = { width: GRID_SIZE.width * CELL_SIZE, height: GRID_SIZE.height * CELL_SIZE };

  localPlayerId: string;

  // Simplified constructor for client-side adapter
  constructor(canvas: HTMLCanvasElement, localPlayerId: string) {
    this.localPlayerId = localPlayerId;
    
    console.log("Client NetplayAdapter (Helper) initialized.");
  }

  draw(canvas: HTMLCanvasElement, state: GameState): void {
    // Drawing logic remains the same, renders the passed state
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawGame(ctx, state, this.localPlayerId);
  }
} 