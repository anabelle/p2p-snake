import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FullscreenButton from './FullscreenButton';

describe('FullscreenButton', () => {
  const mockToggleFullscreen = jest.fn();

  it('should render nothing if fullscreen is not enabled', () => {
    render(
      <FullscreenButton
        isFullscreen={false}
        toggleFullscreen={mockToggleFullscreen}
        isFullscreenEnabled={false}
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render "Enter Fullscreen" button when not fullscreen', () => {
    render(
      <FullscreenButton
        isFullscreen={false}
        toggleFullscreen={mockToggleFullscreen}
        isFullscreenEnabled={true}
      />
    );

    const button = screen.getByRole('button', { name: 'Enter Fullscreen' });
    expect(button).toBeInTheDocument();
  });

  it('should render "Exit Fullscreen" button when fullscreen', () => {
    render(
      <FullscreenButton
        isFullscreen={true}
        toggleFullscreen={mockToggleFullscreen}
        isFullscreenEnabled={true}
      />
    );

    const button = screen.getByRole('button', { name: 'Exit Fullscreen' });
    expect(button).toBeInTheDocument();
  });

  it('should call toggleFullscreen when clicked', () => {
    render(
      <FullscreenButton
        isFullscreen={false}
        toggleFullscreen={mockToggleFullscreen}
        isFullscreenEnabled={true}
      />
    );

    const button = screen.getByRole('button', { name: 'Enter Fullscreen' });
    fireEvent.click(button);
    expect(mockToggleFullscreen).toHaveBeenCalledTimes(1);
  });
});
