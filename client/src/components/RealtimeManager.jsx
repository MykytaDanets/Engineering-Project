import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket } from '../api/socket';
import { syncShopping } from '../offline/shopping';

export default function RealtimeManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const socket = connectSocket(localStorage.getItem('token'));
    const pullShopping = () => syncShopping(userId).catch(() => {});

    socket.on('changed', ({ type }) => {
      if (type === 'shopping') pullShopping();
      else qc.invalidateQueries({ queryKey: [type] });
    });
    socket.on('household', () => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'recipes' });//recipe searches cost API points
      pullShopping();
    });
    socket.io.on('reconnect', () => {
      qc.invalidateQueries({ queryKey: ['pantry'] });
      qc.invalidateQueries({ queryKey: ['planner'] });
      pullShopping();
    });

    return disconnectSocket;
  }, [userId, qc]);

  return null;
}
