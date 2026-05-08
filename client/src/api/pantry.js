import api from './axios';

export const getPantryItems = () => api.get('/pantry').then((r) => r.data);
export const addPantryItem = (item) => api.post('/pantry/items', item).then((r) => r.data);
export const updatePantryItem = (id, item) => api.put(`/pantry/items/${id}`, item).then((r) => r.data);
export const deletePantryItem = (id) => api.delete(`/pantry/items/${id}`).then((r) => r.data);
