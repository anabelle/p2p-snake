import { mapKeyCodeToDirection } from './inputUtils';

describe('inputUtils', () => {
  describe('mapKeyCodeToDirection', () => {
    // Existing Arrow Key Tests
    it('should map ArrowUp to { dx: 0, dy: 1 }', () => {
      expect(mapKeyCodeToDirection('ArrowUp')).toEqual({ dx: 0, dy: 1 });
    });
    it('should map ArrowDown to { dx: 0, dy: -1 }', () => {
      expect(mapKeyCodeToDirection('ArrowDown')).toEqual({ dx: 0, dy: -1 });
    });
    it('should map ArrowLeft to { dx: -1, dy: 0 }', () => {
      expect(mapKeyCodeToDirection('ArrowLeft')).toEqual({ dx: -1, dy: 0 });
    });
    it('should map ArrowRight to { dx: 1, dy: 0 }', () => {
      expect(mapKeyCodeToDirection('ArrowRight')).toEqual({ dx: 1, dy: 0 });
    });

    // Failing WASD Tests (will fail initially)
    it('should map "w" to { dx: 0, dy: 1 }', () => {
      // This test will fail until the function is implemented correctly
      expect(mapKeyCodeToDirection('w')).toEqual({ dx: 0, dy: 1 });
    });
    it('should map "s" to { dx: 0, dy: -1 }', () => {
      // This test will fail
      expect(mapKeyCodeToDirection('s')).toEqual({ dx: 0, dy: -1 });
    });
    it('should map "a" to { dx: -1, dy: 0 }', () => {
      // This test will fail
      expect(mapKeyCodeToDirection('a')).toEqual({ dx: -1, dy: 0 });
    });
    it('should map "d" to { dx: 1, dy: 0 }', () => {
      // This test will fail
      expect(mapKeyCodeToDirection('d')).toEqual({ dx: 1, dy: 0 });
    });

    // Case-insensitivity tests
    it('should map "W" to { dx: 0, dy: 1 }', () => {
      expect(mapKeyCodeToDirection('W')).toEqual({ dx: 0, dy: 1 });
    });
    it('should map "A" to { dx: -1, dy: 0 }', () => {
      expect(mapKeyCodeToDirection('A')).toEqual({ dx: -1, dy: 0 });
    });

    // Non-movement key test
    it('should return null for non-movement keys', () => {
      expect(mapKeyCodeToDirection('Enter')).toBeNull();
      expect(mapKeyCodeToDirection('Shift')).toBeNull();
      expect(mapKeyCodeToDirection(' ')).toBeNull();
      expect(mapKeyCodeToDirection('q')).toBeNull();
    });
  });
});
