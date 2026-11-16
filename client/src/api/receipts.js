import api from './axios';

export const scanReceipt = (photo) => {
  const form = new FormData();
  form.append('photo', photo, 'receipt.jpg');
  return api.post('/receipts/scan', form, { timeout: 120000 }).then((r) => r.data);
};

export const confirmReceipt = (data) => api.post('/receipts/confirm', data).then((r) => r.data);
