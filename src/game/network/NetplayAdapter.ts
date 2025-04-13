import { GameState } from '../state/types';
import { CANVAS } from '../constants';
import { drawGame } from '../rendering/renderer';
import logger from '../../utils/logger';

export class NetplayAdapter {
  
  static canvasSize = { width: CANVAS.MAX_WIDTH, height: CANVAS.getHeight() };

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
