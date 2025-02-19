import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.get('/', (req, res) => {
  res.send('Hello World');
});

// Store active users
const users = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', ({ userId, deviceType }) => {
    console.log('User registered:', userId, 'Device:', deviceType);
    users.set(userId, { socketId: socket.id, deviceType });
  });

  socket.on('call-user', ({ targetUserId, offer }) => {
    console.log('Call request from', socket.id, 'to', targetUserId);
    const targetUser = users.get(targetUserId);
    if (targetUser) {
      console.log('Forwarding call to', targetUser.socketId);
      io.to(targetUser.socketId).emit('incoming-call', {
        from: Array.from(users.entries()).find(
          ([_, user]) => user.socketId === socket.id
        )?.[0],
        offer,
      });
    } else {
      console.log('Target user not found:', targetUserId);
    }
  });

  socket.on('call-accepted', ({ targetUserId, answer }) => {
  console.log('Call accepted by', socket.id, 'Answer:', answer);
    const targetUser = users.get(targetUserId);
    const fromUserId = Array.from(users.entries()).find(
      ([_, user]) => user.socketId === socket.id
    )?.[0];
    if (targetUser) {
      io.to(targetUser.socketId).emit('call-accepted', {
        answer,
        from: fromUserId,
      });
    }
  });

  socket.on('call-rejected', ({ targetUserId }) => {
    console.log('Call rejected by', socket.id);
    const targetUser = users.get(targetUserId);
    const fromUserId = Array.from(users.entries()).find(
      ([_, user]) => user.socketId === socket.id
    )?.[0];
    if (targetUser) {
      io.to(targetUser.socketId).emit('call-rejected', { from: fromUserId });
    }
  });

  socket.on('ice-candidate', ({ targetUserId, candidate }) => {
  console.log('ICE candidate from', socket.id, 'Candidate:', candidate);
    const targetUser = users.get(targetUserId);
    const fromUserId = Array.from(users.entries()).find(
      ([_, user]) => user.socketId === socket.id
    )?.[0];
    if (targetUser) {
      io.to(targetUser.socketId).emit('ice-candidate', {
        candidate,
        from: fromUserId,
      });
    }
  });

  socket.on('disconnect', () => {
    let disconnectedUserId = null;
    for (const [userId, user] of users.entries()) {
      if (user.socketId === socket.id) {
        console.log('User disconnected:', userId);
        disconnectedUserId = userId;
        users.delete(userId);
        break;
      }
    }

    if (disconnectedUserId) {
      // Notify all other users about the disconnection
      io.emit('user-disconnected', { userId: disconnectedUserId });
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
