export type DirectionInput = { dx: number; dy: number };

export const mapKeyCodeToDirection = (key: string): DirectionInput | null => {
  switch (key.toLowerCase()) {
    case 'arrowup':
      return { dx: 0, dy: 1 };
    case 'arrowdown':
      return { dx: 0, dy: -1 };
    case 'arrowleft':
      return { dx: -1, dy: 0 };
    case 'arrowright':
      return { dx: 1, dy: 0 };

    case 'w':
      return { dx: 0, dy: 1 };
    case 's':
      return { dx: 0, dy: -1 };
    case 'a':
      return { dx: -1, dy: 0 };
    case 'd':
      return { dx: 1, dy: 0 };

    default:
      return null;
  }
};
