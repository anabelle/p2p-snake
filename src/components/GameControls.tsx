import React from 'react';

interface GameControlsProps {
  isGameRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onRestart: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  isGameRunning,
  onStart,
  onPause,
  onRestart,
}) => {
  return (
    <div className="controls">
      {!isGameRunning ? (
        <button onClick={onStart} aria-label="Start Game">
          Start
        </button>
      ) : (
        <button onClick={onPause} aria-label="Pause Game">
          Pause
        </button>
      )}
      <button onClick={onRestart} aria-label="Restart Game">
        Restart
      </button>
      <div className="controls-help">
        <p>Use arrow keys to control your snake.</p>
        <p>Collect power-ups for special abilities!</p>
        <ul aria-label="Power-ups Guide">
          <li>Green: Speed boost</li>
          <li>Blue: Slow down</li>
          <li>Yellow: Invincibility</li>
          <li>Magenta: Double score</li>
        </ul>
      </div>
    </div>
  );
};

export default GameControls; 