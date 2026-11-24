import api from './axios';

export const getHousehold = () => api.get('/household').then((r) => r.data.household);
export const createHousehold = (name) => api.post('/household', { name }).then((r) => r.data.household);
export const joinHousehold = (code) => api.post('/household/join', { code }).then((r) => r.data.household);
export const leaveHousehold = () => api.post('/household/leave').then((r) => r.data.household);
export const removeMember = (userId) => api.delete(`/household/members/${userId}`).then((r) => r.data.household);
export const newInviteCode = () => api.post('/household/invite').then((r) => r.data.household);

export const getMe = () => api.get('/auth/me').then((r) => r.data.user);
export const updateMe = (changes) => api.patch('/auth/me', changes).then((r) => r.data.user);
