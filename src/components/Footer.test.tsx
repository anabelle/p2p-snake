import React from 'react';
import { render, screen, within } from '@testing-library/react';
import Footer from './Footer';

describe('Footer Component', () => {
  const currentYear = new Date().getFullYear();
  const githubRepoUrl = 'https://github.com/anabelle/p2p-snake';

  test('renders without crashing', () => {
    render(<Footer />);
  });

  test('displays the current year', () => {
    render(<Footer />);
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
  });

  test('displays the copyleft symbol with correct class', () => {
    render(<Footer />);
    const symbol = screen.getByTestId('copyleft-symbol');
    expect(symbol).toBeInTheDocument();

    expect(symbol).toHaveAttribute('class');
    expect(symbol.className).toContain('copyleft');
  });

  test('displays the "Built with heart by heyanabelle" text parts', () => {
    render(<Footer />);
    const footerElement = screen.getByRole('contentinfo');
    expect(footerElement).toBeInTheDocument();

    const { getByText } = within(footerElement);

    expect(getByText(/Built with/i)).toBeInTheDocument();
    expect(getByText(/by/i)).toBeInTheDocument();
    expect(getByText('❤️‍🔥')).toBeInTheDocument();
  });

  test('contains the correct link to x.com/heyanabelle, opening in a new tab', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: /heyanabelle/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://x.com/heyanabelle');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('contains the correct link to the source code, opening in a new tab', () => {
    render(<Footer />);

    const sourceLink = screen.getByRole('link', { name: /source code/i });
    expect(sourceLink).toBeInTheDocument();
    expect(sourceLink).toHaveAttribute('href', githubRepoUrl);
    expect(sourceLink).toHaveAttribute('target', '_blank');
    expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer');

    expect(sourceLink).toHaveClass('sourceLink');
  });

  test('footer has appropriate ARIA role', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
