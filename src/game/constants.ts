import { Point } from "./state/types";

// Constants
export const GRID_SIZE = { width: 50, height: 30 };
export const CELL_SIZE = 12; // Decreased cell size to fit more cells in roughly the same area
export const GAME_SPEED_MS = 100; // Update game logic every 100ms
export const FOOD_VALUE = 1;
export const POWER_UP_SPAWN_INTERVAL = 5000; // Spawn power-up every 5 seconds (in ms)
export const POWER_UP_GRID_DURATION = 5000; // ms on the grid
export const POWER_UP_EFFECT_DURATION = 8000; // ms effect on snake
export const POWERUP_DURATION_MS = 5000; // 5 seconds

// Define a list of high-contrast, visually distinct colors for players
export const PLAYER_COLORS = [
  '#FF5733', // Red-Orange
  '#33FF57', // Lime Green
  '#3357FF', // Bright Blue
  '#FF33A1', // Pink/Magenta
  '#FFDD33', // Yellow
  '#33FFF3', // Cyan
  '#FF8F33', // Orange
  '#8F33FF', // Purple
  '#FFFFFF', // White
  '#B2FF33', // Yellow-Green
  '#33FFB2', // Aqua
  '#B233FF'  // Violet
]; 