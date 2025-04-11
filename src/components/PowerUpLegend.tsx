import React from 'react';

/**
 * A static component displaying the legend for in-game power-ups.
 */
const PowerUpLegend: React.FC = () => {
  // Copied directly from App.tsx
  return (
    <div className='info-section' id='powerup-legend'>
      <h3>Power-Up Legend</h3>
      <ul>
        <li>
          <span className='powerup-symbol speed'>S</span> - Speed Boost
        </li>
        <li>
          <span className='powerup-symbol slow'>W</span> - Slow Down
        </li>
        <li>
          <span className='powerup-symbol invincibility'>I</span> - Invincibility
        </li>
        <li>
          <span className='powerup-symbol double-score'>2x</span> - Double Score
        </li>
      </ul>
    </div>
  );
};

export default PowerUpLegend;
