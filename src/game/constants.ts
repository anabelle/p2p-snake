import { Point } from "./state/types";

// Constants
export const GRID_SIZE = { width: 50, height: 30 };
export const CELL_SIZE = 12; // Decreased cell size to fit more cells in roughly the same area
export const GAME_SPEED_MS = 150; // Update game logic every 150ms (increased from 100ms for slower connections)
export const FOOD_VALUE = 1;
export const POWER_UP_SPAWN_INTERVAL = 5000; // Spawn power-up every 5 seconds (in ms)
export const POWERUP_SPAWN_CHANCE = 0.01; // Chance (0 to 1) to spawn power-up per tick
export const POWER_UP_GRID_DURATION = 5000; // ms on the grid
export const POWER_UP_EFFECT_DURATION = 8000; // ms effect on snake
export const POWERUP_DURATION_MS = 5000; // 5 seconds

// Define a list of high-contrast, visually distinct colors for players
export const PLAYER_COLORS = [
  // Original colors
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
  '#B233FF', // Violet
  
  // Dark colors
  '#1E293B', // Slate-900
  '#1E3A8A', // Dark Blue
  '#3F005E', // Dark Purple
  '#6B0000', // Dark Red
  '#3D4B12', // Dark Olive
  '#004D40', // Dark Teal
  
  // Pastel colors
  '#FFD1DC', // Pastel Pink
  '#B5EAD7', // Pastel Mint
  '#C7CEEA', // Pastel Blue
  '#FFF1C1', // Pastel Yellow
  '#E2F0CB', // Pastel Green
  '#F0E0FF', // Pastel Lavender
  
  // Interesting colors
  '#F0A202', // Amber
  '#F87666', // Coral
  '#264653', // Deep Teal
  '#8338EC', // Vivid Purple
  '#06D6A0', // Caribbean Green
  '#815AC0', // Royal Purple
  '#FF6392', // Flamingo Pink
  '#03071E', // Dark Navy
  '#A7F0D1', // Seafoam Green
  '#540D6E', // Byzantine Purple
]; 