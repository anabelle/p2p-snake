import {
  GRID_SIZE,
  CELL_SIZE,
  GAME_SPEED_MS,
  FOOD_VALUE,
  POWER_UP_SPAWN_INTERVAL,
  POWER_UP_GRID_DURATION,
  POWER_UP_EFFECT_DURATION,
  POWERUP_DURATION_MS,
  PLAYER_COLORS
} from './constants';

describe('Game Constants', () => {
  it('should have GRID_SIZE defined', () => {
    expect(GRID_SIZE).toBeDefined();
    expect(GRID_SIZE.width).toBeGreaterThan(0);
    expect(GRID_SIZE.height).toBeGreaterThan(0);
  });

  it('should have CELL_SIZE defined and positive', () => {
    expect(CELL_SIZE).toBeDefined();
    expect(CELL_SIZE).toBeGreaterThan(0);
  });

  it('should have GAME_SPEED_MS defined and positive', () => {
    expect(GAME_SPEED_MS).toBeDefined();
    expect(GAME_SPEED_MS).toBeGreaterThan(0);
  });

  it('should have FOOD_VALUE defined and positive', () => {
    expect(FOOD_VALUE).toBeDefined();
    expect(FOOD_VALUE).toBeGreaterThan(0);
  });

  it('should have POWER_UP_SPAWN_INTERVAL defined and positive', () => {
    expect(POWER_UP_SPAWN_INTERVAL).toBeDefined();
    expect(POWER_UP_SPAWN_INTERVAL).toBeGreaterThan(0);
  });

  it('should have POWER_UP_GRID_DURATION defined and positive', () => {
    expect(POWER_UP_GRID_DURATION).toBeDefined();
    expect(POWER_UP_GRID_DURATION).toBeGreaterThan(0);
  });

  it('should have POWER_UP_EFFECT_DURATION defined and positive', () => {
    expect(POWER_UP_EFFECT_DURATION).toBeDefined();
    expect(POWER_UP_EFFECT_DURATION).toBeGreaterThan(0);
  });

  it('should have POWERUP_DURATION_MS defined and positive', () => {
    expect(POWERUP_DURATION_MS).toBeDefined();
    expect(POWERUP_DURATION_MS).toBeGreaterThan(0);
  });

  it('should have PLAYER_COLORS defined as a non-empty array of strings', () => {
    expect(PLAYER_COLORS).toBeDefined();
    expect(Array.isArray(PLAYER_COLORS)).toBe(true);
    expect(PLAYER_COLORS.length).toBeGreaterThan(0);
    PLAYER_COLORS.forEach((color) => {
      expect(typeof color).toBe('string');

      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});
