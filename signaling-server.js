const http = require('http');
const { Server } = require('socket.io');

// Create HTTP server
const server = http.createServer();

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 10000,
  pingInterval: 3000
});

// Store connected users
const users = {};

// Log helper
const logWithTimestamp = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};

// Error handling for the HTTP server
server.on('error', (error) => {
  logWithTimestamp(`Server error: ${error.message}`);
});

// Event handlers for Socket.IO
io.on('connection', (socket) => {
  logWithTimestamp(`User connected: ${socket.id}`);
  
  // Handle user joining
  socket.on('join', (data) => {
    try {
      const { id } = data;
      
      // Store the user ID
      users[socket.id] = id;
      
      logWithTimestamp(`User ${id} joined the game`);
      
      // Send the current list of users to the new user
      const userList = Object.values(users).map(userId => ({ id: userId }));
      socket.emit('userList', userList);
      
      // Notify other users that a new user has joined
      socket.broadcast.emit('userJoined', { id });
    } catch (error) {
      logWithTimestamp(`Error in join handler: ${error.message}`);
      socket.emit('error', { message: 'Failed to join the game' });
    }
  });
  
  // Handle WebRTC signaling
  socket.on('signal', (data) => {
    try {
      const { to, signal } = data;
      
      if (!to || !signal) {
        logWithTimestamp('Invalid signal data received');
        return;
      }
      
      // Find the socket ID for the target user
      const targetSocketId = Object.keys(users).find(
        socketId => users[socketId] === to
      );
      
      if (targetSocketId) {
        // Forward the signal to the target user
        io.to(targetSocketId).emit('signal', {
          from: users[socket.id],
          signal
        });
      } else {
        logWithTimestamp(`Target user ${to} not found for signaling`);
        socket.emit('error', { message: 'Target user not found' });
      }
    } catch (error) {
      logWithTimestamp(`Error in signal handler: ${error.message}`);
      socket.emit('error', { message: 'Failed to process signal' });
    }
  });
  
  // Handle user disconnection
  socket.on('disconnect', () => {
    try {
      if (users[socket.id]) {
        const userId = users[socket.id];
        
        logWithTimestamp(`User ${userId} disconnected`);
        
        // Notify other users that a user has left
        socket.broadcast.emit('userLeft', { id: userId });
        
        // Remove the user from the users object
        delete users[socket.id];
      }
    } catch (error) {
      logWithTimestamp(`Error in disconnect handler: ${error.message}`);
    }
  });
  
  // Handle errors
  socket.on('error', (error) => {
    logWithTimestamp(`Socket error for ${socket.id}: ${error.message}`);
  });
});

// Periodic cleanup of stale connections (every 5 minutes)
setInterval(() => {
  const connectedSockets = io.sockets.sockets;
  logWithTimestamp(`Performing connection health check. Active connections: ${connectedSockets.size}`);
  
  // No need to manually clean up as Socket.IO handles disconnections
}, 5 * 60 * 1000);

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logWithTimestamp(`Signaling server running on port ${PORT}`);
}); 