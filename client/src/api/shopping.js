import api from './axios';

const SYNC_TIMEOUT = 60000;//Render wakes up in around 50 s

export const getShoppingList = () => api.get('/shopping', { timeout: SYNC_TIMEOUT }).then((r) => r.data);
export const generateShoppingList = (week) => api.post('/shopping/generate', { week }).then((r) => r.data);
export const syncShoppingOps = (ops) => api.post('/shopping/sync', { ops }, { timeout: SYNC_TIMEOUT }).then((r) => r.data);