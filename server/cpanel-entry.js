#!/usr/bin/env node

/**
 * This file is the entry point for cPanel Node.js hosting.
 */

/* eslint-disable no-console */
// Log the environment
console.log('Starting server in environment:', process.env.NODE_ENV);
console.log('Server directory:', __dirname);

// Set default PORT if not provided
if (!process.env.PORT) {
  console.log('PORT environment variable not set, using default port 3001');
  process.env.PORT = '3001';
} else {
  console.log('Using PORT:', process.env.PORT);
}

// Import the compiled server
try {
  console.log('Loading server module...');
  require('./index.js');
  console.log('Server started successfully!');
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}
/* eslint-enable no-console */

// Note: Make sure to set the PORT environment variable in cPanel to match your hosting configuration
