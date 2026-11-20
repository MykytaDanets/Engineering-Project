import api from './axios';

export const getShoppingList = () => api.get('/shopping').then((r) => r.data);
export const generateShoppingList = (week) => api.post('/shopping/generate', { week }).then((r) => r.data);
export const addShoppingItem = (item) => api.post('/shopping/items', item).then((r) => r.data);
export const updateShoppingItem = (id, changes) => api.patch(`/shopping/items/${id}`, changes).then((r) => r.data);
export const deleteShoppingItem = (id) => api.delete(`/shopping/items/${id}`).then((r) => r.data);
export const moveCheckedToPantry = (items) => api.post('/shopping/to-pantry', { items }).then((r) => r.data);
export const clearChecked = () => api.post('/shopping/clear-checked').then((r) => r.data);
