export type DirectionInput = { dx: number; dy: number };

export const mapKeyCodeToDirection = (key: string): DirectionInput | null => {
  switch (
    key.toLowerCase() // Use toLowerCase() for case-insensitivity
  ) {
    // Arrow Keys
    case 'arrowup':
      return { dx: 0, dy: 1 };
    case 'arrowdown':
      return { dx: 0, dy: -1 };
    case 'arrowleft':
      return { dx: -1, dy: 0 };
    case 'arrowright':
      return { dx: 1, dy: 0 };

    // WASD Keys
    case 'w':
      return { dx: 0, dy: 1 }; // W = Up
    case 's':
      return { dx: 0, dy: -1 }; // S = Down
    case 'a':
      return { dx: -1, dy: 0 }; // A = Left
    case 'd':
      return { dx: 1, dy: 0 }; // D = Right

    default:
      return null; // Not a movement key
  }
};
