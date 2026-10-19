const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

const activeVoiceUsers = {};

io.on('connection', (socket) => {
  console.log('[Voxus] User connected:', socket.id);

  socket.on('send-message', (data) => {
    io.emit('receive-message', data);
  });

  socket.on('join-voice', ({ channelId, username }) => {
    socket.join(channelId);
    if (!activeVoiceUsers[channelId]) activeVoiceUsers[channelId] = [];
    activeVoiceUsers[channelId].push({ id: socket.id, name: username });

    socket.to(channelId).emit('user-joined-voice', { socketId: socket.id, username });
    io.to(channelId).emit('update-voice-users', activeVoiceUsers[channelId]);
  });

  socket.on('leave-voice', ({ channelId }) => {
    socket.leave(channelId);
    if (activeVoiceUsers[channelId]) {
      activeVoiceUsers[channelId] = activeVoiceUsers[channelId].filter(u => u.id !== socket.id);
      io.to(channelId).emit('update-voice-users', activeVoiceUsers[channelId]);
    }
    socket.to(channelId).emit('user-left-voice', { socketId: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('[Voxus] User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Voxus Live Server is running on port ${PORT}!`);
});