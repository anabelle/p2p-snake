import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorMessage from './ErrorMessage';

describe('ErrorMessage', () => {
  it('renders the error message when a message is provided', () => {
    const mockDismiss = jest.fn();
    const errorMessage = 'Something went wrong!';
    render(<ErrorMessage message={errorMessage} onDismiss={mockDismiss} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss error/i })).toBeInTheDocument();
  });

  it('calls onDismiss when the close button is clicked', () => {
    const mockDismiss = jest.fn();
    const errorMessage = 'Another error';
    render(<ErrorMessage message={errorMessage} onDismiss={mockDismiss} />);

    const closeButton = screen.getByRole('button', { name: /dismiss error/i });
    fireEvent.click(closeButton);

    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render when the message is empty', () => {
    const mockDismiss = jest.fn();
    const { container } = render(<ErrorMessage message="" onDismiss={mockDismiss} />);

    expect(container.firstChild).toBeNull();
  });

  it('does not render when the message is null', () => {
    const mockDismiss = jest.fn();
    // Casting null to any to satisfy the component's expected string type for the test setup
    const { container } = render(<ErrorMessage message={null as any} onDismiss={mockDismiss} />); 
    
    expect(container.firstChild).toBeNull();
  });
}); 