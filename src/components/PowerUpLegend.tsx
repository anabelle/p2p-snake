import React from 'react';

const PowerUpLegend: React.FC = () => {
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
