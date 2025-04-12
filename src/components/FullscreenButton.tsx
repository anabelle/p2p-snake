import React from 'react';

interface FullscreenButtonProps {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  isFullscreenEnabled: boolean;
}

const FullscreenButton: React.FC<FullscreenButtonProps> = ({
  isFullscreen,
  toggleFullscreen,
  isFullscreenEnabled
}) => {
  if (!isFullscreenEnabled) {
    return null;
  }

  return (
    <button
      className='fullscreen-button'
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      aria-pressed={isFullscreen}
    >
      {isFullscreen ? (
        <svg
          aria-hidden='true'
          xmlns='http://www.w3.org/2000/svg'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3'></path>
        </svg>
      ) : (
        <svg
          aria-hidden='true'
          xmlns='http://www.w3.org/2000/svg'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M3 8V5a2 2 0 0 1 2-2h3m11 0h3a2 2 0 0 1 2 2v3m0 11v3a2 2 0 0 1-2 2h-3m-11 0H5a2 2 0 0 1-2-2v-3'></path>
        </svg>
      )}
    </button>
  );
};

export default FullscreenButton;
