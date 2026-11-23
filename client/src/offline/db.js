import Dexie from 'dexie';

export const db = new Dexie('smart-grocery');
db.version(1).stores({
  lists: 'userId',
  outbox: '++seq, userId',//changes not sent yet
  meta: 'key',
});

navigator.storage?.persist?.().catch(() => {});

export async function clearOfflineData() {
  await Promise.all(db.tables.map((t) => t.clear()));
}
