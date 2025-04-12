import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FullscreenButton from './FullscreenButton'; // This import will fail initially

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
    // Optionally, check for the specific SVG content if needed, though label is often enough
    // expect(button.querySelector('svg path[d*="M3 8V5"]')).toBeInTheDocument(); // Enter fullscreen icon path
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
    // Optionally, check for the specific SVG content
    // expect(button.querySelector('svg path[d*="M8 3v3"]')).toBeInTheDocument(); // Exit fullscreen icon path
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
