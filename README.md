# Multiplayer Snake Game

<!-- Badges -->

[![Unit Tests](https://github.com/anabelle/p2p-snake/actions/workflows/unit-test.yml/badge.svg?branch=main)](https://github.com/anabelle/p2p-snake/actions/workflows/unit-test.yml)
[![E2E Tests](https://github.com/anabelle/p2p-snake/actions/workflows/e2e-test.yml/badge.svg?branch=main)](https://github.com/anabelle/p2p-snake/actions/workflows/e2e-test.yml)
[![Deploy](https://github.com/anabelle/p2p-snake/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/anabelle/p2p-snake/actions/workflows/deploy.yml)

A real-time multiplayer snake game with an always-active AI opponent.

**Play it live at: [snake.heyanabelle.com](https://snake.heyanabelle.com/)**

## Description

This project implements a classic Snake game with real-time multiplayer capabilities. The game uses a centralized server architecture to manage game state, with Socket.IO for real-time communication between clients and server.

## Features

- **Multiplayer**: Play with friends in real-time
- **AI Snake**: Always-present AI opponent that adapts its difficulty based on length
- **Player Management**: Handles players joining, leaving, and preserves stats (score, deaths) for returning players
- **Deterministic Game Logic**: Ensures all players experience the same game events
- **Power-Ups**: Collect power-ups for temporary effects:
  - SPEED: Move faster than other players
  - SLOW: Move at half speed
  - INVINCIBILITY: Pass through other snakes without dying
  - DOUBLE_SCORE: Double points for eating food
- **Collision Detection**: Handles snake-snake collisions with death tracking
- **Score Tracking**: Updates and syncs scores based on food consumption and multipliers
- **Responsive UI**: Built with React and TypeScript

## Technical Architecture

- **Frontend**: React with TypeScript, using Socket.IO for client-server communication
- **Backend**: Node.js server using Socket.IO for real-time state synchronization and game logic
- **Game Loop**: Server-managed tick system ensures consistent gameplay across all clients
- **Testing**: Jest (unit/integration), Cypress (E2E)
- **Linting/Formatting**: ESLint, Prettier
- **Git Hooks**: Husky, lint-staged
- **CI/CD**: GitHub Actions for automated testing and deployment

## Prerequisites

- Node.js (v18 or later recommended)
- npm (usually comes with Node.js)

```bash
# Check versions
node -v
npm -v
```

## Setup and Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/anabelle/p2p-snake.git
   cd p2p-snake
   ```

2. Install dependencies:
   ```bash
   # Using npm ci is recommended for CI environments or clean installs
   npm ci
   # Or, for typical development:
   npm install
   ```

## Running Locally

You can run both the React frontend and the backend server simultaneously:

```bash
npm run start:dev
```

This will:

1. Start the game server on port 3001
2. Start the React app on port 3000
3. Configure the React app to use localhost:3001 as the server

Alternatively, you can run them separately:

1. **Start the Game Server:**

   ```bash
   npm run start:server
   ```

2. **Start the React App:**
   ```bash
   npm start
   ```

### Linting and Formatting

To manually lint and format the codebase:

```bash
# Lint and attempt to fix issues
npm run lint

# Format the code
npm run format
```

## Running Tests

### Unit Tests

Run the Jest unit and integration tests:

```bash
# Run tests once
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage report
npm test -- --coverage
```

### End-to-End (E2E) Tests

Run the Cypress E2E tests. This requires the development server to be running (`npm run start:dev`).

```bash
# Open the Cypress Test Runner UI
npm run cypress:open

# Run Cypress tests headlessly in the terminal
npm run cypress:run
```

## How to Play

1. Open the game in your browser (typically `http://localhost:3000` when running locally)
2. You'll automatically be connected to the game server
3. Use the arrow keys or WASD to control your snake
4. Collect food (red circles) to grow your snake and earn points
5. Collect power-ups for temporary advantages
6. Avoid collisions with other players' snakes and the AI snake
7. Your score and stats persist if you return to the game

## Deployment

This project uses GitHub Actions for automated deployment.

- Pushing to the `main` branch triggers the CI workflow (`unit-test.yml`, then `e2e-test.yml`).
- If both unit and E2E tests pass on `main`, the `deploy.yml` workflow is triggered.
- The `deploy.yml` workflow builds the production version of the frontend and deploys the contents of the `build/` directory via FTP to the production server.

No manual deployment steps are typically required.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-new-feature`
3. Make your changes.
4. **Important:** This project uses pre-commit hooks (Husky + lint-staged) to automatically lint and format your code before committing. Ensure these hooks run successfully.
5. Commit your changes: `git commit -am 'Add some feature'`
6. Push to the branch: `git push origin feature/my-new-feature`
7. Submit a pull request against the `main` branch.
8. Your pull request will automatically trigger the CI workflow (`unit-test.yml`, `e2e-test.yml`) to run checks.
