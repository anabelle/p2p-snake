const http = require('http');
const { Server } = require('socket.io');

// Create HTTP server
const server = http.createServer();

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store connected users
const users = {};

// Event handlers for Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Handle user joining
  socket.on('join', (data) => {
    const { id } = data;
    
    // Store the user ID
    users[socket.id] = id;
    
    console.log(`User ${id} joined the game`);
    
    // Send the current list of users to the new user
    const userList = Object.values(users).map(userId => ({ id: userId }));
    socket.emit('userList', userList);
    
    // Notify other users that a new user has joined
    socket.broadcast.emit('userJoined', { id });
  });
  
  // Handle WebRTC signaling
  socket.on('signal', (data) => {
    const { to, signal } = data;
    
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
    }
  });
  
  // Handle user disconnection
  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const userId = users[socket.id];
      
      console.log(`User ${userId} disconnected`);
      
      // Notify other users that a user has left
      socket.broadcast.emit('userLeft', { id: userId });
      
      // Remove the user from the users object
      delete users[socket.id];
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
}); 