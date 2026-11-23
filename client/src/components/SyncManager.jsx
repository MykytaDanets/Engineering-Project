import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../context/AuthContext';
import { useOnline } from '../hooks/useOnline';
import { db } from '../offline/db';
import { syncShopping } from '../offline/shopping';

export default function SyncManager() {
  const { user } = useAuth();
  const online = useOnline();
  const userId = user?.id;
  const pending = useLiveQuery(() => (userId ? db.outbox.where('userId').equals(userId).count() : 0), [userId], 0);

  useEffect(() => {
    if (userId && online && pending > 0) syncShopping(userId).catch(() => {});
  }, [userId, online, pending]);

  return null;
}
