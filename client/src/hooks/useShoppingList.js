import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../offline/db';
import { queueOp, syncShopping, getSyncStatus, subscribeSyncStatus } from '../offline/shopping';
import { useOnline } from './useOnline';

export function useShoppingList(userId) {
  const online = useOnline();
  const row = useLiveQuery(() => db.lists.get(userId).then((r) => r ?? null), [userId]);
  const pending = useLiveQuery(() => db.outbox.where('userId').equals(userId).count(), [userId], 0);
  const { syncing, error: syncError } = useSyncExternalStore(subscribeSyncStatus, getSyncStatus);

  const sync = useCallback(() => syncShopping(userId).catch(() => {}), [userId]);

  useEffect(() => {
    if (online) sync();
  }, [online, sync]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [sync]);

  const queue = useCallback((op) => queueOp(userId, op), [userId]);

  return {
    list: row?.list,
    loaded: row !== undefined,
    syncedAt: row?.syncedAt,
    pending,
    online,
    syncing,
    syncError,
    queue,
    sync,
  };
}
