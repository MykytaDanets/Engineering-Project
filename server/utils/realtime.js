const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('../models/User');

let io = null;

const userRoom = (userId) => `user:${userId}`;
const householdRoom = (householdId) => `household:${householdId}`;

function initRealtime(server) {
  io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' } });

  io.use((socket, next) => {
    try {
      socket.data.userId = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET).userId;
      next();
    } catch {
      next(new Error('Unauthorised'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId } = socket.data;
    socket.join(userRoom(userId));
    try {
      const user = await User.findById(userId).select('householdId');
      if (user?.householdId) socket.join(householdRoom(user.householdId));
    } catch (err) {
      console.error('Realtime join failed:', err.message);
    }
  });
}

function notifyChange(req, ...types) {
  if (!io) return;
  const room = req.household ? householdRoom(req.household._id) : userRoom(req.userId);
  const sender = req.get('x-socket-id');
  const target = sender ? io.to(room).except(sender) : io.to(room);
  types.forEach((type) => target.emit('changed', { type }));
}

function moveUserSockets(userId, fromHouseholdId, toHouseholdId) {
  if (!io) return;
  const sockets = io.in(userRoom(userId));
  if (fromHouseholdId) sockets.socketsLeave(householdRoom(fromHouseholdId));
  if (toHouseholdId) sockets.socketsJoin(householdRoom(toHouseholdId));
}

function notifyHousehold(householdId, userIds = []) {
  if (!io) return;
  const rooms = [householdId && householdRoom(householdId), ...userIds.map(userRoom)].filter(Boolean);
  io.to(rooms).emit('household');
}

module.exports = { initRealtime, notifyChange, moveUserSockets, notifyHousehold };
