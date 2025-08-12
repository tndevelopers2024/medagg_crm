// src/utils/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://ardpgimerchd.org';

let socket;

export const initializeSocket = () => {
  const token = localStorage.getItem('token');
  
  socket = io(SOCKET_URL, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket'],
    autoConnect: false
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  return socket;
};

export const connectSocket = () => {
  if (socket && !socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
};