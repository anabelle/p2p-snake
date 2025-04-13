module.exports = {
  extends: ['react-app', 'react-app/jest', 'prettier'],
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }]
  },
  overrides: [
    {
      files: ['server/**/*.ts'],
      rules: {
        'no-console': 'off' // Allow console.log in server files
      }
    },
    {
      files: ['cypress/e2e/**/*.cy.ts'],
      rules: {
        '@typescript-eslint/no-unused-expressions': 'off'
      }
    }
  ]
};
