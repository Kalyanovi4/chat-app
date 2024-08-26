const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Profanease = require('profanease');
const {
  generateMessage,
  generateLocationMessage,
} = require('./utils/messages');
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.json());

// Define path for Express config
const publicDirPath = path.join(__dirname, '../public');

//Setup static directory to serve
app.use(express.static(publicDirPath));

io.on('connection', socket => {
  console.log('New websocket connection');

  socket.on('join', ({ username, room }, cb) => {
    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return cb(error);
    }

    socket.join(user.room);

    socket.emit('message', generateMessage('Admin', 'Welcome'));
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        generateMessage('Admin', `${user.username} has joined the channel.`)
      );

    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    cb();
  });

  socket.on('sendMessage', (message, cb) => {
    const currentUser = getUser(socket.id);

    const isProfane = new Profanease({ lang: 'all' });

    if (isProfane.check(message)) {
      return cb(`Don't use bad words, you *******!`);
    }

    io.to(currentUser.room).emit(
      'message',
      generateMessage(currentUser.username, message)
    );
    cb();
  });

  socket.on('sendLocation', (coords, cb) => {
    const currentUser = getUser(socket.id);
    io.to(currentUser.room).emit(
      'locationMessage',
      generateLocationMessage(
        currentUser.username,
        `https://google.com/maps?q=${coords.lat},${coords.long}`
      )
    );
    cb();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        generateMessage('Admin', `${user.username} has left.`)
      );
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

module.exports = { app, server };
