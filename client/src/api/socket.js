import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  disconnectSocket();
  socket = io(import.meta.env.VITE_API_URL || undefined, { auth: { token } });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export const socketId = () => socket?.id;
