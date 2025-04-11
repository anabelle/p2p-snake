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
  onRestart
}) => {
  // Handle keyboard control for the Start/Pause button
  const handleSpacebarPress = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      isGameRunning ? onPause() : onStart();
    }
  };

  // Handle keyboard control for the Restart button
  const handleRestartKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onRestart();
    }
  };

  return (
    <div className='controls'>
      <button
        onClick={isGameRunning ? onPause : onStart}
        onKeyDown={handleSpacebarPress}
        aria-label={isGameRunning ? 'Pause Game' : 'Start Game'}
        className={isGameRunning ? 'pause-button' : 'start-button'}
      >
        {isGameRunning ? 'Pause' : 'Start'}
      </button>
      <button onClick={onRestart} onKeyDown={handleRestartKeyPress} aria-label='Restart Game'>
        Restart
      </button>
      <div className='controls-help'>
        <p>Use arrow keys to control your snake.</p>
        <p>Collect power-ups for special abilities!</p>
        <div className='power-up-guide'>
          <h3>Power-ups Guide:</h3>
          <ul aria-label='Power-ups Guide'>
            <li>
              <span className='power-up-color' style={{ backgroundColor: '#00ff00' }}></span> Green:
              Speed boost
            </li>
            <li>
              <span className='power-up-color' style={{ backgroundColor: '#0000ff' }}></span> Blue:
              Slow down
            </li>
            <li>
              <span className='power-up-color' style={{ backgroundColor: '#ffff00' }}></span>{' '}
              Yellow: Invincibility
            </li>
            <li>
              <span className='power-up-color' style={{ backgroundColor: '#ff00ff' }}></span>{' '}
              Magenta: Double score
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GameControls;
