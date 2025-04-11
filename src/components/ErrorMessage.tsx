import React from 'react';

interface ErrorMessageProps {
  message: string;
  onDismiss: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className='error-message' role='alert'>
      <p>{message}</p>
      <button onClick={onDismiss} aria-label='Dismiss error'>
        Close
      </button>
    </div>
  );
};

export default ErrorMessage;
