const webpack = require('webpack');

module.exports = function override(config, env) {
  // Provide fallbacks for Node.js core modules used by dependencies
  config.resolve.fallback = {
    ...config.resolve.fallback, // Keep existing fallbacks if any
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer')
    // Add other modules here if needed (e.g., "crypto", "path", "os", etc.)
  };

  // Provide global variables like 'process' and 'Buffer'
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser', // Provides the 'process' polyfill
      Buffer: ['buffer', 'Buffer'] // Provides the 'Buffer' polyfill
    })
  ]);

  // Ignore specific warnings if they are known/expected
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || [])
    // Example: Ignore source map warnings from specific node_modules
    // /Failed to parse source map/,
  ];

  return config;
};
