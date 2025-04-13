export {};
describe('Logger', () => {
  let consoleLogSpy: any;
  let originalNodeEnv: string | undefined;
  let originalReactAppDebug: string | undefined;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    originalNodeEnv = process.env.NODE_ENV;
    originalReactAppDebug = process.env.REACT_APP_DEBUG;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
    process.env.REACT_APP_DEBUG = originalReactAppDebug;

    jest.resetModules();
  });

  it('should not call console.log when debug is disabled (default test env)', () => {
    const currentLogger = require('./logger').default;
    // eslint-disable-next-line testing-library/no-debugging-utils
    currentLogger.debug('Test message');
    currentLogger.gameDebug('Game test message');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should call console.log when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';

    const currentLogger = require('./logger').default;
    // eslint-disable-next-line testing-library/no-debugging-utils
    currentLogger.debug('Test message dev');
    currentLogger.gameDebug('Game test message dev');
    expect(consoleLogSpy).toHaveBeenCalledWith('Test message dev');
    expect(consoleLogSpy).toHaveBeenCalledWith('Game test message dev');
    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
  });

  it('should call console.log when REACT_APP_DEBUG is true', () => {
    process.env.NODE_ENV = 'test';
    process.env.REACT_APP_DEBUG = 'true';

    const currentLogger = require('./logger').default;
    // eslint-disable-next-line testing-library/no-debugging-utils
    currentLogger.debug('Test message debug flag');
    currentLogger.gameDebug('Game test message debug flag');
    expect(consoleLogSpy).toHaveBeenCalledWith('Test message debug flag');
    expect(consoleLogSpy).toHaveBeenCalledWith('Game test message debug flag');
    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
  });

  it('should always call console.error for logger.error', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const currentLogger = require('./logger').default;
    currentLogger.error('Error message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error message');
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    consoleErrorSpy.mockRestore();
  });

  it('should always call console.warn for logger.warn', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const currentLogger = require('./logger').default;
    currentLogger.warn('Warn message');
    expect(consoleWarnSpy).toHaveBeenCalledWith('Warn message');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    consoleWarnSpy.mockRestore();
  });
});
