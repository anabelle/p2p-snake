const isDebugEnabled =
  process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEBUG === 'true';

// eslint-disable-next-line no-console
const debug = isDebugEnabled ? console.log.bind(console) : () => {};

// eslint-disable-next-line no-console
const gameDebug = isDebugEnabled ? console.log.bind(console) : () => {};

const error = console.error.bind(console);

const warn = console.warn.bind(console);

export const logger = {
  debug,
  gameDebug,
  error,
  warn
};

export default logger;
