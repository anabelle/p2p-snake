# Multiplayer Snake Game

[![Build and Deploy Frontend](https://github.com/anabelle/p2p-snake/actions/workflows/build-deploy.yml/badge.svg)](https://github.com/anabelle/p2p-snake/actions/workflows/build-deploy.yml)

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
- **Testing**: Jest with ts-jest for unit and integration tests

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
   git clone https://github.com/yourusername/snake.git
   cd snake
   ```

2. Install dependencies:
   ```bash
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

## Running Tests

To run the test suite:

```bash
npm test
```

For test coverage:

```bash
npm test -- --coverage
```

## How to Play

1. Open the game in your browser
2. You'll automatically be connected to the game server
3. Use the arrow keys or WASD to control your snake
4. Collect food (red circles) to grow your snake and earn points
5. Collect power-ups for temporary advantages
6. Avoid collisions with other players' snakes and the AI snake
7. Your score and stats persist if you return to the game

## Deployment

### Combined Deployment

The server and frontend are configured to be deployed together, with the server serving the static files.

1. Build the static files:

   ```bash
   npm run build
   ```

2. Deploy to a service that supports Node.js applications (e.g., Heroku, Render, Fly.io):
   ```bash
   # Example for Heroku
   git push heroku main
   ```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request
