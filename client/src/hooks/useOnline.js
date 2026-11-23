import { useSyncExternalStore } from 'react';
import { isReachable, subscribeReachable } from '../api/connection';

function subscribeBrowser(callback) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function useOnline() {
  const browserOnline = useSyncExternalStore(subscribeBrowser, () => navigator.onLine);
  const reachable = useSyncExternalStore(subscribeReachable, isReachable);
  return browserOnline && reachable;
}
