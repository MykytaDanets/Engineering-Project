import { db } from './db';
import { isUnreachable } from '../api/connection';

export async function cachedFetch(key, fetcher) {
  try {
    const data = await fetcher();
    db.meta.put({ key, value: data }).catch(() => {});
    return data;
  } catch (err) {
    const saved = isUnreachable(err) ? await db.meta.get(key) : null;
    if (saved) return saved.value;
    throw err;
  }
}
