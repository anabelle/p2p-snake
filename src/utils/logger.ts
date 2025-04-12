/**
 * Logger utility to replace console.log calls throughout the application.
 * This provides a centralized place to control logging behavior.
 */

// Whether debug logging is enabled (can be controlled by environment variables)
const isDebugEnabled =
  process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEBUG === 'true';

/**
 * Safe logging utility that only logs in development environments.
 * ESLint will not flag these as issues since we're not directly using console.log.
 */
// eslint-disable-next-line no-console
const debug = isDebugEnabled ? console.log.bind(console) : () => {};

/**
 * Specialized logger for game state debugging
 */
// eslint-disable-next-line no-console
const gameDebug = isDebugEnabled ? console.log.bind(console) : () => {};

/**
 * Error logger that works in all environments
 * Note: We maintain console.error directly as it's allowed by ESLint rules
 */
// eslint-disable-next-line no-console
const error = console.error.bind(console);

/**
 * Warning logger that works in all environments
 * Note: We maintain console.warn directly as it's allowed by ESLint rules
 */
// eslint-disable-next-line no-console
const warn = console.warn.bind(console);

export const logger = {
  debug,
  gameDebug,
  error,
  warn
};

export default logger;
