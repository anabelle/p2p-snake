import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import PowerUpLegend from './PowerUpLegend';

describe('PowerUpLegend', () => {
  test('renders the heading', () => {
    render(<PowerUpLegend />);
    expect(screen.getByRole('heading', { name: /power-up legend/i })).toBeInTheDocument();
  });

  test('renders all power-up list items', () => {
    render(<PowerUpLegend />);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(4);

    // Check text content within each list item more specifically
    const speedItem = listItems[0];
    expect(within(speedItem).getByText('S')).toHaveClass('powerup-symbol speed');
    expect(within(speedItem).getByText(/Speed Boost/)).toBeInTheDocument(); // Check description

    const slowItem = listItems[1];
    expect(within(slowItem).getByText('W')).toHaveClass('powerup-symbol slow');
    expect(within(slowItem).getByText(/Slow Down/)).toBeInTheDocument();

    const invincibilityItem = listItems[2];
    expect(within(invincibilityItem).getByText('I')).toHaveClass('powerup-symbol invincibility');
    expect(within(invincibilityItem).getByText(/Invincibility/)).toBeInTheDocument();

    const doubleScoreItem = listItems[3];
    expect(within(doubleScoreItem).getByText('2x')).toHaveClass('powerup-symbol double-score');
    expect(within(doubleScoreItem).getByText(/Double Score/)).toBeInTheDocument();
  });

  test('renders power-up symbols with correct classes', () => {
    render(<PowerUpLegend />);
    expect(screen.getByText('S')).toHaveClass('powerup-symbol speed');
    expect(screen.getByText('W')).toHaveClass('powerup-symbol slow');
    expect(screen.getByText('I')).toHaveClass('powerup-symbol invincibility');
    expect(screen.getByText('2x')).toHaveClass('powerup-symbol double-score');
  });
});
