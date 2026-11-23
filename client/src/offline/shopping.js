import { db } from './db';
import { getShoppingList, syncShoppingOps, generateShoppingList } from '../api/shopping';
import { queryClient } from '../queryClient';

export const MANUAL_AISLE = 'Added by you';
const MAX_SYNC_OPS = 500;//max operetions on the server

export function objectId() {
  const time = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const random = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
  return time + random;
}

export function applyOp(list, op) {
  const items = list.items;
  switch (op.type) {
    case 'add':
      if (items.some((i) => i._id === op.item._id)) return list;
      return {
        ...list,
        items: [...items, { aisle: MANUAL_AISLE, category: 'Other', checked: false, manual: true, recipes: [], note: '', ...op.item }],
      };
    case 'check':
      return { ...list, items: items.map((i) => (i._id === op.id ? { ...i, checked: op.checked } : i)) };
    case 'remove':
      return { ...list, items: items.filter((i) => i._id !== op.id) };
    case 'clearChecked':
      return { ...list, items: items.filter((i) => !i.checked) };
    case 'toPantry': {
      const done = new Set(op.items.map((i) => i.id));
      return { ...list, items: items.filter((i) => !done.has(i._id)) };
    }
    default:
      return list;
  }
}

const pendingOps = (userId) => db.outbox.where('userId').equals(userId).sortBy('seq');

async function saveRebased(userId, serverList, sentOps = []) {
  await db.transaction('rw', db.outbox, db.lists, async () => {
    await db.outbox.bulkDelete(sentOps.map((o) => o.seq));
    const rest = await pendingOps(userId);
    const list = rest.reduce((acc, o) => applyOp(acc, o.op), serverList);
    await db.lists.put({ userId, list, syncedAt: Date.now() });
  });
}

export const saveServerList = (userId, list) => saveRebased(userId, list);

export async function queueOp(userId, op) {
  await db.transaction('rw', db.outbox, db.lists, async () => {
    const row = await db.lists.get(userId);
    if (!row) throw new Error('The shopping list is not loaded yet');
    await db.outbox.add({ userId, op });
    await db.lists.put({ ...row, list: applyOp(row.list, op) });
  });
}

async function runSync(userId) {
  let ops = await pendingOps(userId);
  if (!ops.length) return saveRebased(userId, await getShoppingList());
  while (ops.length) {
    const batch = ops.slice(0, MAX_SYNC_OPS);
    const list = await syncShoppingOps(batch.map((o) => o.op));
    await saveRebased(userId, list, batch);
    if (batch.some((o) => o.op.type === 'toPantry')) queryClient.invalidateQueries({ queryKey: ['pantry'] });
    ops = await pendingOps(userId);
  }
}

let status = { syncing: false, error: null };
const listeners = new Set();

function setStatus(next) {
  status = { ...status, ...next };
  listeners.forEach((l) => l());
}

export const getSyncStatus = () => status;

export function subscribeSyncStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let running = null;
let again = false;//sync requested while one was running

export function syncShopping(userId) {
  if (running) {
    again = true;
    return running;
  }
  setStatus({ syncing: true });
  running = (async () => {
    try {
      do {
        again = false;
        await runSync(userId);
      } while (again);
      setStatus({ syncing: false, error: null });
    } catch (err) {
      setStatus({ syncing: false, error: err });
      throw err;
    } finally {
      running = null;
    }
  })();
  return running;
}

export async function refreshFromPlan(userId, week) {
  await syncShopping(userId);
  await saveServerList(userId, await generateShoppingList(week));
}
