import { GameState } from '../state/types';
import { GRID_SIZE, CELL_SIZE } from '../constants';
import { drawGame } from '../rendering/renderer';
import logger from '../../utils/logger';

export class NetplayAdapter {
  static canvasSize = {
    width: 1024,
    height: Math.round(1024 * (GRID_SIZE.height / GRID_SIZE.width))
  };

  localPlayerId: string;

  constructor(canvas: HTMLCanvasElement, localPlayerId: string) {
    this.localPlayerId = localPlayerId;

    logger.debug('Client NetplayAdapter (Helper) initialized.');
  }

  draw(canvas: HTMLCanvasElement, state: GameState): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawGame(ctx, state, this.localPlayerId);
  }
}
