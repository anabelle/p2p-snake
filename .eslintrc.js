module.exports = {
  extends: ['react-app', 'react-app/jest', 'prettier'],
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }] // Allow console.warn and console.error but forbid console.log
  },
  overrides: [
    {
      // Disable no-console rule for server-side code
      files: ['server/**/*.ts', 'server/**/*.js'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};
