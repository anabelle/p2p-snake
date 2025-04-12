import { mapKeyCodeToDirection } from './inputUtils';

describe('inputUtils', () => {
  describe('mapKeyCodeToDirection', () => {
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

    it('should map "w" to { dx: 0, dy: 1 }', () => {
      expect(mapKeyCodeToDirection('w')).toEqual({ dx: 0, dy: 1 });
    });
    it('should map "s" to { dx: 0, dy: -1 }', () => {
      expect(mapKeyCodeToDirection('s')).toEqual({ dx: 0, dy: -1 });
    });
    it('should map "a" to { dx: -1, dy: 0 }', () => {
      expect(mapKeyCodeToDirection('a')).toEqual({ dx: -1, dy: 0 });
    });
    it('should map "d" to { dx: 1, dy: 0 }', () => {
      expect(mapKeyCodeToDirection('d')).toEqual({ dx: 1, dy: 0 });
    });

    it('should map "W" to { dx: 0, dy: 1 }', () => {
      expect(mapKeyCodeToDirection('W')).toEqual({ dx: 0, dy: 1 });
    });
    it('should map "A" to { dx: -1, dy: 0 }', () => {
      expect(mapKeyCodeToDirection('A')).toEqual({ dx: -1, dy: 0 });
    });

    it('should return null for non-movement keys', () => {
      expect(mapKeyCodeToDirection('Enter')).toBeNull();
      expect(mapKeyCodeToDirection('Shift')).toBeNull();
      expect(mapKeyCodeToDirection(' ')).toBeNull();
      expect(mapKeyCodeToDirection('q')).toBeNull();
    });
  });
});
