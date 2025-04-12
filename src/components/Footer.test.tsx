import React from 'react';
import { render, screen, within } from '@testing-library/react';
import Footer from './Footer'; // Assuming Footer component is in the same directory

describe('Footer Component', () => {
  const currentYear = new Date().getFullYear();
  const githubRepoUrl = 'https://github.com/anabelle/p2p-snake'; // Use actual URL

  test('renders without crashing', () => {
    render(<Footer />);
  });

  test('displays the current year', () => {
    render(<Footer />);
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
  });

  test('displays the copyleft symbol with correct class', () => {
    // We test for the class responsible for the transform, as direct style
    // checking can be brittle in JSDOM.
    render(<Footer />);
    const symbol = screen.getByTestId('copyleft-symbol');
    expect(symbol).toBeInTheDocument();
    // Check for the class name imported from the CSS module
    // Note: The actual class name will be mangled by CSS Modules, e.g., "Footer_copyleft__XYZ12"
    // We need to assert the class name itself exists on the element.
    // A simple check if className contains 'copyleft' might suffice depending on module setup,
    // but asserting the attribute directly is safer if the exact name is unpredictable.
    expect(symbol).toHaveAttribute('class');
    expect(symbol.className).toContain('copyleft'); // Adjust if class name structure is different
  });

  test('displays the "Built with heart by heyanabelle" text parts', () => {
    render(<Footer />);
    const footerElement = screen.getByRole('contentinfo');
    expect(footerElement).toBeInTheDocument(); // Ensure footer exists

    // Use 'within' to scope queries to the footer element
    const { getByText } = within(footerElement);

    // Check for the main text parts within the footer
    expect(getByText(/Built with/i)).toBeInTheDocument();
    expect(getByText(/by/i)).toBeInTheDocument(); // Check for "by"
    expect(getByText('❤️‍🔥')).toBeInTheDocument(); // Check for heart on fire emoji
    // Link 'heyanabelle' is checked separately
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
    // TODO: Update test when the correct GitHub URL is provided
    const sourceLink = screen.getByRole('link', { name: /source code/i });
    expect(sourceLink).toBeInTheDocument();
    expect(sourceLink).toHaveAttribute('href', githubRepoUrl);
    expect(sourceLink).toHaveAttribute('target', '_blank');
    expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer');
    // Check for smaller font size via class or style if necessary
    expect(sourceLink).toHaveClass('sourceLink'); // Assuming a CSS class for styling
  });

  test('footer has appropriate ARIA role', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
