# P2P Multiplayer Snake Game using NetplayJS

A real-time multiplayer snake game using the `netplayjs` library for deterministic state synchronization over WebRTC.

## Description

This project implements a classic Snake game with real-time peer-to-peer multiplayer capabilities. Instead of relying on a central game server to manage state, it uses `netplayjs` to synchronize game logic across all connected players deterministically. A simple signaling server is used only for the initial discovery and connection establishment between peers via WebRTC.

## Features

*   **Peer-to-Peer Multiplayer**: Utilizes `netplayjs` for deterministic state sync and WebRTC for direct P2P communication.
*   **Player Management**: Handles players joining, leaving, and preserves stats (score, deaths) for disconnected players.
*   **Deterministic Game Logic**: Ensures all players experience the same game events at the same time.
*   **Random Color Assignment**: Each player's snake gets a distinct color from a predefined list upon joining.
*   **Shared Game Elements**: Food appears at the same location for all players.
*   **Power-Ups**: Collect power-ups for temporary effects (e.g., SPEED, SLOW - implementation details in `src/game/logic/powerUpLogic.ts`).
*   **Collision Detection**: Handles snake-snake and snake-food collisions.
*   **Score Tracking**: Updates and syncs scores based on food consumption and multipliers.
*   **Basic UI**: Built with React and TypeScript.

## Technical Architecture

*   **Frontend**: React with TypeScript, using `react-app-rewired` for configuration overrides.
*   **P2P Networking & State Sync**: `netplayjs` handles WebRTC connections and ensures deterministic game state replication.
*   **Signaling**: A basic Node.js server using `socket.io` (`server/index.ts`) facilitates the initial WebRTC handshake.
*   **Testing**: Jest with `ts-jest` for unit and integration tests.

## Prerequisites

*   Node.js (v18 or later recommended)
*   npm (usually comes with Node.js)

```bash
# Check versions
node -v
npm -v
```

## Setup and Installation

1.  Clone the repository:
    ```bash
    # Replace with your actual repo URL if different
    git clone <your-repo-url>
    cd <repo-directory>
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

## Running Locally

You need to run both the React frontend application and the signaling server.

1.  **Start the Signaling Server:**
    Open a terminal in the project root and run:
    ```bash
    npm run start:server
    ```
    This will typically start the server on `http://localhost:8080`.

2.  **Start the React App:**
    Open *another* terminal in the project root and run:
    ```bash
    npm start
    ```
    This will open the game in your browser, usually at `http://localhost:3000`.

3.  **Connect:** Open the application URL (`http://localhost:3000`) in multiple browser tabs or on different machines on the same network to test the multiplayer functionality. The frontend is likely configured to connect to the local signaling server (`ws://localhost:8080` or similar - check `src/config.ts` or relevant files).

## Running Tests

To run the test suite and see coverage:

```bash
npm test -- --coverage
```
*Note: The `--` is important to pass the `--coverage` flag to Jest.*

## How to Play

1.  Open the game in your browser after starting both the server and the app.
2.  Wait for connection / other players if applicable.
3.  Use the arrow keys to control your snake.
4.  Collect food (red circles) to grow your snake and earn points.
5.  Avoid collisions with other players' snakes (and potentially walls, depending on configuration).

## Deployment

### Frontend (React App)

1.  Build the static files:
    ```bash
    npm run build
    ```
2.  Deploy the contents of the `build` directory to any static web hosting service (e.g., Netlify, Vercel, GitHub Pages).

### Signaling Server

1.  The simple Node.js/TypeScript server in `server/index.ts` needs to be deployed to a service that can run Node.js applications (e.g., Heroku, Render, Fly.io, a VPS).
2.  Ensure the deployed frontend application is configured to connect to the *public URL* of your deployed signaling server. This usually involves updating a configuration variable (e.g., `SIGNALING_SERVER_URL`) in the frontend code before building.

## Contributing

1.  Fork the repository.
2.  Create a feature branch: `git checkout -b feature/my-new-feature`
3.  Commit your changes: `git commit -am 'Add some feature'`
4.  Push to the branch: `git push origin feature/my-new-feature`
5.  Submit a pull request.

## License

MIT (Verify if a `LICENSE` file exists and matches)

## Acknowledgements

*   [NetplayJS](https://github.com/Ramshackle-Jamstack/netplayjs)
*   [React](https://reactjs.org/)
*   [TypeScript](https://www.typescriptlang.org/)
*   [Socket.IO](https://socket.io/)
*   [Node.js](https://nodejs.org/) 