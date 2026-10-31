import api from './axios';

export const getPlanStatus = () => api.get('/billing/status').then((r) => r.data);
export const createCheckout = () => api.post('/billing/checkout').then((r) => r.data);
export const createPortal = (flow) => api.post('/billing/portal', { flow }).then((r) => r.data);
