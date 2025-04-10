# P2P Multiplayer Snake Game

A real-time multiplayer snake game using peer-to-peer architecture with WebRTC.

## Features

- **Peer-to-Peer Multiplayer**: Connect directly with other players without a central server (except for initial signaling)
- **Random Color Assignment**: Each player's snake has a distinct color
- **Shared Game Elements**: Food and power-ups appear at the same location for all players
- **Power-Ups**: Collect different power-ups that provide temporary abilities:
  - Speed Boost (Green)
  - Slow Down (Blue)
  - Invincibility (Yellow)
  - Double Score (Magenta)
- **Accessibility**: High contrast colors and keyboard controls

## Technical Architecture

- **Frontend**: React with TypeScript
- **Networking**: WebRTC for peer-to-peer connections
- **Signaling Server**: Simple Node.js server using Socket.IO for initial connections

## Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/p2p-snake-game.git
   cd p2p-snake-game
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Update the signaling server URL:
   - Open `src/services/p2pService.ts`
   - Update the `SIGNALING_SERVER_URL` constant to point to your deployed signaling server (or use localhost for testing)

4. Start the development server:
   ```
   npm start
   ```

5. In a separate terminal, start the signaling server:
   ```
   node signaling-server.js
   ```

## How to Play

1. Open the game in your browser at `http://localhost:3000`
2. Click the "Start" button to begin
3. Use the arrow keys to control your snake
4. Collect food (red circles) to grow your snake and earn points
5. Collect power-ups (colored stars) for special abilities
6. Avoid collisions with walls, your own snake, and other players' snakes

## Deployment

### Frontend

Deploy the React application to a static hosting service like Netlify or Vercel:

```
npm run build
```

Then deploy the contents of the `build` directory.

### Signaling Server

Deploy the signaling server to a Node.js hosting service like Heroku or DigitalOcean:

```
git push heroku main
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

MIT

## Acknowledgements

- [React](https://reactjs.org/)
- [WebRTC](https://webrtc.org/)
- [Socket.IO](https://socket.io/)
- [simple-peer](https://github.com/feross/simple-peer) 